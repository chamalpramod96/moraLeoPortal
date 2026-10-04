import { useState, useEffect, useCallback } from 'react';
import { useAuth }                     from '../context/AuthContext';
import { useToast }                    from '../context/ToastContext';
import LoadingSpinner                  from '../components/LoadingSpinner';
import {
  computeLeaderboard, saveLeaderboard, getPublishedLeaderboard, memberKey,
} from '../services/leaderboardService';
import { initials }                    from '../utils/helpers';

const medalIcon = (rank) => {
  if (rank === 1) return <i className="fa-solid fa-trophy text-yellow-400" title="1st Place" />;
  if (rank === 2) return <i className="fa-solid fa-medal text-gray-300" title="2nd Place" />;
  if (rank === 3) return <i className="fa-solid fa-medal text-amber-600" title="3rd Place" />;
  return <span className="text-portal-muted text-sm font-mono">{rank}</span>;
};

const formatUpdated = (d) => d
  ? d.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  : null;

// ─── Main page ────────────────────────────────────────────────────────────────
/**
 * Visible to all members. Admins compute the ranking live from full data and
 * publish it (leaderboard/current); members read that published summary,
 * which holds only names, positions and points.
 */
export default function LeaderboardPage() {
  const { memberData, isAdmin } = useAuth();
  const { showToast }  = useToast();
  const [rows,       setRows]      = useState([]);
  const [updatedAt,  setUpdatedAt] = useState(null);
  const [published,  setPublished] = useState(true);
  const [myKey,      setMyKey]     = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');

  const load = useCallback(async () => {
    try {
      setMyKey(await memberKey(memberData?.email));
      if (isAdmin) {
        const fresh = await computeLeaderboard();
        setRows(fresh);
        setUpdatedAt(new Date());
        // Keep the members' copy in step with what admins see
        saveLeaderboard(fresh).catch(() =>
          showToast('Showing live results, but publishing them for members failed.', 'error'));
      } else {
        const data = await getPublishedLeaderboard();
        setPublished(!!data);
        setRows(data?.rows ?? []);
        setUpdatedAt(data?.updatedAt?.toDate?.() ?? null);
      }
    } catch {
      showToast('Failed to load leaderboard.', 'error');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, memberData?.email, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  const me = rows.find(r => r.key === myKey);
  const q  = search.toLowerCase();
  const filtered = rows.filter(r =>
    r.name?.toLowerCase().includes(q) || r.position?.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-portal-text">
            <i className="fa-solid fa-ranking-star text-portal-gold mr-2" />
            Leaderboard
          </h1>
          <p className="text-portal-muted text-xs mt-0.5">
            All members ranked by total Mora Connect points
            {updatedAt && <> · Updated {formatUpdated(updatedAt)}</>}
          </p>
        </div>
        <input
          type="search"
          placeholder="Search member…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base w-full sm:w-64"
        />
      </div>

      {!published ? (
        <div className="card rounded-xl p-10 text-center">
          <i className="fa-solid fa-ranking-star text-4xl text-portal-muted/40 mb-3" />
          <p className="text-portal-muted text-sm">The leaderboard hasn't been published yet.</p>
          <p className="text-portal-muted/70 text-xs mt-1">
            It updates automatically when the club records attendance or points.
          </p>
        </div>
      ) : (
        <>
          {/* ── Your place + stats ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="card-gold rounded-xl p-4 sm:col-span-1">
              <p className="text-xs text-portal-muted uppercase tracking-widest">Your Place</p>
              {me ? (
                <>
                  <p className="text-3xl font-bold text-portal-gold mt-1">
                    #{me.rank} <span className="text-sm font-normal text-portal-muted">of {rows.length}</span>
                  </p>
                  <p className="text-xs text-portal-muted mt-1">
                    {me.total.toLocaleString()} pts · {me.eventPoints.toLocaleString()} participation
                    {' + '}{me.manualPoints.toLocaleString()} other
                  </p>
                </>
              ) : (
                <p className="text-sm text-portal-muted mt-2">You're not on the leaderboard yet.</p>
              )}
            </div>
            <div className="card rounded-xl p-4">
              <i className="fa-solid fa-users text-portal-gold text-lg mb-1" />
              <p className="text-lg font-bold text-portal-text">{rows.length}</p>
              <p className="text-xs text-portal-muted">Members ranked</p>
            </div>
            <div className="card rounded-xl p-4">
              <i className="fa-solid fa-crown text-yellow-400 text-lg mb-1" />
              <p className="text-lg font-bold text-portal-text">{(rows[0]?.total ?? 0).toLocaleString()} pts</p>
              <p className="text-xs text-portal-muted">Highest score</p>
            </div>
          </div>

          {/* ── Table ── */}
          {filtered.length === 0 ? (
            <div className="card rounded-xl p-8 text-center text-portal-muted">No members found.</div>
          ) : (
            <div className="card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-subtle bg-white/[0.03]">
                      <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-portal-muted w-14">Rank</th>
                      <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-portal-muted">Member</th>
                      <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-portal-muted hidden sm:table-cell">Participation</th>
                      <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-portal-muted hidden sm:table-cell">Other</th>
                      <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-portal-muted">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {filtered.map(row => {
                      const isMe = row.key === myKey;
                      return (
                        <tr key={row.key}
                            className={`transition-colors hover:bg-white/[0.03]
                                        ${isMe ? 'bg-portal-gold/10' : row.rank <= 3 ? 'bg-white/[0.02]' : ''}`}>
                          <td className="px-4 py-3.5 text-center">{medalIcon(row.rank)}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-portal-red/20 border border-portal-gold/30
                                              flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-portal-gold">{initials(row.name)}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-portal-text font-medium truncate">
                                  {row.name}
                                  {isMe && (
                                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide
                                                     text-portal-bg bg-portal-gold rounded px-1.5 py-0.5 align-middle">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-portal-muted text-xs truncate">{row.position || 'Member'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right text-portal-muted font-mono hidden sm:table-cell">
                            {row.eventPoints.toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-right text-portal-muted font-mono hidden sm:table-cell">
                            {row.manualPoints.toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-portal-gold font-bold font-mono text-base">
                              {row.total.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
