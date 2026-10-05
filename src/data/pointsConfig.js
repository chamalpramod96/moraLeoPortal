/**
 * Mora Miglioria — Points System Configuration
 * Leo Club of Moratuwa | Membership Management & Development System
 */

// ─── Level Thresholds (ascending total points) ────────────────────────────────
// `unlock` is the title shown next to a level — only the top three have one.
export const LEVELS = [
  { level: 0,  minPoints: 0,       label: 'Prospect', color: 'text-gray-400',        bg: 'bg-gray-700/30',        border: 'border-gray-600/30',   unlock: ''           },
  { level: 1,  minPoints: 1000,    label: 'Level 01', color: 'text-yellow-400',       bg: 'bg-yellow-900/30',      border: 'border-yellow-600/30', unlock: ''           },
  { level: 2,  minPoints: 2000,    label: 'Level 02', color: 'text-yellow-300',       bg: 'bg-yellow-900/30',      border: 'border-yellow-500/30', unlock: ''           },
  { level: 3,  minPoints: 4000,    label: 'Level 03', color: 'text-blue-400',         bg: 'bg-blue-900/30',        border: 'border-blue-600/30',   unlock: ''           },
  { level: 4,  minPoints: 7000,    label: 'Level 04', color: 'text-blue-300',         bg: 'bg-blue-900/30',        border: 'border-blue-500/30',   unlock: ''           },
  { level: 5,  minPoints: 10000,   label: 'Level 05', color: 'text-purple-400',       bg: 'bg-purple-900/30',      border: 'border-purple-600/30', unlock: ''           },
  { level: 6,  minPoints: 15000,   label: 'Level 06', color: 'text-purple-300',       bg: 'bg-purple-900/30',      border: 'border-purple-500/30', unlock: ''           },
  { level: 7,  minPoints: 20000,   label: 'Level 07', color: 'text-portal-red',       bg: 'bg-portal-red/20',      border: 'border-portal-red/30', unlock: ''           },
  { level: 8,  minPoints: 30000,   label: 'Level 08', color: 'text-orange-400',       bg: 'bg-orange-900/30',      border: 'border-orange-600/30', unlock: 'Leo Star'   },
  { level: 9,  minPoints: 50000,   label: 'Level 09', color: 'text-portal-gold',      bg: 'bg-portal-gold/20',     border: 'border-portal-gold/30',unlock: 'Leo Master' },
  { level: 10, minPoints: 100000,  label: 'Level 10', color: 'text-portal-gold-light',bg: 'bg-portal-gold/30',     border: 'border-portal-gold/50',unlock: 'Leo Legend' },
];

/**
 * Returns { current, next, progressPct } for a given total points value.
 */
export function getLevelInfo(totalPoints) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalPoints >= lvl.minPoints) current = lvl;
    else break;
  }
  const nextIdx = LEVELS.indexOf(current) + 1;
  const next    = LEVELS[nextIdx] ?? null;
  const progressPct = next
    ? Math.min(100, Math.round(((totalPoints - current.minPoints) / (next.minPoints - current.minPoints)) * 100))
    : 100;
  return { current, next, progressPct };
}

