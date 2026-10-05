import { useState, useEffect, useCallback } from 'react';
import { useAuth }        from '../context/AuthContext';
import { useToast }       from '../context/ToastContext';
import Modal              from '../components/Modal';
import ConfirmDialog      from '../components/ConfirmDialog';
import LoadingSpinner     from '../components/LoadingSpinner';
import { getProjects, saveProject, deleteProject } from '../services/projectService';
import { getMembers }     from '../services/memberService';
import { refreshLeaderboardSoon } from '../services/leaderboardService';
import { PROJECT_ROLES }  from '../data/pointsConfig';
import {
  formatDateShort, safeHttpsUrl, memberKey, isAllowedPhoto, PHOTO_ACCEPT,
} from '../utils/helpers';

const MAX_IMAGE_MB = 5;
// Form value meaning "keep the existing role holder" (e.g. someone no longer
// in the members list), so editing other fields doesn't drop them.
const KEEP = '__keep__';

const emptyForm = () => ({
  name: '', date: '', imageFile: null, imagePreview: '', removeImage: false,
  roles: Object.fromEntries(PROJECT_ROLES.map(r => [r.id, ''])),
});

const toDateInput = (ts) => {
  const d = ts?.toDate ? ts.toDate() : null;
  return d ? d.toLocaleDateString('en-CA') : '';
};

/**
 * Projects — visible to all members. Admins add/edit/delete projects and set
 * the Chairperson, Secretary and Treasurer; each role adds points to that
 * member's total (see PROJECT_ROLES).
 */
