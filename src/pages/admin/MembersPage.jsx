import { useState, useMemo }  from 'react';
import { useAuth }            from '../../context/AuthContext';
import { useToast }           from '../../context/ToastContext';
import { useMembers }         from '../../hooks/useMembers';
import {
  createMember, updateMember, toggleMemberStatus, sendSetPasswordEmail, removeMember,
} from '../../services/memberService';
import { refreshLeaderboardSoon } from '../../services/leaderboardService';
import Modal                  from '../../components/Modal';
import ConfirmDialog          from '../../components/ConfirmDialog';
import PasswordConfirmModal   from '../../components/PasswordConfirmModal';
import Badge                  from '../../components/Badge';
import LoadingSpinner         from '../../components/LoadingSpinner';
import MemberAvatar           from '../../components/MemberAvatar';
import MemberForm, { EMPTY_MEMBER_FORM } from './MemberForm';
import ManualPointsModal      from './ManualPointsModal';
import { ROLES, assignableRoles } from '../../data/roles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The fields the edit form may change. Only these, and only those the admin
// changed, are saved — saving the whole snapshot could undo something that
// changed meanwhile (e.g. the member uploading a new photo while the form
// was open).
const EDITABLE = ['memberId', 'fullName', 'phone', 'role', 'position', 'term', 'profilePhoto'];

function matchesSearch(m, q) {
  return !q ||
    m.fullName?.toLowerCase().includes(q) ||
    m.email?.toLowerCase().includes(q) ||
    m.memberId?.toLowerCase().includes(q) ||
    m.position?.toLowerCase().includes(q);
}

function matchesStatus(m, filter) {
  if (filter === 'active')   return m.isActive;
  if (filter === 'inactive') return !m.isActive;
  return true;
}

