/**
 * Event types — the "Category" tag on an event (separate from its points
 * category). Events created before the current list may still carry an older
 * type (Fellowship, Official, Other); it keeps displaying with a neutral tag.
 */
export const EVENT_TYPES = [
  'Fundraising', 'Service', 'International', 'Online',
  'Meeting', 'Other Club Event', 'District Event', 'Multiple District Event',
];

const STYLES = {
  Fundraising:               'bg-emerald-900/40 text-emerald-400 border-emerald-600/30',
  Service:                   'bg-blue-900/40 text-blue-400 border-blue-600/30',
  International:             'bg-purple-900/40 text-purple-400 border-purple-600/30',
  Online:                    'bg-sky-900/40 text-sky-400 border-sky-600/30',
  Meeting:                   'bg-amber-900/40 text-amber-400 border-amber-600/30',
  'Other Club Event':        'bg-teal-900/40 text-teal-400 border-teal-600/30',
  'District Event':          'bg-rose-900/40 text-rose-400 border-rose-600/30',
  'Multiple District Event': 'bg-indigo-900/40 text-indigo-300 border-indigo-500/30',
};
const OLDER_TYPE = 'bg-gray-800 text-gray-400 border-gray-600/30';

/** Colour classes for an event type tag (use with `border`). */
export const eventTypeStyle = (type) => STYLES[type] ?? OLDER_TYPE;
