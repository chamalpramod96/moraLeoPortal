import { useState }       from 'react';
import { useToast }       from '../../context/ToastContext';
import Modal              from '../../components/Modal';
import FormError          from '../../components/FormError';
import { InlineSpinner }  from '../../components/LoadingSpinner';
import MemberPicker       from '../../components/MemberPicker';
import { saveProject }    from '../../services/projectService';
import { refreshLeaderboardSoon } from '../../services/leaderboardService';
import { PROJECT_ROLES }  from '../../data/pointsConfig';
import {
  safeHttpsUrl, memberKey, isAllowedPhoto, PHOTO_ACCEPT,
} from '../../utils/helpers';

const MAX_IMAGE_MB = 5;
// Form value meaning "keep the existing role holder" (e.g. someone no longer
// in the members list), so editing other fields doesn't drop them.
const KEEP = '__keep__';

const inputClass = `w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                    text-portal-text text-sm focus:outline-none focus:border-portal-gold/50`;

const emptyForm = () => ({
  name: '', imageFile: null, imagePreview: '', removeImage: false,
  roles: Object.fromEntries(PROJECT_ROLES.map(r => [r.id, ''])),
});

/** The form's starting values for a project (or a blank form for a new one). */
function formFor(project, keyToEmail) {
  if (!project) return emptyForm();
  const roles = {};
  for (const r of PROJECT_ROLES) {
    const holder = project.roles?.[r.id];
    roles[r.id] = !holder ? '' : (keyToEmail[holder.key] ?? KEEP);
  }
  return {
    ...emptyForm(), name: project.name ?? '',
    imagePreview: safeHttpsUrl(project.imageUrl) ?? '', roles,
  };
}

/**
 * Add / edit a project (admins). `project` is null for a new one.
 * `members` are the active members offered for the roles; `keyToEmail` maps
 * their memberKeys back to emails so current role holders are preselected.
 * Mount it fresh for each project (give it a `key`).
 */
function ProjectFormModal({ project, members, keyToEmail, onClose, onSaved }) {
  const { showToast } = useToast();
  const [form,    setForm]    = useState(() => formFor(project, keyToEmail));
  const [formErr, setFormErr] = useState('');
  const [saving,  setSaving]  = useState(false);

  const pickImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isAllowedPhoto(file)) { setFormErr('Please choose a JPG, PNG, WebP, GIF or HEIC image.'); return; }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { setFormErr(`The image must be under ${MAX_IMAGE_MB} MB.`); return; }
    setFormErr('');
    setForm(f => ({ ...f, imageFile: file, imagePreview: URL.createObjectURL(file), removeImage: false }));
  };

  // Role selections → what the project stores: { key, name } or null
  const resolveRoles = async () => {
    const roles = {};
    for (const r of PROJECT_ROLES) {
      const v = form.roles[r.id];
      if (!v) roles[r.id] = null;
      else if (v === KEEP) roles[r.id] = project?.roles?.[r.id] ?? null;
      else {
        const m = members.find(x => x.email === v);
        roles[r.id] = { key: await memberKey(v), name: m?.fullName ?? '' };
      }
    }
    return roles;
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
      await saveProject({
        id: project?.id, name: form.name, roles: await resolveRoles(),
        imageFile: form.imageFile, removeImage: form.removeImage, existing: project,
      });
      showToast(project ? 'Project updated.' : `Project "${form.name.trim()}" added.`, 'success');
      refreshLeaderboardSoon();
      onSaved();
    } catch {
      setFormErr('Saving failed. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={() => !saving && onClose()}
           title={project ? 'Edit Project' : 'Add Project'} size="lg">
      <form onSubmit={handleSave} className="space-y-4">
        <FormError message={formErr} />

        <div>
          <label className="block text-xs text-portal-muted mb-1">Project Name *</label>
          <input value={form.name} maxLength={150}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Blood Donation Campaign 2026" className={inputClass} />
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

        {/* Roles — type a name and pick from the suggestions */}
        <div className="space-y-3 pt-3 border-t border-subtle">
          {PROJECT_ROLES.map(r => {
            const holder = project?.roles?.[r.id];
            // Someone already holding another role on this project isn't suggested
            const takenElsewhere = new Set(
              PROJECT_ROLES.filter(o => o.id !== r.id).map(o => form.roles[o.id]).filter(Boolean),
            );
            return (
              <div key={r.id}>
                <label className="block text-xs text-portal-muted mb-1">
                  {r.label} <span className="text-portal-gold">(+{r.points} pts)</span>
                </label>
                <MemberPicker
                  members={members}
                  value={form.roles[r.id]}
                  excluded={takenElsewhere}
                  otherLabel={holder ? `${holder.name} (no longer a member)` : ''}
                  placeholder="Type a name… (leave empty for none)"
                  onChange={v => setForm(f => ({ ...f, roles: { ...f.roles, [r.id]: v } }))}
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" disabled={saving} onClick={onClose}
            className="border border-gold text-portal-muted hover:text-portal-text px-4 py-2 rounded-lg
                       text-sm transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="bg-portal-red hover:bg-portal-red-dark disabled:opacity-50 text-white font-semibold
                       px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
            {saving
              ? <><InlineSpinner />Saving…</>
              : <><i className="fa-solid fa-floppy-disk" />{project ? 'Save Changes' : 'Add Project'}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ProjectFormModal;