// ─── Event Point Categories (Participation) ───────────────────────────────────
// These are assigned per event. Attendance earns these points.
// • hybrid: members are marked Physical ('attended', `points`) or Online
//   ('attended_online', `onlinePoints`).
// • retired: no longer offered for new events, but kept so past events that
//   used them still show their name (their points are stored on the event).
export const EVENT_POINT_CATEGORIES = [
  // Club Meetings
  { id: 'club_meeting_physical',      label: 'Club Meeting – Physical',                  group: 'Club Meetings',              points: 100 },
  { id: 'club_meeting_online',        label: 'Club Meeting – Online',                    group: 'Club Meetings',              points: 50  },
  { id: 'club_meeting_hybrid',        label: 'Club Meeting – Hybrid',                    group: 'Club Meetings',              points: 100, onlinePoints: 50, hybrid: true },
  // Club Projects
  { id: 'club_project_fundraising',   label: 'Club Project – Fundraising',               group: 'Club Projects',              points: 30  },
  { id: 'club_project_service',       label: 'Club Project – Service',                   group: 'Club Projects',              points: 25  },
  { id: 'club_project_international', label: 'Club Project – International',             group: 'Club Projects',              points: 15  },
  { id: 'club_project_online',        label: 'Club Project – Online',                    group: 'Club Projects',              points: 10  },
  // Other Club Projects
  { id: 'other_intra_physical',       label: 'Other Club – Intra District (Physical)',   group: 'Other Club Projects/Events', points: 50  },
  { id: 'other_intra_online',         label: 'Other Club – Intra District (Online)',     group: 'Other Club Projects/Events', points: 25  },
  { id: 'other_inter_physical',       label: 'Other Club – Inter District (Physical)',   group: 'Other Club Projects/Events', points: 60  },
  { id: 'other_inter_online',         label: 'Other Club – Inter District (Online)',     group: 'Other Club Projects/Events', points: 30  },
  { id: 'other_international',        label: 'Other Club – International',               group: 'Other Club Projects/Events', points: 50  },
  // District
  { id: 'district_meeting_physical',  label: 'District Meeting (Physical)',               group: 'District',                   points: 200 },
  { id: 'district_meeting_online',    label: 'District Meeting (Online)',                 group: 'District',                   points: 100 },
  { id: 'district_event_physical',    label: 'District Event (Physical)',                 group: 'District',                   points: 250 },
  { id: 'district_event_online',      label: 'District Event (Online)',                   group: 'District',                   points: 100 },
  { id: 'district_camp',              label: 'District Camp',                             group: 'District',                   points: 400 },
  { id: 'district_conference',        label: 'District Conference',                       group: 'District',                   points: 500 },
  // Multiple District
  { id: 'md_meeting_physical',        label: 'Multiple District Meeting (Physical)',      group: 'Multiple District',          points: 250 },
  { id: 'md_meeting_online',          label: 'Multiple District Meeting (Online)',        group: 'Multiple District',          points: 100 },
  { id: 'md_event_physical',          label: 'Multiple District Event (Physical)',        group: 'Multiple District',          points: 300 },
  { id: 'md_event_online',            label: 'Multiple District Event (Online)',          group: 'Multiple District',          points: 100 },
  { id: 'md_conference',              label: 'Multiple District Conference',              group: 'Multiple District',          points: 500 },
  // Retired (hidden from new events)
  { id: 'club_meeting_board',         label: 'Board Meeting',                            group: 'Club Meetings',              points: 50, retired: true },
  { id: 'club_project_fellowship',    label: 'Club Project – Fellowship / Events',       group: 'Club Projects',              points: 20, retired: true },
];

/** Categories offered for new events and shown in the Points Table. */
export const ACTIVE_EVENT_POINT_CATEGORIES = EVENT_POINT_CATEGORIES.filter(c => !c.retired);

// ─── Attendance statuses ──────────────────────────────────────────────────────
// 'attended' = present (physical, for hybrid meetings); 'attended_online' =
// joined a hybrid meeting online. Both count as attending.
export const isAttended = (status) => status === 'attended' || status === 'attended_online';

/** True if the event's points category is a hybrid meeting. */
export const isHybridEvent = (event) => !!getEventCategory(event?.pointsCategory)?.hybrid;

// ─── Project roles (Projects page) ────────────────────────────────────────────
// Assigning a member to a role on a club project adds these points to their
// total automatically. Values match Club – Project Chairman / Secretary /
// Treasurer below; each project stores the values it was created with.
export const PROJECT_ROLES = [
  { id: 'chairperson', label: 'Chairperson', points: 250 },
  { id: 'secretary',   label: 'Secretary',   points: 150 },
  { id: 'treasurer',   label: 'Treasurer',   points: 150 },
];

