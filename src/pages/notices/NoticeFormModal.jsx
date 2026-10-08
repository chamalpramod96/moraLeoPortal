import { useState }       from 'react';
import { useAuth }        from '../../context/AuthContext';
import { useToast }       from '../../context/ToastContext';
import Modal              from '../../components/Modal';
import FormError          from '../../components/FormError';
import { InlineSpinner }  from '../../components/LoadingSpinner';
import { saveNotice }     from '../../services/noticeService';
import {
  safeHttpsUrl, isAllowedPhoto, toDateInputValue, PHOTO_ACCEPT,
} from '../../utils/helpers';

const MAX_IMAGE_MB  = 5;
const MAX_DESC      = 3000;

const inputClass = `w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                    text-portal-text text-sm focus:outline-none focus:border-portal-gold/50`;

/** The form's starting values for a notice (or a blank form for a new one). */
const formFor = (notice) => ({
  title:        notice?.title ?? '',
  date:         toDateInputValue(notice?.date),
  time:         notice?.time ?? '',
  place:        notice?.place ?? '',
  description:  notice?.description ?? '',
  link:         notice?.link ?? '',
  imageFile:    null,
  imagePreview: safeHttpsUrl(notice?.imageUrl) ?? '',
  removeImage:  false,
});

/**
 * Post / edit a notice (admins). `notice` is null for a new one.
 * Mount it fresh for each notice (give it a `key`).
 */
function NoticeFormModal({ notice, onClose, onSaved }) {
  const { memberData } = useAuth();
  const { showToast }  = useToast();
  const [form,    setForm]    = useState(() => formFor(notice));
  const [formErr, setFormErr] = useState('');
  const [saving,  setSaving]  = useState(false);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

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
    if (!form.title.trim()) { setFormErr('Please enter the event / notice title.'); return; }
    if (!form.date)         { setFormErr('Please choose the date.'); return; }
    const link = form.link.trim();
    if (link && !/^https:\/\//i.test(link)) {
      setFormErr('The link must start with https:// (copy it from the browser address bar).');
      return;
    }

    setSaving(true);
    setFormErr('');
    try {
      await saveNotice({
        id: notice?.id, title: form.title, date: form.date, time: form.time, place: form.place,
        description: form.description, link, imageFile: form.imageFile, removeImage: form.removeImage,
        existing: notice, postedBy: memberData.email,
      });
      showToast(notice ? 'Notice updated.' : `Notice "${form.title.trim()}" posted.`, 'success');
      onSaved();
    } catch {
      setFormErr('Saving failed. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={() => !saving && onClose()}
           title={notice ? 'Edit Notice' : 'Post a Notice'} size="lg">
      <form onSubmit={handleSave} className="space-y-4">
        <FormError message={formErr} />

        <div>
          <label className="block text-xs text-portal-muted mb-1">Event / Title *</label>
          <input value={form.title} onChange={set('title')} maxLength={150}
            placeholder="e.g. Installation Ceremony 2026" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-portal-muted mb-1">Date *</label>
            <input type="date" value={form.date} onChange={set('date')} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-portal-muted mb-1">Time</label>
            <input type="time" value={form.time} onChange={set('time')} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-xs text-portal-muted mb-1">Place</label>
          <input value={form.place} onChange={set('place')} maxLength={200}
            placeholder="e.g. Lions Activity Centre, Moratuwa" className={inputClass} />
        </div>

        <div>
          <label className="block text-xs text-portal-muted mb-1">Description</label>
          <textarea value={form.description} onChange={set('description')} maxLength={MAX_DESC} rows={5}
            placeholder="What it's about, dress code, what to bring…" className={`${inputClass} resize-y`} />
          <p className="text-right text-[11px] text-portal-muted/60">{form.description.length}/{MAX_DESC}</p>
        </div>

        {/* Invitation card */}
        <div>
          <label className="block text-xs text-portal-muted mb-1">Invitation Card</label>
          <div className="flex items-center gap-3">
            <div className="relative w-20 aspect-[4/5] rounded-lg overflow-hidden bg-black/30 border border-subtle
                            flex items-center justify-center flex-shrink-0">
              {form.imagePreview
                ? <img src={form.imagePreview} alt="" className="absolute inset-0 w-full h-full object-contain" />
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
          <p className="text-portal-muted/70 text-xs mt-1">JPG, PNG, WebP, GIF or HEIC — up to {MAX_IMAGE_MB} MB. The whole card is shown.</p>
        </div>

        <div>
          <label className="block text-xs text-portal-muted mb-1">Link (optional)</label>
          <input value={form.link} onChange={set('link')} maxLength={500} inputMode="url"
            placeholder="https://… (registration form, Facebook event)" className={inputClass} />
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
              : <><i className="fa-solid fa-bullhorn" />{notice ? 'Save Changes' : 'Post Notice'}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default NoticeFormModal;
