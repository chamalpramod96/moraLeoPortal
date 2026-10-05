/**
 * Event types — the "Category" tag on an event (separate from its points
 * category). Events created before the current list may still carry an older
 * type (Fellowship, Official, Other); it keeps displaying with a neutral tag.
 */
export const EVENT_TYPES = ['Fundraising', 'Service', 'International', 'Online'];

const STYLES = {
  Fundraising:   'bg-emerald-900/40 text-emerald-400 border-emerald-600/30',
  Service:       'bg-blue-900/40 text-blue-400 border-blue-600/30',
  International: 'bg-purple-900/40 text-purple-400 border-purple-600/30',
  Online:        'bg-sky-900/40 text-sky-400 border-sky-600/30',
};
const OLDER_TYPE = 'bg-gray-800 text-gray-400 border-gray-600/30';

/** Colour classes for an event type tag (use with `border`). */
export const eventTypeStyle = (type) => STYLES[type] ?? OLDER_TYPE;
