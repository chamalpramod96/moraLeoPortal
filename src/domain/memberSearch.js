/**
 * Finding members by typing part of a name — used by the project officer
 * picker and the attendance search. Pure; covered by memberSearch.test.js.
 */

/**
 * Members whose name or member ID contains `query` (any case), leaving out
 * `excluded` emails, best matches first (name starts with the text, then
 * any word does, then anywhere).
 */
export function matchMembers(members, query, excluded = new Set(), limit = Infinity) {
  const q = query.trim().toLowerCase();
  const rank = (m) => {
    const name = (m.fullName ?? '').toLowerCase();
    if (!q) return 0;
    if (name.startsWith(q) || name.replace(/^leo\s+(lion\s+)?/, '').startsWith(q)) return 0;
    if (name.split(/\s+/).some(w => w.startsWith(q))) return 1;
    if (name.includes(q) || (m.memberId ?? '').toLowerCase().includes(q)) return 2;
    return -1;
  };
  return members
    .filter(m => !excluded.has(m.email))
    .map(m => ({ m, r: rank(m) }))
    .filter(x => x.r >= 0)
    .sort((a, b) => a.r - b.r)
    .slice(0, limit)
    .map(x => x.m);
}
