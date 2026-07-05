import { useState, useRef }    from 'react';
import { useNavigate }          from 'react-router-dom';
import { useAuth }              from '../../context/AuthContext';
import { useEvents }            from '../../hooks/useEvents';
import {
  addEvent, updateEvent, deleteEvent,
} from '../../services/eventService';
import { uploadEventPhoto, deleteEventPhoto } from '../../services/storageService';
import { useToast }             from '../../context/ToastContext';
import Modal                    from '../../components/Modal';
import ConfirmDialog            from '../../components/ConfirmDialog';
import { auth }                 from '../../services/firebase';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import LoadingSpinner           from '../../components/LoadingSpinner';
import { formatDateShort }      from '../../utils/helpers';
import { getEventCategory, groupedEventCategories } from '../../data/pointsConfig';

const CATEGORIES = ['Service', 'Fellowship', 'Official', 'Other'];

const EMPTY_FORM = {
  title: '', description: '', date: '', location: '', category: 'Service',
  pointsCategory: '', pointsValue: 0,
  existingPhotos: [],   // [{ url, type, caption }] — already saved
  newPhotoFiles:  [],   // [{ file, preview, type, caption }] — newly selected
};

const CAT_COLORS = {
  Service:    'bg-blue-900/40   text-blue-400   border-blue-600/30',
  Fellowship: 'bg-purple-900/40 text-purple-400 border-purple-600/30',
  Official:   'bg-portal-gold/20 text-portal-gold border-portal-gold/30',
  Other:      'bg-gray-800      text-gray-400   border-gray-600/30',
};

