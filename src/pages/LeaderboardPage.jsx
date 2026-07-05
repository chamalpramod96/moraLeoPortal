import { useState, useEffect }        from 'react';
import { useAuth }                     from '../context/AuthContext';
import { useToast }                    from '../context/ToastContext';
import LoadingSpinner                  from '../components/LoadingSpinner';
import { getMembers }                  from '../services/memberService';
import { getEvents, getMemberAttendance } from '../services/eventService';
import { getAllManualPoints, computeMemberPoints } from '../services/pointsService';
import { getLevelInfo }                from '../data/pointsConfig';
import { initials }                    from '../utils/helpers';

// ─── Level badge ──────────────────────────────────────────────────────────────
function LevelBadge({ level }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold
                      ${level.border ?? level.borderClass ?? 'border-gray-600'}
                      ${level.bg ?? level.bgClass} ${level.color ?? level.colorClass}`}>
      <i className="fa-solid fa-star opacity-70 text-[10px]" />{level.label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { showToast }  = useToast();
  const [rows,       setRows]     = useState([]);
  const [loading,    setLoading]  = useState(true);
  const [search,     setSearch]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [members, events, manualPts] = await Promise.all([
          getMembers(),
          getEvents(),
          getAllManualPoints(),
        ]);

        // fetch attendance for ALL members in parallel
        const attPerMember = await Promise.all(
          members.map(m => getMemberAttendance(m.email).then(att => ({ email: m.email, att })))
        );
        const attMap = Object.fromEntries(attPerMember.map(x => [x.email, x.att]));

        const ranked = members.map(m => {
          const att    = attMap[m.email] ?? [];
          const all    = [...att];          // combine with events lookup below
          const { eventPoints, manualPoints, total } = computeMemberPoints(
            m.email, att, events, manualPts
          );
          return { member: m, eventPoints, manualPoints, total };
        });

        ranked.sort((a, b) => b.total - a.total);
        setRows(ranked);
      } catch (err) {
        showToast('Failed to load leaderboard.', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner fullScreen />;

  const filtered = rows.filter(r =>
    r.member.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    r.member.position?.toLowerCase().includes(search.toLowerCase())
  );

  const medalIcon = (rank) => {
    if (rank === 1) return <i className="fa-solid fa-trophy text-yellow-400" title="1st Place" />;
    if (rank === 2) return <i className="fa-solid fa-medal text-gray-300" title="2nd Place" />;
    if (rank === 3) return <i className="fa-solid fa-medal text-amber-600" title="3rd Place" />;
    return <span className="text-portal-muted text-sm font-mono">{rank}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-portal-text">
            <i className="fa-solid fa-ranking-star text-portal-gold mr-2" />
            Leaderboard
          </h1>
          <p className="text-portal-muted text-sm mt-1">
            All members ranked by total Mora Miglioria points
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

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Members',    val: rows.length,                                          icon: 'fa-users',       color: 'text-portal-gold'  },
          { label: 'Highest Score',    val: (rows[0]?.total ?? 0).toLocaleString() + ' pts',      icon: 'fa-crown',       color: 'text-yellow-400'   },
          { label: 'Average Score',    val: Math.round(rows.reduce((s, r) => s+r.total, 0) / (rows.length || 1)).toLocaleString() + ' pts', icon: 'fa-chart-line', color: 'text-blue-400' },
          { label: 'Level 03+',        val: rows.filter(r => getLevelInfo(r.total).current.level >= 3).length, icon: 'fa-star', color: 'text-portal-red' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <i className={`fa-solid ${s.icon} ${s.color} text-lg mb-1`} />
            <p className="text-lg font-bold text-portal-text">{s.val}</p>
            <p className="text-xs text-portal-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-portal-muted">No members found.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle bg-white/[0.03]">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-portal-muted w-12">Rank</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-portal-muted">Member</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-portal-muted">Level</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-portal-muted">Event Pts</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-portal-muted">Manual Pts</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-portal-muted">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {filtered.map((row, idx) => {
                  const rank = rows.indexOf(row) + 1;
                  const { current } = getLevelInfo(row.total);
                  const m = row.member;
                  return (
                    <tr key={m.email}
                        className={`transition-colors hover:bg-white/[0.03] ${rank <= 3 ? 'bg-white/[0.02]' : ''}`}>
                      <td className="px-4 py-3.5 text-center">{medalIcon(rank)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-portal-red/20 border border-portal-gold/30
                                          flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-portal-gold">{initials(m.fullName)}</span>
                          </div>
                          <div>
                            <p className="text-portal-text font-medium">{m.fullName}</p>
                            <p className="text-portal-muted text-xs">{m.position || 'Member'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <LevelBadge level={current} />
                      </td>
                      <td className="px-4 py-3.5 text-right text-portal-muted font-mono text-sm">
                        {row.eventPoints.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right text-portal-muted font-mono text-sm">
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
    </div>
  );
}
