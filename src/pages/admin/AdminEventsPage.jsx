import { useState }           from 'react';
import { useNavigate }        from 'react-router-dom';
import { useAuth }            from '../../context/AuthContext';
import { useToast }           from '../../context/ToastContext';
import { useEvents }          from '../../hooks/useEvents';
import {
  createEventFromForm, updateEventFromForm, deleteEvent,
} from '../../services/eventService';
import { refreshLeaderboardSoon } from '../../services/leaderboardService';
import Modal                  from '../../components/Modal';
import PasswordConfirmModal   from '../../components/PasswordConfirmModal';
import LoadingSpinner         from '../../components/LoadingSpinner';
import { formatDateShort }    from '../../utils/helpers';
import { eventTypeStyle }     from '../../data/eventTypes';
import EventForm, { EMPTY_EVENT_FORM, eventToForm } from './EventForm';

function AdminEventsPage() {
  const { memberData }               = useAuth();
  const { events, loading, refetch } = useEvents();
  const { showToast }                = useToast();
  const navigate                     = useNavigate();

  const [showAdd,   setShowAdd]   = useState(false);
  const [editItem,  setEditItem]  = useState(null);   // event being edited
  const [delItem,   setDelItem]   = useState(null);   // event to delete
  const [formError, setFormError] = useState('');
  const [saving,    setSaving]    = useState(false);

  const openAdd = () => {
    setFormError('');
    setShowAdd(true);
  };

  const openEdit = (ev) => {
    setFormError('');
    setEditItem(ev);
  };

  const handleAdd = async (formData) => {
    if (!formData.title || !formData.date) { setFormError('Title and Date are required.'); return; }
    setSaving(true);
    setFormError('');
    let result;
    try {
      result = await createEventFromForm(formData, memberData.email);
    } catch (err) {
      setFormError(err.message);
      setSaving(false);
      return;
    }
    // The event exists from here on. Close the form even if photos failed, so
    // a second "Add" click can't create a duplicate event.
    showToast(
      result.photosSaved
        ? `Event "${formData.title}" created.`
        : `Event "${formData.title}" created, but the photos failed to upload. Edit the event to add them.`,
      result.photosSaved ? 'success' : 'error',
    );
    setShowAdd(false);
    setSaving(false);
    refetch();
  };

  const handleEdit = async (formData) => {
    if (!formData.title || !formData.date) { setFormError('Title and Date are required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      await updateEventFromForm(editItem.id, formData, editItem.photos ?? []);
      showToast('Event updated.', 'success');
      refreshLeaderboardSoon();
      setEditItem(null);
      refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Throws on failure, so the dialog shows its error and stays open.
  const handleDelete = async () => {
    await deleteEvent(delItem.id);
    showToast(`"${delItem.title}" deleted.`, 'success');
    refreshLeaderboardSoon();
    refetch();
    setDelItem(null);
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
                                    ${eventTypeStyle(ev.category)}`}>
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
                <button onClick={() => setDelItem(ev)} title="Delete"
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
          <EventForm
            key="add-form"
            initialFormData={EMPTY_EVENT_FORM}
            formError={formError}
            saving={saving}
            isAdd={true}
            onSubmit={handleAdd}
            onCancel={() => setShowAdd(false)}
          />
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Event">
        {!!editItem && (
          <EventForm
            key="edit-form"
            initialFormData={eventToForm(editItem)}
            formError={formError}
            saving={saving}
            isAdd={false}
            onSubmit={handleEdit}
            onCancel={() => setEditItem(null)}
          />
        )}
      </Modal>

      {/* Delete — password-protected */}
      <PasswordConfirmModal
        isOpen={!!delItem}
        onClose={() => setDelItem(null)}
        onConfirm={handleDelete}
        title="Delete Event"
        confirmText="Delete Event"
        busyText="Verifying…"
        failureMessage="Delete failed. Please try again."
      >
        <p className="text-sm text-portal-text">
          Delete <span className="font-semibold text-portal-gold">&ldquo;{delItem?.title}&rdquo;</span>?
          {' '}This will also remove all attendance records for this event.
        </p>
      </PasswordConfirmModal>
    </div>
  );
}

export default AdminEventsPage;
