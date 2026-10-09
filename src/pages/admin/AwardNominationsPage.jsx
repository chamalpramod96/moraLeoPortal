import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth }        from '../../context/AuthContext';
import { useToast }       from '../../context/ToastContext';
import LoadingSpinner, { InlineSpinner } from '../../components/LoadingSpinner';
import { getAwardNominations, saveAwardNomination } from '../../services/awardService';
import { getProjects }    from '../../services/projectService';
import { AWARD_GROUPS, AWARD_CATEGORIES, NOMINATIONS_PER_CATEGORY } from '../../data/awardCategories';
import { emptyEntry, normalizeEntry, isSameEntry, countNominated, nominationsCsv } from '../../domain/awards';

const ORDINALS     = ['1st', '2nd', '3rd'];
const PROJECT_LIST = 'award-project-names';   // <datalist> of existing project names

const blankDrafts = () => Object.fromEntries(AWARD_CATEGORIES.map(c => [c.id, emptyEntry()]));

const inputClass = `w-full bg-portal-bg border border-white/5 rounded-lg px-2.5 py-1.5
                    text-portal-text text-sm placeholder-portal-muted/40
                    focus:outline-none focus:border-portal-gold/50`;

/** Saving / saved / failed marker for one row. */
function RowStatus({ status, onRetry }) {
  if (status === 'saving') return <span title="Saving…"><InlineSpinner size="w-3.5 h-3.5" gold /></span>;
  if (status === 'saved')  return <i className="fa-solid fa-circle-check text-green-400" title="Saved" />;
  if (status === 'error') {
    return (
      <button onClick={onRetry} title="Not saved — click to try again" className="text-red-400 hover:text-red-300">
        <i className="fa-solid fa-triangle-exclamation" />
      </button>
    );
  }
  return null;
}

/**
 * Project Awards (admins only) — the award categories are fixed; admins
 * enter up to 3 project nominations and a comment for each. Every row saves
 * by itself when you leave a box.
 */
