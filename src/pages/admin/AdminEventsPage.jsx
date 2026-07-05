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
import EventFormIsolated        from './EventFormIsolated';

const EMPTY_FORM = {
  title: '', description: '', date: '', location: '', category: 'Service',
  pointsCategory: '', pointsValue: 0,
  existingPhotos: [],   // [{ url, type, caption }] — already saved
  newPhotoFiles:  [],   // [{ file, preview, type, caption }] — newly selected
};

const CAT_COLORS = {
  Service: 'border-blue-600/50 text-blue-300 bg-blue-950/20',
  Fellowship: 'border-green-600/50 text-green-300 bg-green-950/20',
  Official: 'border-portal-gold/50 text-portal-gold bg-portal-gold/10',
  Other: 'border-portal-muted/50 text-portal-muted',
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
  const [form,       setForm]      = useState(EMPTY_FORM);  // Only for edit form init
  const [formError,  setFormError] = useState('');
  const [saving,     setSaving]    = useState(false);

  const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, existingPhotos: [], newPhotoFiles: [] });
    setFormError('');
    setShowAdd(true);
  };

  const openEdit = (ev) => {
    let dateStr = '';
    if (ev.date) {
      const d = ev.date.toDate ? ev.date.toDate() : new Date(ev.date);
      // Use toLocaleDateString to match the display format, then convert to YYYY-MM-DD
      const localDate = d.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
      dateStr = localDate;
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
  const resolvePhotos = async (eventId, formData) => {
    // Clean existing photos to only have safe properties for Firestore
    const existing = (formData?.existingPhotos ?? []).map(p => ({
      url: p.url,
      type: p.type,
      caption: p.caption || ''
    }));
    // Upload new files and convert to photos with URLs
    const uploads  = await Promise.all(
      (formData?.newPhotoFiles ?? []).map(async (p) => {
        const url = await uploadEventPhoto(eventId, p.file);
        return { url, type: p.type, caption: p.caption || '' };
      })
    );
    return [...existing, ...uploads];
  };

  const handleAdd = async (formData) => {
    if (!formData.title || !formData.date) { setFormError('Title and Date are required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      // Exclude photo arrays before creating the event
      const { existingPhotos, newPhotoFiles, ...cleanFormData } = formData;
      // Create event first to get its ID, then upload photos
      const ref     = await addEvent({ ...cleanFormData, photos: [] }, memberData.email);
      const eventId = ref?.id ?? 'demo-new';
      const photos  = await resolvePhotos(eventId, formData);
      if (photos.length > 0 && ref?.id) await updateEvent(eventId, { photos });
      showToast(`Event "${formData.title}" created.`, 'success');
      setShowAdd(false);
      refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (formData) => {
    setSaving(true);
    setFormError('');
    try {
      // Find photos that were removed
      const originalPhotoUrls = new Set(form.existingPhotos?.map(p => p.url) ?? []);
      const newPhotoUrls = new Set(formData.existingPhotos?.map(p => p.url) ?? []);
      const removedPhotoUrls = [...originalPhotoUrls].filter(url => !newPhotoUrls.has(url));
      
      // Delete removed photos from storage
      if (!IS_DEMO) {
        for (const url of removedPhotoUrls) {
          await deleteEventPhoto(url);
        }
      }
      
      const photos = await resolvePhotos(editItem.id, formData);
      // Destructure to exclude photo-related fields from formData before sending to Firestore
      const { existingPhotos, newPhotoFiles, ...cleanFormData } = formData;
      await updateEvent(editItem.id, { ...cleanFormData, photos });
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
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="New Event">
        {showAdd && (
          <EventFormIsolated
            key="add-form"
            initialFormData={EMPTY_FORM}
            formError={formError}
            saving={saving}
            isAdd={true}
            onSubmit={handleAdd}
            onCancel={() => setShowAdd(false)}
            fileInputRef={fileInputRef}
            IS_DEMO={IS_DEMO}
          />
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Event">
        {!!editItem && (
          <EventFormIsolated
            key="edit-form"
            initialFormData={form}
            formError={formError}
            saving={saving}
            isAdd={false}
            onSubmit={handleEdit}
            onCancel={() => setEditItem(null)}
            fileInputRef={fileInputRef}
            IS_DEMO={IS_DEMO}
          />
        )}
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
