import { useState } from 'react';
import { getManualCategory } from '../../data/pointsConfig';

const EMPTY_FORM = {
  memberId: '', fullName: '', email: '', phone: '',
  role: 'member', position: '', term: '', profilePhoto: '',
  password: '',
};

const TERMS = ['2024/25', '2025/26', '2026/27'];

/**
 * AddMemberForm — ISOLATED FORM COMPONENT
 * Manages its own form state to prevent parent re-renders from breaking input focus.
 * Parent only calls onSubmit(formData) and onCancel().
 */
function AddMemberForm({ 
  initialForm = EMPTY_FORM,
  roles = ['member', 'president', 'secretary'],
  isAdd = true,
  formError = '',
  saving = false,
  onSubmit,
  onCancel,
}) {
  // Form state is LOCAL to this component
  const [form, setForm] = useState(initialForm);

  // onChange handlers that directly update local state
  const handleFieldChange = (key) => (e) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-600/30 rounded-lg px-3 py-2 mb-4">
          <i className="fa-solid fa-circle-exclamation mr-2" />{formError}
        </p>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-portal-muted mb-1">Full Name *</label>
            <input 
              type="text"
              value={form.fullName} 
              onChange={handleFieldChange('fullName')}
              autoComplete="off"
              spellCheck="false"
              placeholder="Enter full name"
              className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                         text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
              required 
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-portal-muted mb-1">Member ID</label>
            <input 
              type="text"
              value={form.memberId} 
              onChange={handleFieldChange('memberId')}
              autoComplete="off"
              spellCheck="false"
              placeholder="LCM-2025-001"
              className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                         text-portal-text text-sm focus:outline-none focus:border-portal-gold/50" 
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-portal-muted mb-1">Email *</label>
            <input 
              type="email" 
              value={form.email} 
              onChange={handleFieldChange('email')}
              autoComplete="off"
              spellCheck="false"
              disabled={!isAdd}
              placeholder="member@example.com"
              className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                         text-portal-text text-sm focus:outline-none focus:border-portal-gold/50
                         disabled:opacity-50 disabled:cursor-not-allowed"
              required 
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-portal-muted mb-1">Phone</label>
            <input 
              type="tel"
              value={form.phone} 
              onChange={handleFieldChange('phone')}
              autoComplete="off"
              spellCheck="false"
              placeholder="+94 77 123 4567"
              className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                         text-portal-text text-sm focus:outline-none focus:border-portal-gold/50" 
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-portal-muted mb-1">Position</label>
            <input 
              type="text"
              value={form.position} 
              onChange={handleFieldChange('position')}
              autoComplete="off"
              spellCheck="false"
              placeholder="Vice President"
              className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                         text-portal-text text-sm focus:outline-none focus:border-portal-gold/50" 
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-portal-muted mb-1">Term</label>
            <input 
              type="text"
              value={form.term} 
              onChange={handleFieldChange('term')}
              autoComplete="off"
              list="term-list"
              placeholder="2025/26"
              className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                         text-portal-text text-sm focus:outline-none focus:border-portal-gold/50" 
            />
            <datalist id="term-list">
              {TERMS.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-xs text-portal-muted mb-1">Role</label>
            <select 
              value={form.role} 
              onChange={handleFieldChange('role')}
              className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                         text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
            >
              {roles.map(r => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-portal-muted mb-1">Profile Photo URL</label>
            <input 
              type="url"
              value={form.profilePhoto} 
              onChange={handleFieldChange('profilePhoto')}
              autoComplete="off"
              spellCheck="false"
              placeholder="https://example.com/photo.jpg"
              className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                         text-portal-text text-sm focus:outline-none focus:border-portal-gold/50" 
            />
          </div>

          {isAdd && (
            <div className="col-span-2">
              <label className="block text-xs text-portal-muted mb-1">Initial Password *</label>
              <input 
                type="password" 
                value={form.password} 
                onChange={handleFieldChange('password')}
                autoComplete="new-password"
                placeholder="Min. 6 characters"
                className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                           text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
                required 
                minLength={6} 
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button 
            type="button"
            onClick={onCancel}
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
            {isAdd ? 'Add Member' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default AddMemberForm;