// ─── Manual Point Categories (Involvements, Achievements, Growth) ─────────────
export const MANUAL_POINT_CATEGORIES = [
  // Club Involvements
  { id: 'inv_club_chairman',          label: 'Club – Project Chairman',                  group: 'Club Involvements',          points: 250  },
  { id: 'inv_club_sec',               label: 'Club – Project Secretary / Treasurer',     group: 'Club Involvements',          points: 150  },
  { id: 'inv_club_committee',         label: 'Club – Project Committee',                 group: 'Club Involvements',          points: 100  },
  // Other Club Involvements
  { id: 'inv_other_chairman',         label: 'Other Club – Project Chairman',            group: 'Other Club Involvements',    points: 400  },
  { id: 'inv_other_sec',              label: 'Other Club – Project Secretary / Treasurer', group: 'Other Club Involvements',  points: 250  },
  { id: 'inv_other_committee',        label: 'Other Club – Project Committee',           group: 'Other Club Involvements',    points: 200  },
  // International Involvements
  { id: 'inv_intl_chairman',          label: 'International – Project Chairman',         group: 'International Involvements', points: 400  },
  { id: 'inv_intl_sec',               label: 'International – Project Secretary / Treasurer', group: 'International Involvements', points: 250 },
  { id: 'inv_intl_committee',         label: 'International – Project Committee',        group: 'International Involvements', points: 200  },
  // District Involvements
  { id: 'inv_district_chairman',      label: 'District – Project Chairman',              group: 'District Involvements',      points: 500  },
  { id: 'inv_district_sec',           label: 'District – Project Secretary / Treasurer', group: 'District Involvements',      points: 300  },
  { id: 'inv_district_committee',     label: 'District – Project Committee',             group: 'District Involvements',      points: 200  },
  { id: 'inv_district_exco',          label: 'District Exco Member',                     group: 'District Involvements',      points: 1000 },
  { id: 'inv_district_council',       label: 'District Council Member',                  group: 'District Involvements',      points: 500  },
  // Multiple District Involvements
  { id: 'inv_md_chairman',            label: 'Multiple District – Project Chairman',     group: 'Multiple District Involvements', points: 1000 },
  { id: 'inv_md_sec',                 label: 'Multiple District – Project Secretary / Treasurer', group: 'Multiple District Involvements', points: 750 },
  { id: 'inv_md_committee',           label: 'Multiple District – Project Committee',    group: 'Multiple District Involvements', points: 500 },
  { id: 'inv_md_exco',                label: 'Multiple Exco Member',                     group: 'Multiple District Involvements', points: 1500 },
  { id: 'inv_md_council',             label: 'Multiple Council Member',                  group: 'Multiple District Involvements', points: 1000 },
  // Achievements – Club Level
  { id: 'ach_star_leo_q1',            label: 'Star Leo – 1st Quarter',                   group: 'Club Achievements',          points: 500  },
  { id: 'ach_star_leo_q2',            label: 'Star Leo – 2nd Quarter',                   group: 'Club Achievements',          points: 500  },
  { id: 'ach_star_leo_q3',            label: 'Star Leo – 3rd Quarter',                   group: 'Club Achievements',          points: 500  },
  { id: 'ach_best_board',             label: 'Best 5 Board Members Award',               group: 'Club Achievements',          points: 250  },
  { id: 'ach_best_10_members',        label: 'Best 10 Members Award',                    group: 'Club Achievements',          points: 200  },
  { id: 'ach_project_chairman',       label: 'Best Project – Project Chairman',          group: 'Club Achievements',          points: 250  },
  { id: 'ach_project_sec',            label: 'Best Project – Secretary / Treasurer',     group: 'Club Achievements',          points: 150  },
  { id: 'ach_project_committee',      label: 'Best Project – Committee',                 group: 'Club Achievements',          points: 100  },
  { id: 'ach_other_club_award',       label: 'Other Club / Intra / Inter / International Award', group: 'Club Achievements', points: 250  },
  // Achievements – District Level
  { id: 'ach_dist_conf_exco',         label: 'District Conference – Individual (Club Exco)', group: 'District Achievements',  points: 500  },
  { id: 'ach_dist_conf_other',        label: 'District Conference – Individual (Others)',    group: 'District Achievements',  points: 400  },
  { id: 'ach_dist_conf_project',      label: 'District Conference – Project Award',         group: 'District Achievements',  points: 250  },
  { id: 'ach_dist_conf_club',         label: 'District Conference – Club Award',            group: 'District Achievements',  points: 400  },
  { id: 'ach_dist_camp_individual',   label: 'District Camp – Individual Award',            group: 'District Achievements',  points: 500  },
  { id: 'ach_dist_camp_team',         label: 'District Camp – Team Award',                  group: 'District Achievements',  points: 300  },
  { id: 'ach_dist_event',             label: 'District Event / Competition Award',          group: 'District Achievements',  points: 250  },
  // Achievements – Multiple District
  { id: 'ach_md_conf_exco',           label: 'Multiple District Conference – Individual (Club Exco)', group: 'Multiple District Achievements', points: 750 },
  { id: 'ach_md_conf_other',          label: 'Multiple District Conference – Individual (Others)',    group: 'Multiple District Achievements', points: 500 },
  { id: 'ach_md_conf_project',        label: 'Multiple District Conference – Project Award',         group: 'Multiple District Achievements', points: 400 },
  { id: 'ach_md_conf_club',           label: 'Multiple District Conference – Club Award',            group: 'Multiple District Achievements', points: 500 },
  { id: 'ach_leo_olympic',            label: 'Leo Olympic Award',                                    group: 'Multiple District Achievements', points: 500 },
  { id: 'ach_md_event',               label: 'Multiple District Event / Competition Award',          group: 'Multiple District Achievements', points: 250 },
  // Membership Growth
  { id: 'growth_1',                   label: 'Membership Growth – 1 New Member',          group: 'Membership Growth',          points: 50   },
  { id: 'growth_2',                   label: 'Membership Growth – 2 New Members',         group: 'Membership Growth',          points: 150  },
  { id: 'growth_3',                   label: 'Membership Growth – 3 New Members',         group: 'Membership Growth',          points: 300  },
  { id: 'growth_4',                   label: 'Membership Growth – 4 New Members',         group: 'Membership Growth',          points: 500  },
  { id: 'growth_5',                   label: 'Membership Growth – 5 New Members',         group: 'Membership Growth',          points: 1000 },
  { id: 'growth_extra',               label: 'Membership Growth – Each Additional Member',group: 'Membership Growth',          points: 250  },
  // Newsletter
  { id: 'newsletter_article',         label: 'Newsletter Article',                        group: 'Newsletter',                 points: 100  },
  // Manual / Other
  { id: 'manual',                     label: 'Manual Adjustment',                         group: 'Other',                      points: 0    },
];

