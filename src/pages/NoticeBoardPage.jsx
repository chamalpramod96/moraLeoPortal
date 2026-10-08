import { useState, useEffect, useCallback } from 'react';
import { useAuth }        from '../context/AuthContext';
import { useToast }       from '../context/ToastContext';
import ConfirmDialog      from '../components/ConfirmDialog';
import LoadingSpinner     from '../components/LoadingSpinner';
import NoticeCard         from './notices/NoticeCard';
import NoticeFormModal    from './notices/NoticeFormModal';
import { getNotices, deleteNotice } from '../services/noticeService';
import { splitNotices }   from '../domain/notices';

/**
 * Notice Board — club notices and event invitations for every member.
 * Admins (secretary, president, superAdmin) post, edit and delete; the same
 * split is enforced in firestore/storage rules.
 */
function NoticeBoardPage() {
  const { isAdmin }   = useAuth();
  const { showToast } = useToast();

  const [notices,  setNotices]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(null);   // null | 'new' | notice
  const [delItem,  setDelItem]  = useState(null);
  const [showPast, setShowPast] = useState(false);

  const load = useCallback(async () => {
    try {
      setNotices(await getNotices());
    } catch {
      showToast('Could not load notices.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = () => {
    setEditing(null);
    load();
  };

  const handleDelete = async () => {
    const n = delItem;
    setDelItem(null);
    try {
      await deleteNotice(n);
      showToast(`"${n.title}" deleted.`, 'success');
      load();
    } catch {
      showToast('Delete failed. Please try again.', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  const { upcoming, past } = splitNotices(notices);
  const cardProps = { isAdmin, onEdit: setEditing, onDelete: setDelItem };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-portal-text flex items-center gap-2">
            <i className="fa-solid fa-bullhorn text-portal-gold" />
            Notice Board
          </h1>
          <p className="text-portal-muted text-xs mt-0.5">Club notices, events and invitations</p>
        </div>
        {isAdmin && (
          <button onClick={() => setEditing('new')}
            className="sm:ml-auto bg-portal-red hover:bg-portal-red-dark text-white font-semibold
                       px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
            <i className="fa-solid fa-plus" /> Post Notice
          </button>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length === 0 ? (
        <div className="card rounded-xl p-10 text-center">
          <i className="fa-solid fa-bullhorn text-4xl text-portal-muted/40 mb-3" />
          <p className="text-portal-muted text-sm">No upcoming notices right now.</p>
          {isAdmin && <p className="text-portal-muted/70 text-xs mt-1">Use “Post Notice” to add one.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.map(n => <NoticeCard key={n.id} notice={n} {...cardProps} />)}
        </div>
      )}

      {/* Earlier notices (folded) */}
      {past.length > 0 && (
        <div className="space-y-4">
          <button onClick={() => setShowPast(s => !s)}
            className="flex items-center gap-2 text-sm font-semibold text-portal-muted hover:text-portal-text">
            <i className={`fa-solid fa-chevron-right text-xs transition-transform ${showPast ? 'rotate-90' : ''}`} />
            Earlier notices ({past.length})
          </button>
          {showPast && past.map(n => <NoticeCard key={n.id} notice={n} past {...cardProps} />)}
        </div>
      )}

      {/* Post / edit (admins) — mounted fresh for each notice */}
      {editing && (
        <NoticeFormModal
          key={editing === 'new' ? 'new' : editing.id}
          notice={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        isOpen={!!delItem}
        isDanger
        title="Delete Notice"
        message={`Delete "${delItem?.title}"? Members will no longer see it.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDelItem(null)}
      />
    </div>
  );
}

export default NoticeBoardPage;
