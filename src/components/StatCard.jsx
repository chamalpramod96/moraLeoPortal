/** A big number with a label under it. */
function StatCard({ value, label, color = 'text-portal-gold', size = 'text-3xl' }) {
  return (
    <div className="card rounded-xl p-4 text-center">
      <div className={`${size} font-bold ${color}`}>{value}</div>
      <div className="text-portal-muted text-xs mt-1">{label}</div>
    </div>
  );
}

export default StatCard;