function AwardNominationsPage() {
  const { memberData } = useAuth();
  const { showToast }  = useToast();

  const [saved,    setSaved]    = useState({});    // categoryId → entry (as stored)
  const [drafts,   setDrafts]   = useState(blankDrafts);   // categoryId → entry (as typed)
  const [status,   setStatus]   = useState({});    // categoryId → 'saving' | 'saved' | 'error'
  const [projects, setProjects] = useState([]);    // existing project names, for suggestions
  const [loading,  setLoading]  = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search,   setSearch]   = useState('');

  // Latest values for the async save queue
  const draftsRef = useRef({});
  const savedRef  = useRef({});
  const queue     = useRef({});
  draftsRef.current = drafts;
  savedRef.current  = saved;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const entries = await getAwardNominations();
      setSaved(entries);
      setDrafts(Object.fromEntries(AWARD_CATEGORIES.map(c => [c.id, entries[c.id] ?? emptyEntry()])));
      // Suggestions only — the page works without them
      getProjects()
        .then(list => setProjects([...new Set(list.map(p => p.name).filter(Boolean))].sort()))
        .catch(() => {});
    } catch {
      // Don't show an editable table that can't be saved
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirtyIds = useMemo(
    () => AWARD_CATEGORIES.filter(c => drafts[c.id] && !isSameEntry(drafts[c.id], saved[c.id] ?? emptyEntry())).map(c => c.id),
    [drafts, saved],
  );

  // Warn before closing the tab with a change that hasn't been saved yet
  useEffect(() => {
    if (dirtyIds.length === 0) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirtyIds.length]);

  const edit = (id, field, index, value) => setDrafts(prev => {
    const current = prev[id] ?? emptyEntry();
    const entry = { ...current, nominations: [...current.nominations] };
    if (field === 'comment') entry.comment = value; else entry.nominations[index] = value;
    return { ...prev, [id]: entry };
  });

  // Saves of one row run one after another, always with its latest values
  const saveRow = (id) => {
    queue.current[id] = (queue.current[id] ?? Promise.resolve()).then(async () => {
      const entry = normalizeEntry(draftsRef.current[id]);
      if (isSameEntry(entry, savedRef.current[id] ?? emptyEntry())) return;
      setStatus(s => ({ ...s, [id]: 'saving' }));
      try {
        await saveAwardNomination(id, entry, memberData.email);
        setSaved(s => ({ ...s, [id]: entry }));
        setStatus(s => ({ ...s, [id]: 'saved' }));
      } catch {
        setStatus(s => ({ ...s, [id]: 'error' }));
        showToast('A nomination could not be saved. Check your connection and try again.', 'error');
      }
    });
  };

  const downloadCsv = () => {
    const blob = new Blob([nominationsCsv(AWARD_GROUPS, drafts)], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'project-award-nominations.csv' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingSpinner />;

  if (loadError) {
    return (
      <div className="card rounded-xl p-10 text-center space-y-3">
        <i className="fa-solid fa-triangle-exclamation text-3xl text-portal-gold" />
        <p className="text-portal-text font-semibold">Could not load the award nominations</p>
        <p className="text-portal-muted text-sm">
          Check your internet connection. If this keeps happening, the page's access rules may not be
          published yet — ask the site admin.
        </p>
        <button onClick={load}
          className="mx-auto bg-portal-red hover:bg-portal-red-dark text-white font-semibold px-5 py-2
                     rounded-lg text-sm flex items-center gap-2 transition-colors">
          <i className="fa-solid fa-rotate-right" /> Try again
        </button>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const groups = AWARD_GROUPS
    .map(g => ({ ...g, categories: g.categories.filter(c => !q || c.label.toLowerCase().includes(q) || String(c.no) === q) }))
    .filter(g => g.categories.length > 0);
  const nominated = countNominated(AWARD_CATEGORIES, saved);

  // Shared props for every nomination / comment box
  const field = (c, kind, index) => ({
    value:    kind === 'comment' ? drafts[c.id].comment : drafts[c.id].nominations[index],
    onChange: e => edit(c.id, kind, index, e.target.value),
    onBlur:   () => saveRow(c.id),
    onKeyDown: e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } },
    title:    (kind === 'comment' ? drafts[c.id].comment : drafts[c.id].nominations[index]) || undefined,
    className: inputClass,
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-portal-text flex items-center gap-2">
            <i className="fa-solid fa-award text-portal-gold" />
            Project Awards
          </h1>
          <p className="text-portal-muted text-xs mt-0.5">
            Nominate up to {NOMINATIONS_PER_CATEGORY} projects for each award · admins only · saves automatically
          </p>
        </div>
        <button onClick={downloadCsv}
          className="sm:ml-auto border border-portal-gold/50 text-portal-gold hover:bg-portal-gold/10 font-semibold
                     px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
          <i className="fa-solid fa-file-csv" /> Download CSV
        </button>
      </div>

      {/* Summary + search */}
      <div className="card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm text-portal-text">
            <strong className="text-portal-gold">{nominated}</strong> of {AWARD_CATEGORIES.length} awards have nominations
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-portal-gold transition-all" style={{ width: `${(nominated / AWARD_CATEGORIES.length) * 100}%` }} />
          </div>
        </div>
        <div className="relative sm:w-72">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-portal-muted/60 text-sm pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find an award…"
            className="w-full bg-portal-bg border border-white/5 rounded-lg pl-9 pr-3 py-2 text-portal-text text-sm
                       placeholder-portal-muted/40 focus:outline-none focus:border-portal-gold/50" />
        </div>
      </div>

      <datalist id={PROJECT_LIST}>
        {projects.map(name => <option key={name} value={name} />)}
      </datalist>

      {groups.length === 0 && (
        <div className="card rounded-xl p-8 text-center text-portal-muted text-sm">No award matches “{search.trim()}”.</div>
      )}

      {/* Laptops: one table, a heading row per section */}
      {groups.length > 0 && (
        <div className="hidden xl:block card rounded-xl overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-12" />
              <col className="w-[22%]" />
              <col /><col /><col />
              <col className="w-[15%]" />
              <col className="w-9" />
            </colgroup>
            <thead>
              <tr className="border-b border-subtle text-portal-muted text-xs uppercase tracking-wide">
                <th className="px-3 py-3 text-left">No</th>
                <th className="px-3 py-3 text-left">Award Category</th>
                {ORDINALS.map(o => <th key={o} className="px-2 py-3 text-left">{o} Nomination</th>)}
                <th className="px-2 py-3 text-left">Comment</th>
                <th />
              </tr>
            </thead>
            {groups.map(g => (
              <tbody key={g.id}>
                <tr>
                  <td colSpan={7} className="px-3 py-2 bg-portal-gold/10 text-portal-gold text-xs font-semibold uppercase tracking-wider">
                    {g.title}
                  </td>
                </tr>
                {g.categories.map(c => (
                  <tr key={c.id} className="border-t border-subtle hover:bg-white/[0.02] align-top">
                    <td className="px-3 py-2.5 text-portal-muted font-mono text-xs">{c.no}</td>
                    <td className="px-3 py-2.5 text-portal-text text-sm leading-snug">{c.label}</td>
                    {ORDINALS.map((o, i) => (
                      <td key={o} className="px-1 py-2">
                        <input {...field(c, 'nomination', i)} list={PROJECT_LIST} maxLength={200} placeholder="Project name"
                               aria-label={`${o} nomination — ${c.label}`} />
                      </td>
                    ))}
                    <td className="px-1.5 py-2">
                      <input {...field(c, 'comment')} maxLength={1000} placeholder="Comment" aria-label={`Comment — ${c.label}`} />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <RowStatus status={status[c.id]} onRetry={() => saveRow(c.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      {/* Phones, tablets and small laptops: one card per award */}
      <div className="xl:hidden space-y-6">
        {groups.map(g => (
          <section key={g.id} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-portal-gold">{g.title}</h2>
            {g.categories.map(c => (
              <div key={c.id} className="card rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-portal-muted font-mono text-xs mt-0.5">{c.no}.</span>
                  <p className="flex-1 text-portal-text text-sm font-medium leading-snug">{c.label}</p>
                  <RowStatus status={status[c.id]} onRetry={() => saveRow(c.id)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ORDINALS.map((o, i) => (
                    <label key={o} className="block">
                      <span className="block text-[11px] text-portal-muted mb-1">{o} Nomination</span>
                      <input {...field(c, 'nomination', i)} list={PROJECT_LIST} maxLength={200} placeholder="Project name" />
                    </label>
                  ))}
                </div>
                <label className="block">
                  <span className="block text-[11px] text-portal-muted mb-1">Comment</span>
                  <input {...field(c, 'comment')} maxLength={1000} placeholder="Optional" />
                </label>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

export default AwardNominationsPage;
