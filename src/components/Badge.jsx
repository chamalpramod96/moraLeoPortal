const STYLES = {
  // attendance
  attended:  'bg-green-900/40  text-green-400  border border-green-600/30',
  absent:    'bg-red-900/40    text-red-400    border border-red-600/30',
  excused:   'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30',
  // role
  superadmin: 'bg-red-900/40    text-red-400    border border-red-600/30',
  secretary:  'bg-portal-gold/20 text-portal-gold border border-portal-gold/30',
  president:  'bg-purple-900/40 text-purple-400 border border-purple-600/30',
  member:     'bg-blue-900/40   text-blue-400   border border-blue-600/30',
  // active
  active:    'bg-green-900/40  text-green-400  border border-green-600/30',
  inactive:  'bg-gray-800      text-gray-400   border border-gray-600/30',
  // 'not marked' fallback
  default:   'bg-gray-800      text-gray-400   border border-gray-600/20',
};

const LABELS = {
  attended:  'Attended',
  absent:    'Absent',
  excused:   'Excused',
  superadmin: 'Super Admin',
  secretary:  'Secretary',
  president:  'President',
  member:     'Member',
  active:    'Active',
  inactive:  'Inactive',
};

/**
 * <Badge status="attended" />
 * <Badge status="secretary" />
 * Accepts any string — renders a styled pill.
 */
function Badge({ status }) {
  const key   = (status ?? '').toLowerCase();
  const style = STYLES[key] ?? STYLES.default;
  const label = LABELS[key] ?? (status ? status.charAt(0).toUpperCase() + status.slice(1) : '—');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${style}`}>
      {label}
    </span>
  );
}

export default Badge;
