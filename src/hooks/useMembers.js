import { getMembers } from '../services/memberService';
import { useAsync } from './useAsync';

/** All members, sorted by name: { members, loading, error, refetch }. */
export function useMembers() {
  const { data, ...rest } = useAsync(getMembers, []);
  return { members: data, ...rest };
}
