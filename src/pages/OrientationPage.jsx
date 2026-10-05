import { useState, useEffect, useCallback } from 'react';
import { useAuth }           from '../context/AuthContext';
import { useToast }          from '../context/ToastContext';
import Modal                 from '../components/Modal';
import ConfirmDialog         from '../components/ConfirmDialog';
import LoadingSpinner, { InlineSpinner } from '../components/LoadingSpinner';
import FormError             from '../components/FormError';
import { formatDateShort, safeHttpsUrl } from '../utils/helpers';
import {
  getOrientationFiles, uploadOrientationFile, deleteOrientationFile,
  validateOrientationFile, fileExtension,
  ORIENTATION_TYPES, ORIENTATION_ACCEPT, MAX_ORIENTATION_MB,
} from '../services/orientationService';

const EMPTY_UPLOAD = { title: '', description: '', file: null };

function formatSize(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const typeInfo = (ext) => ORIENTATION_TYPES[ext] ?? { icon: 'fa-file', color: 'text-portal-muted' };

/**
 * Orientation Program — files for new members.
 * Everyone can view/download; admins (secretary, president, superAdmin) can
 * upload and delete. The same split is enforced in firestore/storage rules.
 */
function OrientationPage() {
  const { memberData, isAdmin } = useAuth();
  const { showToast }           = useToast();

  const [files,    setFiles]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  const [showUpload, setShowUpload] = useState(false);
  const [upload,     setUpload]     = useState(EMPTY_UPLOAD);
  const [uploadErr,  setUploadErr]  = useState('');
  const [progress,   setProgress]   = useState(null);   // null = not uploading
  const [delItem,    setDelItem]    = useState(null);

  const load = useCallback(async () => {
    try {
      setFiles(await getOrientationFiles());
    } catch {
      showToast('Could not load orientation files.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openUpload = () => {
    setUpload(EMPTY_UPLOAD);
    setUploadErr('');
    setProgress(null);
    setShowUpload(true);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!upload.title.trim()) { setUploadErr('Please enter a title.'); return; }
    const fileErr = validateOrientationFile(upload.file);
    if (fileErr) { setUploadErr(fileErr); return; }

    setUploadErr('');
    setProgress(0);
    try {
      await uploadOrientationFile(
        { ...upload, uploadedBy: memberData.email },
        setProgress,
      );
      showToast(`"${upload.title.trim()}" uploaded.`, 'success');
      setShowUpload(false);
      load();
    } catch {
      setUploadErr('Upload failed. Please check your connection and try again.');
    } finally {
      setProgress(null);
    }
  };

  const handleDelete = async () => {
    const item = delItem;
    setDelItem(null);
    try {
      await deleteOrientationFile(item);
      showToast(`"${item.title}" deleted.`, 'success');
      load();
    } catch {
      showToast('Delete failed. Please try again.', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  const uploading = progress !== null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-portal-text flex items-center gap-2">
            <i className="fa-solid fa-book-open text-portal-gold" />
            Orientation Program
          </h1>
          <p className="text-portal-muted text-xs mt-0.5">
            Guides and materials to help you get to know the Leo Club of Moratuwa
          </p>
        </div>
        {isAdmin && (
          <button onClick={openUpload}
            className="sm:ml-auto bg-portal-red hover:bg-portal-red-dark text-white font-semibold
                       px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
            <i className="fa-solid fa-upload" /> Upload File
          </button>
        )}
      </div>

      {/* Files */}
      {files.length === 0 ? (
        <div className="card rounded-xl p-10 text-center">
          <i className="fa-solid fa-folder-open text-4xl text-portal-muted/40 mb-3" />
          <p className="text-portal-muted text-sm">No orientation files yet.</p>
          {isAdmin && (
            <p className="text-portal-muted/70 text-xs mt-1">Use “Upload File” to add the first one.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {files.map(f => {
            const { icon, color } = typeInfo(f.fileType);
            const href = safeHttpsUrl(f.url);
            return (
              <div key={f.id} className="card rounded-xl p-4 flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-white/[0.04] border border-subtle
                                flex items-center justify-center flex-shrink-0">
                  <i className={`fa-solid ${icon} ${color} text-2xl`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-portal-text font-semibold leading-snug break-words">{f.title}</p>
                  {f.description && (
                    <p className="text-portal-muted text-sm mt-1 whitespace-pre-line break-words">{f.description}</p>
                  )}
                  <p className="text-portal-muted/70 text-xs mt-2 truncate" title={f.fileName}>
                    {f.fileName} · {formatSize(f.size)} · {formatDateShort(f.uploadedAt)}
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    {href && (
                      <a href={href} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
                                   border border-portal-gold/50 text-portal-gold hover:bg-portal-gold/10 transition-colors">
                        <i className="fa-solid fa-arrow-up-right-from-square" /> Open
                      </a>
                    )}
                    {isAdmin && (
                      <button onClick={() => setDelItem(f)} title="Delete file"
                        className="ml-auto text-portal-muted hover:text-red-400 transition-colors p-1.5">
                        <i className="fa-solid fa-trash" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload modal (admins) */}
      <Modal isOpen={showUpload} onClose={() => !uploading && setShowUpload(false)} title="Upload Orientation File">
        <form onSubmit={handleUpload} className="space-y-4">
          <FormError message={uploadErr} />

          <div>
            <label className="block text-xs text-portal-muted mb-1">Title *</label>
            <input
              value={upload.title}
              onChange={e => setUpload(u => ({ ...u, title: e.target.value }))}
              maxLength={150}
              placeholder="e.g. Club History & Structure"
              className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                         text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
            />
          </div>

          <div>
            <label className="block text-xs text-portal-muted mb-1">Description</label>
            <textarea
              value={upload.description}
              onChange={e => setUpload(u => ({ ...u, description: e.target.value }))}
              maxLength={500}
              rows={3}
              placeholder="What members will learn from this file (optional)"
              className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                         text-portal-text text-sm focus:outline-none focus:border-portal-gold/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-portal-muted mb-1">File *</label>
            <label className="flex items-center gap-3 w-full bg-portal-bg border border-dashed border-white/15
                              hover:border-portal-gold/50 rounded-lg px-3 py-3 cursor-pointer transition-colors">
              <i className={`fa-solid ${upload.file ? typeInfo(fileExtension(upload.file.name)).icon : 'fa-paperclip'}
                             text-portal-gold text-lg`} />
              <span className="text-sm text-portal-text truncate">
                {upload.file ? `${upload.file.name} (${formatSize(upload.file.size)})` : 'Choose a file…'}
              </span>
              <input
                type="file"
                accept={ORIENTATION_ACCEPT}
                className="hidden"
                onChange={e => { setUpload(u => ({ ...u, file: e.target.files?.[0] ?? null })); setUploadErr(''); }}
              />
            </label>
            <p className="text-portal-muted/70 text-xs mt-1">
              PDF, Word, PowerPoint, Excel, images or MP4 — up to {MAX_ORIENTATION_MB} MB
            </p>
          </div>

          {uploading && (
            <div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-portal-gold transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-portal-muted mt-1 text-right">{progress}%</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" disabled={uploading} onClick={() => setShowUpload(false)}
              className="border border-gold text-portal-muted hover:text-portal-text px-4 py-2 rounded-lg
                         text-sm transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={uploading}
              className="bg-portal-red hover:bg-portal-red-dark disabled:opacity-50 text-white font-semibold
                         px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
              {uploading
                ? <><InlineSpinner />Uploading…</>
                : <><i className="fa-solid fa-upload" />Upload</>
              }
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation (admins) */}
      <ConfirmDialog
        isOpen={!!delItem}
        isDanger
        title="Delete File"
        message={`Delete "${delItem?.title}"? Members will no longer be able to open it.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDelItem(null)}
      />
    </div>
  );
}

export default OrientationPage;
