import { useState, useCallback, useRef, useEffect } from 'react';
import { getEventCategory, groupedEventCategories } from '../../data/pointsConfig';

const CATEGORIES = ['Service', 'Fellowship', 'Official', 'Other'];

const EMPTY_FORM = {
  title: '', description: '', date: '', location: '', category: 'Service',
  pointsCategory: '', pointsValue: 0,
  existingPhotos: [],
  newPhotoFiles: [],
};

/**
 * EventForm - Completely isolated component
 * Does NOT re-render when parent re-renders
 * Manages all state locally to prevent input focus loss
 */
function EventForm({
  initialFormData,
  formError,
  saving,
  isAdd,
  onSubmit,
  fileInputRef,
  setShowAdd,
  setEditItem,
  IS_DEMO,
}) {
  // Use refs to prevent re-renders from props changing
  const isAddRef = useRef(isAdd);
  const setShowAddRef = useRef(setShowAdd);
  const setEditItemRef = useRef(setEditItem);
  
  // Manage form state locally in this component - truly isolated
  const [form, setForm] = useState(initialFormData || EMPTY_FORM);
  const formRef = useRef(form);
  
  // Update refs when props change but don't cause re-render
  useEffect(() => {
    isAddRef.current = isAdd;
    setShowAddRef.current = setShowAdd;
    setEditItemRef.current = setEditItem;
  }, [isAdd, setShowAdd, setEditItem]);
  
  // Always keep formRef in sync with form state
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  
  const totalPhotoCount = (form.existingPhotos?.length ?? 0) + (form.newPhotoFiles?.length ?? 0);

  // Simple input change handler
  const handleFieldChange = useCallback((fieldName) => (event) => {
    const value = event.currentTarget.value;
    setForm(prevForm => ({
      ...prevForm,
      [fieldName]: value
    }));
  }, []);

  const handlePointsCategoryChange = useCallback((event) => {
    const id = event.currentTarget.value;
    const cat = getEventCategory(id);
    setForm(prevForm => ({
      ...prevForm,
      pointsCategory: id,
      pointsValue: cat?.points ?? 0
    }));
  }, []);

  const handleCancel = useCallback(() => {
    if (isAddRef.current) setShowAddRef.current(false);
    else setEditItemRef.current(null);
  }, []);

  const handleFileSelect = useCallback((e) => {
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
  }, [totalPhotoCount]);

  const removeExistingPhoto = useCallback(async (idx) => {
    setForm(f => ({ ...f, existingPhotos: f.existingPhotos.filter((_, i) => i !== idx) }));
  }, []);

  const removeNewPhoto = useCallback((idx) => {
    URL.revokeObjectURL(form.newPhotoFiles[idx]?.preview);
    setForm(f => ({ ...f, newPhotoFiles: f.newPhotoFiles.filter((_, i) => i !== idx) }));
  }, [form.newPhotoFiles]);

  const setPhotoType = useCallback((source, idx, type) => {
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
  }, []);

  const handleFormSubmit = useCallback((e) => {
    e.preventDefault();
    // Use formRef to always get the latest form data without recreating this callback
    onSubmit(e, formRef.current);
  }, [onSubmit]);

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
          value={form.title}
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
            value={form.date}
            onChange={handleFieldChange('date')}
            required
            className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                       text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
          />
        </div>
        <div>
          <label className="block text-xs text-portal-muted mb-1">Category</label>
          <select
            value={form.category}
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
          value={form.location}
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
          value={form.description}
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
        <button
          type="button"
          onClick={handleCancel}
          className="border border-gold text-portal-muted hover:text-portal-text
                     px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-portal-red hover:bg-portal-red-dark disabled:opacity-50 text-white
                     font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {isAdd ? 'Create Event' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

export default EventForm;