// ─── Yearly Evaluation Criteria ───────────────────────────────────────────────
export const EVALUATION_CRITERIA = [
  'Leo Knowledge', 'Problem Solving', 'Commitment', 'Communication',
  'Team Work', 'Punctuality', 'Compliance', 'Appearance', 'Professionalism', 'Efficiency',
];

export const EVALUATION_RATINGS = [
  { range: '1 – 20',   label: 'Unsatisfactory',    color: 'text-red-500' },
  { range: '21 – 40',  label: 'Need Improvement',  color: 'text-orange-400' },
  { range: '41 – 60',  label: 'Satisfactory',       color: 'text-yellow-400' },
  { range: '61 – 80',  label: 'Above Satisfactory', color: 'text-blue-400' },
  { range: '81 – 100', label: 'Superior',            color: 'text-green-400' },
];

// ─── Helper: look up event category metadata ──────────────────────────────────
export function getEventCategory(id) {
  return EVENT_POINT_CATEGORIES.find(c => c.id === id) ?? null;
}

export function getManualCategory(id) {
  return MANUAL_POINT_CATEGORIES.find(c => c.id === id) ?? null;
}

// ─── Group EVENT categories for dropdown <optgroup> ──────────────────────────
// Retired categories are left out, except `keepId` (the category an event
// being edited already uses), so its current value still shows.
export function groupedEventCategories(keepId) {
  const groups = {};
  for (const cat of EVENT_POINT_CATEGORIES.filter(c => !c.retired || c.id === keepId)) {
    if (!groups[cat.group]) groups[cat.group] = [];
    groups[cat.group].push(cat);
  }
  return groups;
}

export function groupedManualCategories() {
  const groups = {};
  for (const cat of MANUAL_POINT_CATEGORIES) {
    if (!groups[cat.group]) groups[cat.group] = [];
    groups[cat.group].push(cat);
  }
  return groups;
}