function MembersPage() {
  const { memberData: me, isSuperAdmin } = useAuth();
  const { showToast }            = useToast();
  const { members: _members, loading, refetch } = useMembers();

  // superAdmin can assign the superAdmin role; others can assign up to president
  const roles = assignableRoles(isSuperAdmin);

  // Always show the logged-in user's latest data (e.g. after profile photo change)
  const members = useMemo(
    () => _members.map(m => m.email === me?.email ? { ...m, ...me } : m),
    [_members, me]
  );

  const [search,       setSearch]       = useState('');
  const [filterActive, setFilterActive] = useState('all'); // 'all' | 'active' | 'inactive'

  const [showAdd,      setShowAdd]      = useState(false);
  const [editItem,     setEditItem]     = useState(null);   // member object to edit
  const [formError,    setFormError]    = useState('');
  const [saving,       setSaving]       = useState(false);
  const [pointsTarget, setPointsTarget] = useState(null);   // member whose points are open
  const [confirm,      setConfirm]      = useState(null);   // { member } to reactivate
  const [removeItem,   setRemoveItem]   = useState(null);   // member to remove
  const [inviting,     setInviting]     = useState(null);   // email currently sending

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter(m => matchesSearch(m, q) && matchesStatus(m, filterActive));
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
  const handleAdd = async (formData) => {
    if (!formData.email || !formData.fullName) {
      setFormError('Full Name and Email are required.');
      return;
    }
    const email = formData.email.trim();
    if (!EMAIL_RE.test(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const { inviteSent } = await createMember({ ...formData, email });
      showToast(
        inviteSent
          ? `Member "${formData.fullName}" added. A set-password email was sent to ${email}.`
          : `Member "${formData.fullName}" added, but the invite email failed. Use "Resend invite".`,
        inviteSent ? 'success' : 'error',
      );
      refreshLeaderboardSoon();
      setShowAdd(false);
      refetch();
    } catch (err) {
      setFormError(
        err.code === 'auth/email-already-in-use'
          ? 'This email still has a login (for example a removed member). Delete it in ' +
            'Firebase Console → Authentication → Users, then add the member again.'
          : err.message || 'Failed to create member.',
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Save (edit) ───────────────────────────────────────────────────────────
  const handleEdit = async (formData) => {
    const changes = {};
    EDITABLE.forEach(k => {
      const value = typeof formData[k] === 'string' ? formData[k].trim() : formData[k];
      if (value !== (editItem[k] ?? '')) changes[k] = value ?? '';
    });
    if (!changes.fullName && 'fullName' in changes) {
      setFormError('Full Name is required.');
      return;
    }
    if (Object.keys(changes).length === 0) {
      setEditItem(null);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await updateMember(editItem.email, changes);
      showToast('Member updated.', 'success');
      refreshLeaderboardSoon();
      setEditItem(null);
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to update member.');
    } finally {
      setSaving(false);
    }
  };

  // ── Resend invite (set-password email) ───────────────────────────────────
  const handleResendInvite = async (m) => {
    setInviting(m.email);
    try {
      await sendSetPasswordEmail(m.email);
      showToast(`Set-password email sent to ${m.email}.`, 'success');
    } catch {
      showToast('Failed to send the email. Please try again.', 'error');
    } finally {
      setInviting(null);
    }
  };

  // ── Reactivate (members deactivated before "Remove" replaced deactivation) ──
  const handleReactivate = async () => {
    const { member } = confirm;
    try {
      await toggleMemberStatus(member.email, true);
      showToast(`${member.fullName} reactivated.`, 'success');
      refreshLeaderboardSoon();
      refetch();
    } catch {
      showToast('Action failed. Please try again.', 'error');
    } finally {
      setConfirm(null);
    }
  };

  // ── Remove permanently (Super Admin, password-confirmed) ─────────────────
  // Throws on failure, so the dialog shows its error and stays open.
  const handleRemove = async () => {
    await removeMember(removeItem.email);
    showToast(`${removeItem.fullName} was removed permanently.`, 'success');
    refreshLeaderboardSoon();
    setRemoveItem(null);
    refetch();
  };

  // Row actions — shared by the table (larger screens) and the cards (phones)
  const renderActions = (m) => (
    <>
      {/* Only a Super Admin can edit a Super Admin (rules enforce this too) */}
      {(m.role !== ROLES.SUPER_ADMIN || isSuperAdmin) && (
        <button onClick={() => openEdit(m)} title="Edit"
          className="text-portal-muted hover:text-portal-gold transition-colors p-2 xl:p-1">
          <i className="fa-solid fa-pen-to-square" />
        </button>
      )}
      <button onClick={() => setPointsTarget(m)} title="Manage Points"
        className="text-portal-muted hover:text-yellow-400 transition-colors p-2 xl:p-1">
        <i className="fa-solid fa-trophy" />
      </button>
      {m.isActive && (
        <button onClick={() => handleResendInvite(m)} title="Resend invite (set-password email)"
          disabled={inviting === m.email}
          className="text-portal-muted hover:text-sky-400 disabled:opacity-50 transition-colors p-2 xl:p-1">
          <i className={`fa-solid ${inviting === m.email ? 'fa-spinner fa-spin' : 'fa-envelope'}`} />
        </button>
      )}
      {!m.isActive && m.email !== me?.email && (
        <button onClick={() => setConfirm({ member: m })} title="Reactivate"
          className="text-portal-muted hover:text-green-400 transition-colors p-2 xl:p-1">
          <i className="fa-solid fa-user-check" />
        </button>
      )}
      {isSuperAdmin && m.email !== me?.email && (
        <button onClick={() => setRemoveItem(m)} title="Remove member permanently"
          className="text-portal-muted hover:text-red-400 transition-colors p-2 xl:p-1">
          <i className="fa-solid fa-user-xmark" />
        </button>
      )}
    </>
  );

  if (loading) return <LoadingSpinner />;

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

      {/* Phones, tablets and small laptops: one card per member */}
      <div className="xl:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="card rounded-xl p-8 text-center text-portal-muted text-sm">No members found.</div>
        ) : filtered.map(m => (
          <div key={m.id} className="card rounded-xl p-4">
            <div className="flex items-start gap-3">
              <MemberAvatar member={m} />
              <div className="min-w-0 flex-1">
                <p className="text-portal-text font-medium break-words">{m.fullName}</p>
                <p className="text-portal-muted text-xs break-all">{m.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-xs text-portal-muted">
              {m.memberId && <span className="font-mono">{m.memberId}</span>}
              {m.position && <span>{m.position}</span>}
              {m.term && <span>Term {m.term}</span>}
              <Badge status={m.role} />
              <Badge status={m.isActive ? 'active' : 'inactive'} />
            </div>
            <div className="flex items-center gap-1 mt-3 pt-2 border-t border-subtle -mx-1">
              {renderActions(m)}
            </div>
          </div>
        ))}
      </div>

      {/* Larger screens: the table */}
      <div className="hidden xl:block card rounded-xl overflow-hidden">
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
                        <MemberAvatar member={m} />
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
                      <div className="flex items-center gap-2">{renderActions(m)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual points — mounted fresh for each member */}
      {pointsTarget && (
        <ManualPointsModal
          key={pointsTarget.email}
          member={pointsTarget}
          onClose={() => setPointsTarget(null)}
        />
      )}

      {/* Add Member Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Member" size="lg">
        {showAdd && (
          <MemberForm
            key="add-form"
            initialForm={EMPTY_MEMBER_FORM}
            roles={roles}
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
          <MemberForm
            key="edit-form"
            initialForm={{ ...EMPTY_MEMBER_FORM, ...editItem }}
            roles={roles}
            isAdd={false}
            formError={formError}
            saving={saving}
            onSubmit={handleEdit}
            onCancel={() => setEditItem(null)}
          />
        )}
      </Modal>

      {/* Confirm reactivate */}
      <ConfirmDialog
        isOpen={!!confirm}
        title="Reactivate Member"
        message={`Reactivate ${confirm?.member?.fullName}? They will regain portal access.`}
        confirmText="Reactivate"
        onConfirm={handleReactivate}
        onCancel={() => setConfirm(null)}
      />

      {/* Remove permanently — password-protected */}
      <PasswordConfirmModal
        isOpen={!!removeItem}
        onClose={() => setRemoveItem(null)}
        onConfirm={handleRemove}
        title="Remove Member"
        confirmText="Remove Permanently"
        confirmIcon="fa-user-xmark"
        busyText="Removing…"
        failureMessage="Remove failed part-way. Please try again — it continues where it stopped."
      >
        <div className="text-sm text-portal-text space-y-1.5">
          <p>
            Permanently remove <span className="font-semibold text-portal-gold">{removeItem?.fullName}</span>
            {' '}<span className="text-portal-muted">({removeItem?.email})</span>?
          </p>
          <p className="text-portal-muted text-xs">
            Their member record, all attendance records, points history and profile photo
            will be deleted. <strong className="text-red-400">This cannot be undone.</strong>
          </p>
        </div>
      </PasswordConfirmModal>
    </div>
  );
}

export default MembersPage;
