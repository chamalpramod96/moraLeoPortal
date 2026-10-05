import { useState }         from 'react';
import { useToast }         from '../../context/ToastContext';
import Modal                from '../../components/Modal';
import FormError            from '../../components/FormError';
import { InlineSpinner }    from '../../components/LoadingSpinner';
import { createMember }     from '../../services/memberService';
import { refreshLeaderboardSoon } from '../../services/leaderboardService';
import { readImportFile, planImport } from '../../domain/memberImport';
import { ROLES }            from '../../data/roles';

const MAX_FILE_KB      = 1024;
const DEFAULT_POSITION = 'Member';
const DEFAULT_TERM     = '2026/27';

const STATUS_STYLE = {
  new:     'bg-green-900/40 text-green-400 border border-green-600/30',
  exists:  'bg-gray-800 text-gray-400 border border-gray-600/30',
  invalid: 'bg-red-900/40 text-red-400 border border-red-600/30',
};
const STATUS_LABEL = { new: 'New', exists: 'Skip', invalid: 'Problem' };

const inputClass = `w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                    text-portal-text text-sm focus:outline-none focus:border-portal-gold/50
                    disabled:opacity-50`;

/** A user-facing reason a member couldn't be created. */
function failureText(err) {
  switch (err?.code) {
    case 'member-exists':          return 'Already a member — skipped';
    case 'auth/email-already-in-use':
      return 'This email already has a login — delete it in Firebase Console → Authentication, then upload again';
    case 'auth/invalid-email':     return 'Invalid email';
    case 'auth/too-many-requests': return 'Firebase limit reached — wait an hour, then upload the file again';
    case 'auth/network-request-failed':
    case 'unavailable':            return 'No connection — upload the file again';
    default:                       return err?.message || 'Failed';
  }
}

/**
 * Members → Add CSV File (admins). Reads a CSV (Name, ID, Email; optional
 * Phone, Position), shows what will happen to every row, then adds the
 * chosen members one by one — each gets a login and the set-password email,
 * exactly like Add Member. Rows whose ID or email is already in the system
 * are skipped, so uploading the same file again is safe.
 */