function AdminEventsPage() {
  const { memberData }           = useAuth();
  const { events, loading, refetch } = useEvents();
  const { showToast }            = useToast();
  const navigate                 = useNavigate();
  const fileInputRef             = useRef(null);

  const [showAdd,    setShowAdd]   = useState(false);
  const [editItem,   setEditItem]  = useState(null);
  const [delItem,    setDelItem]   = useState(null);
  const [delPassword, setDelPassword] = useState('');
  const [delPassError, setDelPassError] = useState('');
  const [delVerifying, setDelVerifying] = useState(false);
  const [form,       setForm]      = useState(EMPTY_FORM);
  const [formError,  setFormError] = useState('');
  const [saving,     setSaving]    = useState(false);

  const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
  const totalPhotoCount = (form.existingPhotos?.length ?? 0) + (form.newPhotoFiles?.length ?? 0);

  const fld = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handlePointsCategoryChange = (e) => {
    const id  = e.target.value;
    const cat = getEventCategory(id);
    setForm(f => ({ ...f, pointsCategory: id, pointsValue: cat?.points ?? 0 }));
  };

  // ── Photo helpers ──────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 3 - totalPhotoCount;
    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type:    'event',
      caption: '',
    }));
    setForm(f => ({ ...f, newPhotoFiles: [...(f.newPhotoFiles ?? []), ...toAdd] }));
    e.target.value = '';
  };

  const removeExistingPhoto = async (idx) => {
    const photo = form.existingPhotos[idx];
    if (!IS_DEMO) await deleteEventPhoto(photo.url);
    setForm(f => ({ ...f, existingPhotos: f.existingPhotos.filter((_, i) => i !== idx) }));
  };

  const removeNewPhoto = (idx) => {
    URL.revokeObjectURL(form.newPhotoFiles[idx]?.preview);
    setForm(f => ({ ...f, newPhotoFiles: f.newPhotoFiles.filter((_, i) => i !== idx) }));
  };

  const setPhotoType = (source, idx, type) => {
    if (source === 'existing') {
      setForm(f => {
        const arr = [...f.existingPhotos];
        arr[idx] = { ...arr[idx], type };
        return { ...f, existingPhotos: arr };
      });
    } else {
      setForm(f => {
        const arr = [...f.newPhotoFiles];
        arr[idx] = { ...arr[idx], type };
        return { ...f, newPhotoFiles: arr };
      });
    }
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, existingPhotos: [], newPhotoFiles: [] });
    setFormError('');
    setShowAdd(true);
  };

  const openEdit = (ev) => {
    let dateStr = '';
    if (ev.date) {
      const d = ev.date.toDate ? ev.date.toDate() : new Date(ev.date);
      dateStr = d.toISOString().split('T')[0];
    }
    setForm({
      ...EMPTY_FORM,
      ...ev,
      date:           dateStr,
      pointsCategory: ev.pointsCategory ?? '',
      pointsValue:    ev.pointsValue    ?? 0,
      existingPhotos: ev.photos         ?? [],
      newPhotoFiles:  [],
    });
    setFormError('');
    setEditItem(ev);
  };

  // ── Build final photos array and upload new files ──────────────────────────
  const resolvePhotos = async (eventId) => {
    const existing = form.existingPhotos ?? [];
    const uploads  = await Promise.all(
      (form.newPhotoFiles ?? []).map(async (p) => {
        const url = await uploadEventPhoto(eventId, p.file);
        return { url, type: p.type, caption: p.caption };
      })
    );
    return [...existing, ...uploads];
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date) { setFormError('Title and Date are required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      // Create event first to get its ID, then upload photos
      const ref     = await addEvent({ ...form, photos: [] }, memberData.email);
      const eventId = ref?.id ?? 'demo-new';
      const photos  = await resolvePhotos(eventId);
      if (photos.length > 0 && ref?.id) await updateEvent(eventId, { photos });
      showToast(`Event "${form.title}" created.`, 'success');
      setShowAdd(false);
      refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const photos = await resolvePhotos(editItem.id);
      await updateEvent(editItem.id, { ...form, photos });
      showToast('Event updated.', 'success');
      setEditItem(null);
      refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (ev) => {
    setDelItem(ev);
    setDelPassword('');
    setDelPassError('');
  };

  const handleDeleteConfirm = async (e) => {
    e.preventDefault();
    if (!delPassword.trim()) {
      setDelPassError('Please enter your password.');
      return;
    }
    setDelVerifying(true);
    setDelPassError('');
    try {
      // Verify password before deleting
      if (IS_DEMO) {
        if (delPassword !== 'demo1234') throw new Error('wrong-password');
      } else {
        const credential = EmailAuthProvider.credential(memberData.email, delPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      await deleteEvent(delItem.id);
      showToast(`"${delItem.title}" deleted.`, 'success');
      refetch();
      setDelItem(null);
    } catch (err) {
      const isWrong = err.code === 'auth/wrong-password'
        || err.code === 'auth/invalid-credential'
        || err.message === 'wrong-password';
      setDelPassError(isWrong ? 'Incorrect password. Try again.' : 'Delete failed. Please try again.');
    } finally {
      setDelVerifying(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const EventForm = ({ isAdd, onSubmit }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {formError && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-600/30 rounded-lg px-3 py-2">
          <i className="fa-solid fa-circle-exclamation mr-2" />{formError}
        </p>
      )}

      <div>
        <label className="block text-xs text-portal-muted mb-1">Event Title *</label>
        <input value={form.title} onChange={fld('title')} required
          className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                     text-portal-text text-sm focus:outline-none focus:border-portal-gold/50" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-portal-muted mb-1">Date *</label>
          <input type="date" value={form.date} onChange={fld('date')} required
            className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                       text-portal-text text-sm focus:outline-none focus:border-portal-gold/50" />
        </div>
        <div>
          <label className="block text-xs text-portal-muted mb-1">Category</label>
          <select value={form.category} onChange={fld('category')}
            className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                       text-portal-text text-sm focus:outline-none focus:border-portal-gold/50">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-portal-muted mb-1">Location</label>
        <input value={form.location} onChange={fld('location')}
          className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                     text-portal-text text-sm focus:outline-none focus:border-portal-gold/50" />
      </div>

      <div>
        <label className="block text-xs text-portal-muted mb-1">Description</label>
        <textarea value={form.description} onChange={fld('description')} rows={3}
          className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                     text-portal-text text-sm focus:outline-none focus:border-portal-gold/50 resize-none" />
      </div>

      {/* Mora Miglioria points category */}
      <div className="pt-1 border-t border-subtle">
        <label className="block text-xs text-portal-muted mb-1">
          <i className="fa-solid fa-trophy text-portal-gold mr-1" />
          Points Category (Mora Miglioria)
        </label>
        <select
          value={form.pointsCategory}
          onChange={handlePointsCategoryChange}
          className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                     text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
        >
          <option value="">— No points for this event —</option>
          {Object.entries(groupedEventCategories()).map(([group, cats]) => (
            <optgroup key={group} label={group}>
              {cats.map(c => (
                <option key={c.id} value={c.id}>{c.label} (+{c.points} pts)</option>
              ))}
            </optgroup>
          ))}
        </select>
        {form.pointsCategory && (
          <p className="text-xs text-portal-gold mt-1">
            <i className="fa-solid fa-star mr-1" />
            Attending members will each earn <strong>{form.pointsValue}</strong> points.
          </p>
        )}
      </div>

      {/* ── Photos ── */}
      <div className="pt-1 border-t border-subtle">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-portal-muted">
            <i className="fa-solid fa-images text-portal-gold mr-1" />
            Photos &amp; Sign Sheet
            <span className="ml-1 text-portal-muted/50">(max 3)</span>
          </label>
          {IS_DEMO && (
            <span className="text-[10px] text-yellow-500 italic">
              Demo: preview only, not saved
            </span>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Photo grid */}
        {(form.existingPhotos?.length > 0 || form.newPhotoFiles?.length > 0) && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {/* Existing saved photos */}
            {(form.existingPhotos ?? []).map((p, i) => (
              <div key={`ex-${i}`} className="relative group rounded-lg overflow-hidden border border-subtle">
                <img
                  src={p.url}
                  alt={p.type}
                  className="w-full h-24 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                                transition-opacity flex flex-col items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(i)}
                    className="bg-red-600 text-white text-xs px-2 py-1 rounded"
                  >
                    <i className="fa-solid fa-trash mr-1" />Remove
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                  <select
                    value={p.type}
                    onChange={e => setPhotoType('existing', i, e.target.value)}
                    className="w-full bg-transparent text-white text-[10px] border-0 outline-none cursor-pointer"
                  >
                    <option value="event">Event Photo</option>
                    <option value="signsheet">Sign Sheet</option>
                  </select>
                </div>
              </div>
            ))}

            {/* New (not yet saved) photos */}
            {(form.newPhotoFiles ?? []).map((p, i) => (
              <div key={`new-${i}`} className="relative group rounded-lg overflow-hidden border border-portal-gold/30">
                <img
                  src={p.preview}
                  alt="new"
                  className="w-full h-24 object-cover"
                />
                <div className="absolute top-1 right-1">
                  <span className="text-[9px] bg-portal-gold text-black px-1 py-0.5 rounded font-bold">NEW</span>
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                                transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeNewPhoto(i)}
                    className="bg-red-600 text-white text-xs px-2 py-1 rounded"
                  >
                    <i className="fa-solid fa-trash mr-1" />Remove
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                  <select
                    value={p.type}
                    onChange={e => setPhotoType('new', i, e.target.value)}
                    className="w-full bg-transparent text-white text-[10px] border-0 outline-none cursor-pointer"
                  >
                    <option value="event">Event Photo</option>
                    <option value="signsheet">Sign Sheet</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add photo button */}
        {totalPhotoCount < 3 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border border-dashed border-white/20 hover:border-portal-gold/50
                       rounded-lg py-3 text-portal-muted hover:text-portal-gold transition-colors
                       text-sm flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-camera-retro" />
            Add Photo ({3 - totalPhotoCount} slot{3 - totalPhotoCount !== 1 ? 's' : ''} left)
          </button>
        )}
        {totalPhotoCount >= 3 && (
          <p className="text-xs text-portal-muted text-center italic">Maximum 3 photos per event.</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button"
          onClick={() => isAdd ? setShowAdd(false) : setEditItem(null)}
          className="border border-gold text-portal-muted hover:text-portal-text
                     px-4 py-2 rounded-lg text-sm transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="bg-portal-red hover:bg-portal-red-dark disabled:opacity-50 text-white
                     font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
          {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {isAdd ? 'Create Event' : 'Save Changes'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-portal-text">Event Management</h1>
          <p className="text-portal-muted text-xs mt-0.5">{events.length} total events</p>
        </div>
        <button onClick={openAdd}
          className="sm:ml-auto bg-portal-red hover:bg-portal-red-dark text-white font-semibold
                     px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
          <i className="fa-solid fa-plus" /> New Event
        </button>
      </div>

      {/* Event list */}
      {events.length === 0 ? (
        <div className="text-center py-16 text-portal-muted card rounded-xl">
          <i className="fa-solid fa-calendar-xmark text-3xl mb-3 block opacity-40" />
          No events yet. Add the first one.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev.id}
              className="card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3
                         hover:bg-portal-hover transition-colors">
              {/* Event info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-portal-text font-semibold text-sm">{ev.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded border
                                    ${CAT_COLORS[ev.category] ?? CAT_COLORS.Other}`}>
                    {ev.category}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-portal-muted flex-wrap">
                  <span><i className="fa-solid fa-calendar mr-1" />{formatDateShort(ev.date)}</span>
                  {ev.location && <span><i className="fa-solid fa-location-dot mr-1" />{ev.location}</span>}
                </div>
                {ev.description && (
                  <p className="text-portal-muted text-xs mt-1.5 line-clamp-1">{ev.description}</p>
                )}
                {/* Photo thumbnails */}
                {ev.photos?.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {ev.photos.map((p, i) => (
                      <div key={i} className="relative">
                        <img
                          src={p.url}
                          alt={p.type}
                          className="w-10 h-10 rounded object-cover border border-subtle"
                        />
                        {p.type === 'signsheet' && (
                          <span className="absolute -top-1 -right-1 bg-portal-gold text-black
                                           text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                            S
                          </span>
                        )}
                      </div>
                    ))}
                    <span className="text-xs text-portal-muted ml-1">
                      {ev.photos.length} photo{ev.photos.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => navigate(`/admin/events/${ev.id}/attendance`)}
                  className="flex items-center gap-1.5 border border-portal-gold/35 text-portal-gold
                             hover:bg-portal-gold/10 px-3 py-1.5 rounded-lg text-xs transition-colors"
                >
                  <i className="fa-solid fa-clipboard-check" /> Attendance
                </button>
                <button onClick={() => openEdit(ev)} title="Edit"
                  className="text-portal-muted hover:text-portal-gold transition-colors p-2">
                  <i className="fa-solid fa-pen-to-square" />
                </button>
                <button onClick={() => openDeleteDialog(ev)} title="Delete"
                  className="text-portal-muted hover:text-red-400 transition-colors p-2">
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAdd}    onClose={() => setShowAdd(false)} title="New Event">
        <EventForm isAdd={true}  onSubmit={handleAdd} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Event">
        <EventForm isAdd={false} onSubmit={handleEdit} />
      </Modal>

      {/* Delete — password-protected modal */}
      <Modal
        isOpen={!!delItem}
        onClose={() => setDelItem(null)}
        title="Delete Event"
        size="sm"
      >
        <form onSubmit={handleDeleteConfirm} className="space-y-4">
          {/* Warning banner */}
          <div className="flex gap-3 bg-red-950/50 border border-red-700/40 rounded-lg px-4 py-3">
            <i className="fa-solid fa-triangle-exclamation text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-portal-text">
              Delete <span className="font-semibold text-portal-gold">&ldquo;{delItem?.title}&rdquo;</span>?
              {' '}This will also remove all attendance records for this event.
            </p>
          </div>

          {/* Password input */}
          <div>
            <label className="block text-xs text-portal-muted mb-1">
              Enter your password to confirm
            </label>
            <input
              type="password"
              autoFocus
              value={delPassword}
              onChange={e => { setDelPassword(e.target.value); setDelPassError(''); }}
              placeholder="Your account password"
              className="w-full bg-portal-bg border border-white/10 rounded-lg px-3 py-2
                         text-portal-text text-sm focus:outline-none focus:border-red-500/60
                         placeholder:text-portal-muted/50"
            />
            {delPassError && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <i className="fa-solid fa-circle-exclamation" />{delPassError}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setDelItem(null)}
              className="px-4 py-2 rounded-lg text-sm text-portal-muted hover:text-portal-text
                         border border-white/10 hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={delVerifying}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-700 hover:bg-red-600
                         text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                         flex items-center gap-2"
            >
              {delVerifying
                ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</>
                : <><i className="fa-solid fa-trash" />Delete Event</>
              }
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AdminEventsPage;
