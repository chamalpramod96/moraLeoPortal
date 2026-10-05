import { useState, useEffect } from 'react';
import { useAuth }            from '../../context/AuthContext';
import { useToast }           from '../../context/ToastContext';
import Modal                  from '../../components/Modal';
import { InlineSpinner }      from '../../components/LoadingSpinner';
import {
  getMemberManualPoints, addManualPoints, deleteManualPoints,
} from '../../services/pointsService';
import { refreshLeaderboardSoon } from '../../services/leaderboardService';
import { groupedManualCategories, getManualCategory } from '../../data/pointsConfig';

const EMPTY_POINTS_FORM = { categoryId: '', points: '', description: '' };

const inputClass = `w-full bg-portal-bg border border-white/5 rounded-lg px-3 py-2
                    text-portal-text text-sm focus:outline-none focus:border-portal-gold/50`;

/**
 * Manual points ("awards") for one member: the list, with delete, and a
 * form to add more. Mount it fresh for each member (give it a `key`).
 */
function ManualPointsModal({ member, onClose }) {
  const { memberData: me } = useAuth();
  const { showToast }      = useToast();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(EMPTY_POINTS_FORM);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    let active = true;
    getMemberManualPoints(member.email)
      .then(pts => { if (active) setEntries(pts); })
      .catch(() => { if (active) showToast('Could not load points. Please try again.', 'error'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [member.email, showToast]);

  // Category change auto-fills its points ('manual' takes a typed value)
  const handleCategoryChange = (e) => {
    const id  = e.target.value;
    const cat = getManualCategory(id);
    setForm(f => ({ ...f, categoryId: id, points: cat?.id === 'manual' ? '' : (cat?.points ?? '') }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.categoryId) { showToast('Please select a category.', 'error'); return; }
    const cat = getManualCategory(form.categoryId);
    const pts = cat?.id === 'manual' ? Number(form.points) : cat?.points ?? 0;
    if (Number.isNaN(pts) || pts < 0) { showToast('Enter a valid points value.', 'error'); return; }
    setSaving(true);
    try {
      await addManualPoints({
        memberId:    member.email,
        points:      pts,
        categoryId:  form.categoryId,
        description: form.description,
        addedBy:     me.email,
      });
      setEntries(await getMemberManualPoints(member.email));
      setForm(EMPTY_POINTS_FORM);
      showToast(`Added ${pts} pts to ${member.fullName}.`, 'success');
      refreshLeaderboardSoon();
    } catch {
      showToast('Failed to add points.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ptId) => {
    try {
      await deleteManualPoints(ptId);
      setEntries(prev => prev.filter(p => p.id !== ptId));
      showToast('Point entry removed.', 'success');
      refreshLeaderboardSoon();
    } catch {
      showToast('Failed to delete points.', 'error');
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Points — ${member.fullName ?? ''}`} size="lg">
      <div className="space-y-5">
        {/* Existing points */}
        <div>
          <p className="text-xs text-portal-muted uppercase tracking-widest mb-2">Current Manual Points</p>
          {loading ? (
            <p className="text-portal-muted text-sm">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-portal-muted text-sm italic">No manual points recorded yet.</p>
          ) : (
            <div className="rounded-lg overflow-hidden border border-subtle max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-subtle">
                  {entries.map(pt => (
                    <tr key={pt.id} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2 text-portal-muted text-xs">
                        {getManualCategory(pt.categoryId)?.label ?? pt.categoryId}
                      </td>
                      <td className="px-3 py-2 text-portal-text text-xs">{pt.description || '—'}</td>
                      <td className="px-3 py-2 text-right text-portal-gold font-bold">+{pt.points}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => handleDelete(pt.id)}
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
          {entries.length > 0 && (
            <p className="text-xs text-portal-gold mt-1 text-right">
              Total manual: <strong>{entries.reduce((s, p) => s + (Number(p.points) || 0), 0)}</strong> pts
            </p>
          )}
        </div>

        {/* Add points form */}
        <div className="border-t border-subtle pt-4">
          <p className="text-xs text-portal-muted uppercase tracking-widest mb-3">Add Points</p>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-xs text-portal-muted mb-1">Category *</label>
              <select
                value={form.categoryId}
                onChange={handleCategoryChange}
                required
                className={inputClass}
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
            {form.categoryId === 'manual' && (
              <div>
                <label className="block text-xs text-portal-muted mb-1">Points *</label>
                <input
                  type="number" min="0"
                  value={form.points}
                  onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
                  required
                  className={inputClass}
                />
              </div>
            )}
            {form.categoryId && form.categoryId !== 'manual' && (
              <p className="text-xs text-portal-gold">
                <i className="fa-solid fa-star mr-1" />
                Will add <strong>{form.points}</strong> pts
              </p>
            )}

            <div>
              <label className="block text-xs text-portal-muted mb-1">Description / Note</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Project Chairman – Blood Donation 2025"
                className={inputClass}
              />
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="bg-portal-red hover:bg-portal-red-dark disabled:opacity-50 text-white
                           font-semibold px-5 py-2 rounded-lg text-sm flex items-center gap-2">
                {saving
                  ? <><InlineSpinner />Saving…</>
                  : <><i className="fa-solid fa-plus" />Add Points</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}

export default ManualPointsModal;
