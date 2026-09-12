import { useState, useMemo, useEffect }  from 'react';
import { useAuth }            from '../../context/AuthContext';
import { useMembers }         from '../../hooks/useMembers';
import {
  createMember, updateMember, toggleMemberStatus,
} from '../../services/memberService';
import {
  getMemberManualPoints, addManualPoints, deleteManualPoints,
} from '../../services/pointsService';
import { useToast }           from '../../context/ToastContext';
import Modal                  from '../../components/Modal';
import ConfirmDialog          from '../../components/ConfirmDialog';
import Badge                  from '../../components/Badge';
import LoadingSpinner         from '../../components/LoadingSpinner';
import { formatDateShort }    from '../../utils/helpers';
import { MANUAL_POINT_CATEGORIES, groupedManualCategories, getManualCategory } from '../../data/pointsConfig';
import AddMemberForm          from './AddMemberForm';

const EMPTY_FORM = {
  memberId: '', fullName: '', email: '', phone: '',
  role: 'member', position: '', term: '', profilePhoto: '',
  password: '',
};

const TERMS      = ['2024/25', '2025/26', '2026/27'];

function MembersPage() {
  const { memberData: me, isSuperAdmin } = useAuth();
  const { members: _members, loading, refetch } = useMembers();

  // superAdmin can assign the superAdmin role; others can assign up to president
  const ROLES = isSuperAdmin
    ? ['member', 'president', 'secretary', 'superAdmin']
    : ['member', 'president', 'secretary'];
  const { showToast }            = useToast();

  // Always show the logged-in user's latest data (e.g. after profile photo change)
  const members = useMemo(
    () => _members.map(m => m.email === me?.email ? { ...m, ...me } : m),
    [_members, me]
  );

  const [search,    setSearch]   = useState('');
  const [filterActive, setFilterActive] = useState('all'); // 'all' | 'active' | 'inactive'

  const [showAdd,   setShowAdd]  = useState(false);
  const [editItem,  setEditItem] = useState(null);   // member object to edit
  const [confirm,   setConfirm]  = useState(null);   // { member, action }

  // ── Manual points state ───────────────────────────────────────────────────
  const [pointsTarget,  setPointsTarget]  = useState(null);  // member object
  const [memberPoints,  setMemberPoints]  = useState([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsForm,    setPointsForm]    = useState({ categoryId: '', points: '', description: '' });
  const [pointsSaving,  setPointsSaving]  = useState(false);

  const openPoints = async (m) => {
    setPointsTarget(m);
    setPointsForm({ categoryId: '', points: '', description: '' });
    setPointsLoading(true);
    try {
      const pts = await getMemberManualPoints(m.email);
      setMemberPoints(pts);
    } finally {
      setPointsLoading(false);
    }
  };

  const handleAddPoints = async (e) => {
    e.preventDefault();
    if (!pointsForm.categoryId) { showToast('Please select a category.', 'error'); return; }
    const cat = getManualCategory(pointsForm.categoryId);
    const pts = cat?.id === 'manual' ? Number(pointsForm.points) : cat?.points ?? 0;
    if (!pts || pts < 0) { showToast('Enter a valid points value.', 'error'); return; }
    setPointsSaving(true);
    try {
      await addManualPoints({
        memberId:    pointsTarget.email,
        points:      pts,
        categoryId:  pointsForm.categoryId,
        description: pointsForm.description,
        addedBy:     me.email,
      });
      const fresh = await getMemberManualPoints(pointsTarget.email);
      setMemberPoints(fresh);
      setPointsForm({ categoryId: '', points: '', description: '' });
      showToast(`Added ${pts} pts to ${pointsTarget.fullName}.`, 'success');
    } catch (err) {
      showToast('Failed to add points.', 'error');
    } finally {
      setPointsSaving(false);
    }
  };

  const handleDeletePoints = async (ptId) => {
    try {
      await deleteManualPoints(ptId);
      setMemberPoints(prev => prev.filter(p => p.id !== ptId));
      showToast('Point entry removed.', 'success');
    } catch {
      showToast('Failed to delete points.', 'error');
    }
  };

  // ── Category change (auto-fill points) ───────────────────────────────────
  const handlePtsCatChange = (e) => {
    const id  = e.target.value;
    const cat = getManualCategory(id);
    setPointsForm(f => ({ ...f, categoryId: id, points: cat?.id === 'manual' ? '' : (cat?.points ?? '') }));
  };

  const [form,      setForm]     = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving,    setSaving]   = useState(false);
  const filtered = useMemo(() => {
    return members.filter(m => {
      const q  = search.toLowerCase();
      const sm = !q ||
        m.fullName?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.memberId?.toLowerCase().includes(q) ||
        m.position?.toLowerCase().includes(q);

      const sa = filterActive === 'all'
        ? true
        : filterActive === 'active'
          ? m.isActive
          : !m.isActive;

      return sm && sa;
    });
  }, [members, search, filterActive]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setFormError('');
    setShowAdd(true);
  };

  const openEdit = (m) => {
    setFormError('');
    setEditItem(m);
  };

  // ── Save (add) ────────────────────────────────────────────────────────────
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleAdd = async (formData) => {
    if (!formData.email || !formData.password || !formData.fullName) {
      setFormError('Full Name, Email and Password are required.');
      return;
    }
    if (!EMAIL_RE.test(formData.email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await createMember(formData, formData.password);
      showToast(`Member "${formData.fullName}" added successfully.`, 'success');
      setShowAdd(false);
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to create member.');
    } finally {
      setSaving(false);
    }
  };

  // ── Save (edit) ───────────────────────────────────────────────────────────
  const handleEdit = async (formData) => {
    setSaving(true);
    setFormError('');
    try {
      const { password, ...updates } = formData;
      await updateMember(editItem.email, updates);
      showToast('Member updated.', 'success');
      setEditItem(null);
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to update member.');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggleStatus = async () => {
    const { member, action } = confirm;
    try {
      await toggleMemberStatus(member.email, action === 'activate');
      showToast(
        action === 'activate'
          ? `${member.fullName} reactivated.`
          : `${member.fullName} deactivated.`,
        'success',
      );
      refetch();
    } catch {
      showToast('Action failed. Please try again.', 'error');
    } finally {
      setConfirm(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  // ── Form fields (reused for add + edit) ──────────────────────────────────


  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-portal-text">Members</h1>
          <p className="text-portal-muted text-xs mt-0.5">{members.length} total members</p>
        </div>
        <button onClick={openAdd}
          className="sm:ml-auto bg-portal-red hover:bg-portal-red-dark text-white font-semibold
                     px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
          <i className="fa-solid fa-user-plus" /> Add Member
        </button>
      </div>

      {/* Filters */}
      <div className="card rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2
                         text-portal-muted/60 text-sm pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email or ID…"
            className="w-full bg-portal-bg border border-white/5 rounded-lg pl-9 pr-4 py-2
                       text-portal-text placeholder-portal-muted/40 text-sm
                       focus:outline-none focus:border-portal-gold/50 transition-colors" />
        </div>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
          className="bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                     text-portal-text text-sm focus:outline-none focus:border-portal-gold/50">
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-subtle">
                {['Member', 'ID', 'Position', 'Term', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-portal-muted text-xs uppercase tracking-wide font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-portal-muted">
                    No members found.
                  </td>
                </tr>
              ) : (
                filtered.map(m => (
                  <tr key={m.id}
                    className="border-b border-subtle last:border-0 hover:bg-portal-hover transition-colors">
                    {/* Member info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-portal-red/20 border border-portal-gold/30
                                        flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {m.profilePhoto
                            ? <img src={m.profilePhoto} alt="" className="w-full h-full object-cover" />
                            : <span className="text-xs font-bold text-portal-gold">
                                {m.fullName?.charAt(0)?.toUpperCase()}
                              </span>
                          }
                        </div>
                        <div>
                          <p className="text-portal-text font-medium">{m.fullName}</p>
                          <p className="text-portal-muted text-xs">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-portal-muted font-mono text-xs">{m.memberId}</td>
                    <td className="px-4 py-3 text-portal-muted">{m.position || '—'}</td>
                    <td className="px-4 py-3 text-portal-muted">{m.term || '—'}</td>
                    <td className="px-4 py-3"><Badge status={m.role} /></td>
                    <td className="px-4 py-3"><Badge status={m.isActive ? 'active' : 'inactive'} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(m)} title="Edit"
                          className="text-portal-muted hover:text-portal-gold transition-colors p-1">
                          <i className="fa-solid fa-pen-to-square" />
                        </button>
                        <button onClick={() => openPoints(m)} title="Manage Points"
                          className="text-portal-muted hover:text-yellow-400 transition-colors p-1">
                          <i className="fa-solid fa-trophy" />
                        </button>
                        {m.email !== me?.email && (
                          <button
                            onClick={() => setConfirm({
                              member: m,
                              action: m.isActive ? 'deactivate' : 'activate',
                            })}
                            title={m.isActive ? 'Deactivate' : 'Activate'}
                            className={`transition-colors p-1
                                        ${m.isActive
                                          ? 'text-portal-muted hover:text-red-400'
                                          : 'text-portal-muted hover:text-green-400'}`}
                          >
                            <i className={`fa-solid ${m.isActive ? 'fa-user-slash' : 'fa-user-check'}`} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Points Modal */}
      <Modal
        isOpen={!!pointsTarget}
        onClose={() => setPointsTarget(null)}
        title={`Points — ${pointsTarget?.fullName ?? ''}`}
        size="lg"
      >
        <div className="space-y-5">
          {/* Existing points */}
          <div>
            <p className="text-xs text-portal-muted uppercase tracking-widest mb-2">Current Manual Points</p>
            {pointsLoading ? (
              <p className="text-portal-muted text-sm">Loading…</p>
            ) : memberPoints.length === 0 ? (
              <p className="text-portal-muted text-sm italic">No manual points recorded yet.</p>
            ) : (
              <div className="rounded-lg overflow-hidden border border-subtle max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-subtle">
                    {memberPoints.map(pt => (
                      <tr key={pt.id} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-portal-muted text-xs">
                          {getManualCategory(pt.categoryId)?.label ?? pt.categoryId}
                        </td>
                        <td className="px-3 py-2 text-portal-text text-xs">{pt.description || '—'}</td>
                        <td className="px-3 py-2 text-right text-portal-gold font-bold">+{pt.points}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => handleDeletePoints(pt.id)}
                            className="text-portal-muted hover:text-red-400 transition-colors p-1">
                            <i className="fa-solid fa-trash text-xs" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {memberPoints.length > 0 && (
              <p className="text-xs text-portal-gold mt-1 text-right">
                Total manual: <strong>{memberPoints.reduce((s, p) => s + (Number(p.points) || 0), 0)}</strong> pts
              </p>
            )}
          </div>

          {/* Add points form */}
          <div className="border-t border-subtle pt-4">
            <p className="text-xs text-portal-muted uppercase tracking-widest mb-3">Add Points</p>
            <form onSubmit={handleAddPoints} className="space-y-3">
              <div>
                <label className="block text-xs text-portal-muted mb-1">Category *</label>
                <select
                  value={pointsForm.categoryId}
                  onChange={handlePtsCatChange}
                  required
                  className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                             text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
                >
                  <option value="">— Select category —</option>
                  {Object.entries(groupedManualCategories()).map(([grp, cats]) => (
                    <optgroup key={grp} label={grp}>
                      {cats.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.label}{c.points > 0 ? ` (+${c.points} pts)` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Custom points input only for 'manual' category */}
              {pointsForm.categoryId === 'manual' && (
                <div>
                  <label className="block text-xs text-portal-muted mb-1">Points *</label>
                  <input
                    type="number" min="1"
                    value={pointsForm.points}
                    onChange={e => setPointsForm(f => ({ ...f, points: e.target.value }))}
                    required
                    className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                               text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
                  />
                </div>
              )}
              {pointsForm.categoryId && pointsForm.categoryId !== 'manual' && (
                <p className="text-xs text-portal-gold">
                  <i className="fa-solid fa-star mr-1" />
                  Will add <strong>{pointsForm.points}</strong> pts
                </p>
              )}

              <div>
                <label className="block text-xs text-portal-muted mb-1">Description / Note</label>
                <input
                  value={pointsForm.description}
                  onChange={e => setPointsForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Project Chairman – Blood Donation 2025"
                  className="w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                             text-portal-text text-sm focus:outline-none focus:border-portal-gold/50"
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={pointsSaving}
                  className="bg-portal-red hover:bg-portal-red-dark disabled:opacity-50 text-white
                             font-semibold px-5 py-2 rounded-lg text-sm flex items-center gap-2">
                  {pointsSaving
                    ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                    : <><i className="fa-solid fa-plus" />Add Points</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>

      {/* Add Member Modal */}
      {/* Add Member Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Member" size="lg">
        {showAdd && (
          <AddMemberForm
            key="add-form"
            initialForm={EMPTY_FORM}
            roles={ROLES}
            isAdd={true}
            formError={formError}
            saving={saving}
            onSubmit={handleAdd}
            onCancel={() => setShowAdd(false)}
          />
        )}
      </Modal>

      {/* Edit Member Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Member" size="lg">
        {!!editItem && (
          <AddMemberForm
            key="edit-form"
            initialForm={{ ...EMPTY_FORM, ...editItem, password: '' }}
            roles={ROLES}
            isAdd={false}
            formError={formError}
            saving={saving}
            onSubmit={handleEdit}
            onCancel={() => setEditItem(null)}
          />
        )}
      </Modal>

      {/* Confirm deactivate/activate */}
      <ConfirmDialog
        isOpen={!!confirm}
        isDanger={confirm?.action === 'deactivate'}
        title={confirm?.action === 'deactivate' ? 'Deactivate Member' : 'Reactivate Member'}
        message={
          confirm?.action === 'deactivate'
            ? `Deactivate ${confirm?.member?.fullName}? They will lose portal access.`
            : `Reactivate ${confirm?.member?.fullName}? They will regain portal access.`
        }
        confirmText={confirm?.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

export default MembersPage;