function ImportMembersModal({ existingMembers, onClose }) {
  const { showToast } = useToast();
  const [fileName, setFileName] = useState('');
  const [plan,     setPlan]     = useState(null);        // rows with status
  const [selected, setSelected] = useState(new Set());   // lines to add
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [term,     setTerm]     = useState(DEFAULT_TERM);
  const [error,    setError]    = useState('');
  const [progress, setProgress] = useState(null);        // { done, total } while adding
  const [results,  setResults]  = useState({});          // line → { ok, warn, text }
  const [imported, setImported] = useState(false);       // anything added (parent refreshes)

  const busy     = progress !== null;
  const finished = !busy && Object.keys(results).length > 0;
  const locked   = busy || finished;
  const newRows  = plan?.filter(r => r.status === 'new') ?? [];
  const toImport = newRows.filter(r => selected.has(r.line));

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setResults({});
    if (!/\.csv$/i.test(file.name)) { setError('Please choose a .csv file (in Excel: File → Save As → CSV).'); return; }
    if (file.size > MAX_FILE_KB * 1024) { setError(`The file is larger than ${MAX_FILE_KB} KB.`); return; }

    const { rows, error: readError } = readImportFile(await file.text());
    if (readError) { setError(readError); setPlan(null); return; }
    const p = planImport(rows, existingMembers);
    setFileName(file.name);
    setPlan(p);
    setSelected(new Set(p.filter(r => r.status === 'new').map(r => r.line)));
  };

  const toggle = (line) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(line)) next.delete(line); else next.add(line);
    return next;
  });

  const toggleAll = () => setSelected(
    toImport.length === newRows.length ? new Set() : new Set(newRows.map(r => r.line)),
  );

  // One at a time: each creates a login, a member record and an invite email
  const handleImport = async () => {
    const rows = toImport;
    const out  = {};
    let added  = 0, stopped = false;
    setProgress({ done: 0, total: rows.length });

    for (const [i, r] of rows.entries()) {
      if (stopped) {
        out[r.line] = { ok: false, text: 'Not tried — upload the file again later' };
        continue;
      }
      try {
        const { inviteSent } = await createMember({
          fullName: r.fullName,
          memberId: r.memberId,
          email:    r.email,
          phone:    r.phone,
          position: r.position || position.trim(),
          term:     term.trim(),
          role:     ROLES.MEMBER,
        });
        added++;
        out[r.line] = inviteSent
          ? { ok: true, text: 'Added — invite sent' }
          : { ok: true, warn: true, text: 'Added — invite email failed (use Resend invite)' };
      } catch (err) {
        out[r.line] = { ok: false, text: failureText(err) };
        // Firebase is refusing new accounts for now; the rest would fail too
        if (err?.code === 'auth/too-many-requests') stopped = true;
      }
      setResults({ ...out });
      setProgress({ done: i + 1, total: rows.length });
    }

    setProgress(null);
    if (added > 0) {
      setImported(true);
      refreshLeaderboardSoon();
    }
    const failed = rows.length - added;
    showToast(
      failed ? `Added ${added} of ${rows.length} members. See the list for the ${failed} that failed.`
             : `Added ${added} members. Each was sent a set-password email.`,
      failed ? 'error' : 'success',
    );
  };

  const close = () => !busy && onClose(imported);

  const counts = plan && {
    new:     newRows.length,
    exists:  plan.filter(r => r.status === 'exists').length,
    invalid: plan.filter(r => r.status === 'invalid').length,
  };

  return (
    <Modal isOpen onClose={close} title="Add Members from CSV" size="xl">
      <div className="space-y-4">
        <FormError message={error} />

        {/* File + values given to every member */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs text-portal-muted mb-1">CSV file *</label>
            <label className={`flex items-center gap-3 w-full bg-portal-bg border border-dashed border-white/15
                              rounded-lg px-3 py-2 transition-colors
                              ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:border-portal-gold/50 cursor-pointer'}`}>
              <i className="fa-solid fa-file-csv text-portal-gold text-lg" />
              <span className="text-sm text-portal-text truncate">{fileName || 'Choose a .csv file…'}</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={pickFile} disabled={locked} />
            </label>
          </div>
          <div>
            <label className="block text-xs text-portal-muted mb-1">Position</label>
            <input value={position} onChange={e => setPosition(e.target.value)} disabled={locked} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-portal-muted mb-1">Term</label>
            <input value={term} onChange={e => setTerm(e.target.value)} disabled={locked} className={inputClass} />
          </div>
        </div>
        <p className="text-portal-muted/70 text-xs -mt-2">
          Columns: First Name (or Name), ID, Email. Names are saved as “Leo &lt;name&gt;”; every member
          gets the Position and Term above and the Member role. IDs already in the portal are skipped.
        </p>

        {plan && (
          <>
            {/* Summary */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`px-2.5 py-1 rounded-full ${STATUS_STYLE.new}`}>{counts.new} new</span>
              <span className={`px-2.5 py-1 rounded-full ${STATUS_STYLE.exists}`}>{counts.exists} already in the portal</span>
              {counts.invalid > 0 && (
                <span className={`px-2.5 py-1 rounded-full ${STATUS_STYLE.invalid}`}>{counts.invalid} with problems</span>
              )}
            </div>

            {/* Rows */}
            <div className="rounded-lg border border-subtle overflow-hidden">
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-portal-card">
                    <tr className="border-b border-subtle text-portal-muted text-xs uppercase tracking-wide">
                      <th className="px-3 py-2 w-8">
                        <input type="checkbox" title="Select all new members"
                          checked={newRows.length > 0 && toImport.length === newRows.length}
                          onChange={toggleAll} disabled={locked || newRows.length === 0} />
                      </th>
                      <th className="px-3 py-2 text-left">Line</th>
                      <th className="px-3 py-2 text-left">Name (as saved)</th>
                      <th className="px-3 py-2 text-left">Member ID</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {plan.map(r => {
                      const res = results[r.line];
                      return (
                        <tr key={r.line} className={r.status === 'new' ? '' : 'opacity-60'}>
                          <td className="px-3 py-2 text-center">
                            {r.status === 'new' && (
                              <input type="checkbox" checked={selected.has(r.line)}
                                onChange={() => toggle(r.line)} disabled={locked} />
                            )}
                          </td>
                          <td className="px-3 py-2 text-portal-muted text-xs">{r.line}</td>
                          <td className="px-3 py-2 text-portal-text whitespace-nowrap">{r.fullName || '—'}</td>
                          <td className="px-3 py-2 text-portal-muted font-mono text-xs">{r.memberId || '—'}</td>
                          <td className="px-3 py-2 text-portal-muted text-xs">{r.email || '—'}</td>
                          <td className="px-3 py-2 text-xs">
                            {res ? (
                              <span className={res.ok ? (res.warn ? 'text-yellow-400' : 'text-green-400') : 'text-red-400'}>
                                <i className={`fa-solid ${res.ok ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1`} />{res.text}
                              </span>
                            ) : (
                              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className={`px-2 py-0.5 rounded ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                                {r.reason && <span className="text-portal-muted">{r.reason}</span>}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {!finished && (
              <p className="text-xs text-portal-muted bg-portal-gold/5 border border-portal-gold/20 rounded-lg px-3 py-2">
                <i className="fa-solid fa-envelope text-portal-gold mr-2" />
                Each member you add gets a login and an email to set their own password —
                ask them to check their spam folder.
              </p>
            )}

            {busy && (
              <div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-portal-gold transition-all"
                       style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
                </div>
                <p className="text-xs text-portal-muted mt-1 text-right">
                  Adding {progress.done} of {progress.total}… please keep this window open
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 pt-1">
          {finished ? (
            <button type="button" onClick={close}
              className="bg-portal-red hover:bg-portal-red-dark text-white font-semibold px-5 py-2
                         rounded-lg text-sm transition-colors">
              Done
            </button>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={close}
                className="border border-gold text-portal-muted hover:text-portal-text px-4 py-2 rounded-lg
                           text-sm transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button type="button" disabled={busy || toImport.length === 0} onClick={handleImport}
                className="bg-portal-red hover:bg-portal-red-dark disabled:opacity-50 disabled:cursor-not-allowed
                           text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors
                           flex items-center gap-2">
                {busy
                  ? <><InlineSpinner />Adding…</>
                  : <><i className="fa-solid fa-user-plus" />Add {toImport.length} member{toImport.length === 1 ? '' : 's'}</>}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default ImportMembersModal;
