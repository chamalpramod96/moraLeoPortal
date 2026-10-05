import { getEvents } from '../services/eventService';
import { useAsync } from './useAsync';

/** All events, newest first: { events, loading, error, refetch }. */
export function useEvents() {
  const { data, ...rest } = useAsync(getEvents, []);
  return { events: data, ...rest };
}
