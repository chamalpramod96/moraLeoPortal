import { useState } from 'react';
import { getEventCategory, groupedEventCategories } from '../../data/pointsConfig';
import { PHOTO_ACCEPT, isAllowedPhoto } from '../../utils/helpers';

const EMPTY_FORM = {
  title: '', description: '', date: '', location: '', category: 'Service',
  pointsCategory: '', pointsValue: 0, onlinePointsValue: 0,
  existingPhotos: [],
  newPhotoFiles: [],
};

const CATEGORIES = ['Service', 'Fellowship', 'Official', 'Other'];

/**
 * EventFormIsolated — ISOLATED FORM COMPONENT
 * Manages its own form state to prevent parent re-renders from breaking input focus.
 * Parent only calls onSubmit(formData) and onCancel().
 */
function EventFormIsolated({
  initialFormData = EMPTY_FORM,
  formError = '',
  saving = false,
  isAdd = true,
  onSubmit,
  onCancel = () => {},
  fileInputRef,
  IS_DEMO = false,
}) {
  // Form state is LOCAL to this component
  const [formState, setFormState] = useState(initialFormData);

  const totalPhotoCount = (formState.existingPhotos?.length ?? 0) + (formState.newPhotoFiles?.length ?? 0);

  // Factory function pattern - same as AddMemberForm (proven to work)
  const handleFieldChange = (key) => (e) => {
    setFormState(prev => ({ ...prev, [key]: e.target.value }));
  };

  // Special handlers for complex updates
  const handlePointsCategoryChange = (e) => {
    const id = e.target.value;
    const cat = getEventCategory(id);
    setFormState(prev => ({
      ...prev,
      pointsCategory: id,
      pointsValue: cat?.points ?? 0,
      onlinePointsValue: cat?.onlinePoints ?? 0,
    }));
  };

  const handleFileSelect = (e) => {
    // Skip formats Storage rules reject (e.g. SVG)
    const files = Array.from(e.target.files ?? []).filter(isAllowedPhoto);
    const remaining = 3 - totalPhotoCount;
    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: 'event',
      caption: '',
    }));
    setFormState(prev => ({
      ...prev,
      newPhotoFiles: [...(prev.newPhotoFiles ?? []), ...toAdd]
    }));
    e.target.value = '';
  };

  const removeExistingPhoto = (idx) => {
    setFormState(prev => ({
      ...prev,
      existingPhotos: prev.existingPhotos.filter((_, i) => i !== idx)
    }));
  };

  const removeNewPhoto = (idx) => {
    URL.revokeObjectURL(formState.newPhotoFiles[idx]?.preview);
    setFormState(prev => ({
      ...prev,
      newPhotoFiles: prev.newPhotoFiles.filter((_, i) => i !== idx)
    }));
  };

  const setPhotoType = (source, idx, type) => {
    if (source === 'existing') {
      setFormState(prev => {
        const arr = [...prev.existingPhotos];
        arr[idx] = { ...arr[idx], type };
        return { ...prev, existingPhotos: arr };
      });
    } else {
      setFormState(prev => {
        const arr = [...prev.newPhotoFiles];
        arr[idx] = { ...arr[idx], type };
        return { ...prev, newPhotoFiles: arr };
      });
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(formState);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
      {formError && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-600/30 rounded-lg px-3 py-2">
          <i className="fa-solid fa-circle-exclamation mr-2" />{formError}
        </p>
      )}

      <div>
        <label className="block text-xs text-portal-muted mb-1">Event Title *</label>
        <input
          type="text"
          value={formState.title}
          onChange={handleFieldChange('title')}
          required
          autoComplete="off"
          spellCheck="false"
          placeholder="Enter event title"
          className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                     text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-portal-muted mb-1">Date *</label>
          <input
            type="date"
            value={formState.date}
            onChange={handleFieldChange('date')}
            onFocus={(e) => {
              // Prevent auto-scroll when focusing on date input
              const scrollPos = window.scrollY;
              setTimeout(() => window.scrollTo(0, scrollPos), 0);
            }}
            required
            className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                       text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
          />
        </div>
        <div>
          <label className="block text-xs text-portal-muted mb-1">Category</label>
          <select
            value={formState.category}
            onChange={handleFieldChange('category')}
            className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                       text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-portal-muted mb-1">Location</label>
        <input
          type="text"
          value={formState.location}
          onChange={handleFieldChange('location')}
          autoComplete="off"
          spellCheck="false"
          placeholder="Enter location"
          className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                     text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
        />
      </div>

      <div>
        <label className="block text-xs text-portal-muted mb-1">Description</label>
        <textarea
          value={formState.description}
          onChange={handleFieldChange('description')}
          rows={3}
          autoComplete="off"
          spellCheck="false"
          placeholder="Enter event description"
          className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                     text-portal-text text-sm focus:outline-none focus:border-portal-gold/50 resize-none"
        />
      </div>

      {/* Mora Connect points category */}
      <div className="pt-1 border-t border-subtle">
        <label className="block text-xs text-portal-muted mb-1">
          <i className="fa-solid fa-trophy text-portal-gold mr-1" />
          Points Category (Mora Connect)
        </label>
        <select
          value={formState.pointsCategory}
          onChange={handlePointsCategoryChange}
          className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                     text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
        >
          <option value="">— No points for this event —</option>
          {Object.entries(groupedEventCategories(formState.pointsCategory)).map(([group, cats]) => (
            <optgroup key={group} label={group}>
              {cats.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label} {c.hybrid
                    ? `(+${c.points} physical / +${c.onlinePoints} online)`
                    : `(+${c.points} pts)`}
                  {c.retired ? ' — no longer used' : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {formState.pointsCategory && (
          <p className="text-xs text-portal-gold mt-1">
            <i className="fa-solid fa-star mr-1" />
            {getEventCategory(formState.pointsCategory)?.hybrid
              ? <>Members who attend <strong>in person</strong> earn <strong>{formState.pointsValue}</strong> points;
                  {' '}those who join <strong>online</strong> earn <strong>{formState.onlinePointsValue ?? 0}</strong>.</>
              : <>Attending members will each earn <strong>{formState.pointsValue}</strong> points.</>}
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

        <input
          ref={fileInputRef}
          type="file"
          accept={PHOTO_ACCEPT}
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {(formState.existingPhotos?.length > 0 || formState.newPhotoFiles?.length > 0) && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {(formState.existingPhotos ?? []).map((p, i) => (
              <div key={`ex-${i}`} className="relative group rounded-lg overflow-hidden border border-subtle">
                <img src={p.url} alt={p.type} className="w-full h-24 object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  <button type="button" onClick={() => removeExistingPhoto(i)} className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                    <i className="fa-solid fa-trash mr-1" />Remove
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                  <select value={p.type} onChange={e => setPhotoType('existing', i, e.target.value)} className="w-full bg-transparent text-white text-[10px] border-0 outline-none cursor-pointer">
                    <option value="event">Event Photo</option>
                    <option value="signsheet">Sign Sheet</option>
                  </select>
                </div>
              </div>
            ))}

            {(formState.newPhotoFiles ?? []).map((p, i) => (
              <div key={`new-${i}`} className="relative group rounded-lg overflow-hidden border border-portal-gold/30">
                <img src={p.preview} alt="new" className="w-full h-24 object-cover" />
                <div className="absolute top-1 right-1">
                  <span className="text-[9px] bg-portal-gold text-black px-1 py-0.5 rounded font-bold">NEW</span>
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button type="button" onClick={() => removeNewPhoto(i)} className="bg-red-600 text-white text-xs px-2 py-1 rounded">
                    <i className="fa-solid fa-trash mr-1" />Remove
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                  <select value={p.type} onChange={e => setPhotoType('new', i, e.target.value)} className="w-full bg-transparent text-white text-[10px] border-0 outline-none cursor-pointer">
                    <option value="event">Event Photo</option>
                    <option value="signsheet">Sign Sheet</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPhotoCount < 3 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border border-dashed border-white/20 hover:border-portal-gold/50 rounded-lg py-3 text-portal-muted hover:text-portal-gold transition-colors text-sm flex items-center justify-center gap-2"
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
        <button
          type="button"
          onClick={onCancel}
          className="border border-gold text-portal-muted hover:text-portal-text px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-portal-red hover:bg-portal-red-dark disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {isAdd ? 'Create Event' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

export default EventFormIsolated;
