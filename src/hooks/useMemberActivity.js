import { useCallback, useEffect, useMemo } from 'react';
import { getEvents, getMemberAttendance } from '../services/eventService';
import { getMemberManualPoints } from '../services/pointsService';
import { getProjects } from '../services/projectService';
import { computeMemberPoints } from '../domain/points';
import { memberKey } from '../utils/helpers';
import { useToast } from '../context/ToastContext';
import { useAsync } from './useAsync';

const EMPTY = { events: [], attendance: [], manualPoints: [], projects: [], key: null };

/**
 * Everything one member's points and attendance are worked out from — used
 * by the Dashboard, Profile and Points Table so they always agree.
 *
 * Returns { events, attendance, manualPoints, projects, key, points, loading }
 * where points = { eventPoints, projectPoints, manualPoints, total } (the
 * same total the Leaderboard uses).
 */
export function useMemberActivity(email) {
  const { showToast } = useToast();

  // Keyed on email only, so e.g. a profile-photo change doesn't refetch
  const fetchActivity = useCallback(async () => {
    if (!email) return EMPTY;
    const [events, attendance, manualPoints, projects, key] = await Promise.all([
      getEvents(),
      getMemberAttendance(email),
      getMemberManualPoints(email),
      getProjects(),
      memberKey(email),
    ]);
    return { events, attendance, manualPoints, projects, key };
  }, [email]);

  const { data, loading, error } = useAsync(fetchActivity, EMPTY);

  useEffect(() => {
    if (error) showToast('Could not load your points and attendance. Check your connection and refresh.', 'error');
  }, [error, showToast]);

  const points = useMemo(
    () => computeMemberPoints(email ?? '', data.attendance, data.events, data.manualPoints, data.projects, data.key),
    [email, data],
  );

  return { ...data, points, loading };
}