function ProjectsPage() {
  const { memberData, isAdmin } = useAuth();
  const { showToast }           = useToast();

  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [myKey,    setMyKey]    = useState(null);

  // Admin-only data for the role pickers
  const [members,  setMembers]  = useState([]);           // active, sorted
  const [keyToEmail, setKeyToEmail] = useState({});

  const [editing,  setEditing]  = useState(null);         // null | 'new' | project
  const [form,     setForm]     = useState(emptyForm);
  const [formErr,  setFormErr]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [delItem,  setDelItem]  = useState(null);

  const load = useCallback(async () => {
    try {
      const [list, key] = await Promise.all([getProjects(), memberKey(memberData?.email)]);
      setProjects(list);
      setMyKey(key);
      if (isAdmin) {
        const all    = await getMembers();
        const active = all.filter(m => m.isActive)
                          .sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
        const keys   = await Promise.all(active.map(m => memberKey(m.email)));
        setMembers(active);
        setKeyToEmail(Object.fromEntries(keys.map((k, i) => [k, active[i].email])));
      }
    } catch {
      showToast('Could not load projects.', 'error');
    } finally {
      setLoading(false);
    }
  }, [memberData?.email, isAdmin, showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Add / edit ──────────────────────────────────────────────────────────
  const openNew = () => {
    setForm(emptyForm());
    setFormErr('');
    setEditing('new');
  };

  const openEdit = (p) => {
    const roles = {};
    for (const r of PROJECT_ROLES) {
      const holder = p.roles?.[r.id];
      roles[r.id] = !holder ? '' : (keyToEmail[holder.key] ?? KEEP);
    }
    setForm({
      ...emptyForm(), name: p.name ?? '', date: toDateInput(p.date),
      imagePreview: safeHttpsUrl(p.imageUrl) ?? '', roles,
    });
    setFormErr('');
    setEditing(p);
  };

  const pickImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isAllowedPhoto(file)) { setFormErr('Please choose a JPG, PNG, WebP, GIF or HEIC image.'); return; }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { setFormErr(`The image must be under ${MAX_IMAGE_MB} MB.`); return; }
    setFormErr('');
    setForm(f => ({ ...f, imageFile: file, imagePreview: URL.createObjectURL(file), removeImage: false }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormErr('Please enter the project name.'); return; }
    const chosen = Object.values(form.roles).filter(v => v && v !== KEEP);
    if (new Set(chosen).size !== chosen.length) {
      setFormErr('One member can hold only one role on a project.');
      return;
    }

    setSaving(true);
    setFormErr('');
    try {
      const existing = editing === 'new' ? null : editing;
      const roles = {};
      for (const r of PROJECT_ROLES) {
        const v = form.roles[r.id];
        if (!v) roles[r.id] = null;
        else if (v === KEEP) roles[r.id] = existing?.roles?.[r.id] ?? null;
        else {
          const m = members.find(x => x.email === v);
          roles[r.id] = { key: await memberKey(v), name: m?.fullName ?? '' };
        }
      }
      await saveProject({
        id: existing?.id, name: form.name, date: form.date, roles,
        imageFile: form.imageFile, removeImage: form.removeImage, existing,
      });
      showToast(existing ? 'Project updated.' : `Project "${form.name.trim()}" added.`, 'success');
      refreshLeaderboardSoon();
      setEditing(null);
      load();
    } catch {
      setFormErr('Saving failed. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const p = delItem;
    setDelItem(null);
    try {
      await deleteProject(p);
      showToast(`"${p.name}" deleted.`, 'success');
      refreshLeaderboardSoon();
      load();
    } catch {
      showToast('Delete failed. Please try again.', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  const selectClass = `w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                       text-portal-text text-sm focus:outline-none focus:border-portal-gold/50`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-portal-text flex items-center gap-2">
            <i className="fa-solid fa-diagram-project text-portal-gold" />
            Projects
          </h1>
          <p className="text-portal-muted text-xs mt-0.5">
            Club projects and their officers — project roles earn Mora Connect points
          </p>
        </div>
        {isAdmin && (
          <button onClick={openNew}
            className="sm:ml-auto bg-portal-red hover:bg-portal-red-dark text-white font-semibold
                       px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
            <i className="fa-solid fa-plus" /> Add Project
          </button>
        )}
      </div>

      {/* Project cards */}
      {projects.length === 0 ? (
        <div className="card rounded-xl p-10 text-center">
          <i className="fa-solid fa-diagram-project text-4xl text-portal-muted/40 mb-3" />
          <p className="text-portal-muted text-sm">No projects yet.</p>
          {isAdmin && <p className="text-portal-muted/70 text-xs mt-1">Use “Add Project” to add the first one.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map(p => {
            const img = safeHttpsUrl(p.imageUrl);
            return (
              <div key={p.id} className="card rounded-xl p-4 flex gap-4">
                {/* 4:5 poster thumbnail — click to view full size */}
                <div className="relative w-28 sm:w-36 aspect-[4/5] flex-shrink-0 self-start rounded-lg overflow-hidden
                                bg-white/[0.03] border border-subtle">
                  {img ? (
                    <a href={img} target="_blank" rel="noopener noreferrer" title="View full poster">
                      <img src={img} alt={p.name}
                        className="absolute inset-0 w-full h-full object-cover hover:opacity-90 transition-opacity" />
                    </a>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <i className="fa-solid fa-image text-3xl text-portal-muted/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-portal-text font-semibold leading-snug break-words">{p.name}</h3>
                      {p.date && <p className="text-portal-muted text-xs mt-0.5">{formatDateShort(p.date)}</p>}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(p)} title="Edit project"
                          className="text-portal-muted hover:text-portal-gold transition-colors p-1.5">
                          <i className="fa-solid fa-pen-to-square" />
                        </button>
                        <button onClick={() => setDelItem(p)} title="Delete project"
                          className="text-portal-muted hover:text-red-400 transition-colors p-1.5">
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    {PROJECT_ROLES.map(r => {
                      const holder = p.roles?.[r.id];
                      const isMe   = holder?.key && holder.key === myKey;
                      return (
                        <div key={r.id} className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wide text-portal-muted">
                            {r.label}
                            {holder && (
                              <span className="ml-1.5 text-portal-gold font-semibold normal-case tracking-normal">
                                +{p.rolePoints?.[r.id] ?? r.points}
                              </span>
                            )}
                          </p>
                          <p className="flex items-start gap-1.5 text-sm min-w-0">
                            <span className={`break-words ${holder ? 'text-portal-text' : 'text-portal-muted/60 italic'}`}>
                              {holder?.name || '—'}
                            </span>
                            {isMe && (
                              <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide
                                               text-portal-bg bg-portal-gold rounded px-1.5 py-0.5">You</span>
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit modal (admins) */}
      <Modal isOpen={!!editing} onClose={() => !saving && setEditing(null)}
             title={editing === 'new' ? 'Add Project' : 'Edit Project'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {formErr && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-600/30 rounded-lg px-3 py-2">
              <i className="fa-solid fa-circle-exclamation mr-2" />{formErr}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-portal-muted mb-1">Project Name *</label>
              <input value={form.name} maxLength={150}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Blood Donation Campaign 2026" className={selectClass} />
            </div>
            <div>
              <label className="block text-xs text-portal-muted mb-1">Date</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={selectClass} />
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs text-portal-muted mb-1">Project Image</label>
            <div className="flex items-center gap-3">
              <div className="relative w-20 aspect-[4/5] rounded-lg overflow-hidden bg-white/[0.03] border border-subtle
                              flex items-center justify-center flex-shrink-0">
                {form.imagePreview
                  ? <img src={form.imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  : <i className="fa-solid fa-image text-xl text-portal-muted/30" />}
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer border border-portal-gold/50 text-portal-gold hover:bg-portal-gold/10
                                  px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                  <i className="fa-solid fa-upload mr-1" /> {form.imagePreview ? 'Change' : 'Choose image'}
                  <input type="file" accept={PHOTO_ACCEPT} className="hidden" onChange={pickImage} />
                </label>
                {form.imagePreview && (
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, imageFile: null, imagePreview: '', removeImage: true }))}
                    className="text-xs text-portal-muted hover:text-red-400 px-2">
                    Remove
                  </button>
                )}
              </div>
            </div>
            <p className="text-portal-muted/70 text-xs mt-1">Best as a 4:5 poster (e.g. 4×5 inch). JPG, PNG, WebP, GIF or HEIC — up to {MAX_IMAGE_MB} MB</p>
          </div>

          {/* Roles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border-t border-subtle">
            {PROJECT_ROLES.map(r => {
              const holder = editing && editing !== 'new' ? editing.roles?.[r.id] : null;
              return (
                <div key={r.id}>
                  <label className="block text-xs text-portal-muted mb-1">
                    {r.label} <span className="text-portal-gold">(+{r.points} pts)</span>
                  </label>
                  <select value={form.roles[r.id]}
                    onChange={e => setForm(f => ({ ...f, roles: { ...f.roles, [r.id]: e.target.value } }))}
                    className={selectClass}>
                    <option value="">— None —</option>
                    {members.map(m => <option key={m.email} value={m.email}>{m.fullName}</option>)}
                    {form.roles[r.id] === KEEP && holder && (
                      <option value={KEEP}>{holder.name} (no longer a member)</option>
                    )}
                  </select>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" disabled={saving} onClick={() => setEditing(null)}
              className="border border-gold text-portal-muted hover:text-portal-text px-4 py-2 rounded-lg
                         text-sm transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="bg-portal-red hover:bg-portal-red-dark disabled:opacity-50 text-white font-semibold
                         px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
              {saving
                ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                : <><i className="fa-solid fa-floppy-disk" />{editing === 'new' ? 'Add Project' : 'Save Changes'}</>}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!delItem}
        isDanger
        title="Delete Project"
        message={`Delete "${delItem?.name}"? Its officers will lose the points from this project.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDelItem(null)}
      />
    </div>
  );
}

export default ProjectsPage;
