/**
 * Spinner component.
 * fullScreen={true}  → centered overlay over the whole viewport
 * size: 'sm' | 'md' | 'lg'
 */
function LoadingSpinner({ fullScreen = false, size = 'md', label = 'Loading…' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-9 h-9', lg: 'w-14 h-14' };

  const spinner = (
    <div
      className={`${sizes[size] ?? sizes.md} border-2
                  border-portal-gold/20 border-t-portal-gold
                  rounded-full animate-spin`}
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-portal-bg flex flex-col items-center justify-center z-50 gap-4">
        {spinner}
        <span className="text-portal-muted text-sm">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      {spinner}
      <span className="text-portal-muted text-xs">{label}</span>
    </div>
  );
}

/**
 * Small spinner for inside buttons and overlays.
 * <InlineSpinner />  ·  <InlineSpinner size="w-4 h-4" gold />
 */
export function InlineSpinner({ size = 'w-3.5 h-3.5', gold = false }) {
  const colors = gold ? 'border-portal-gold/30 border-t-portal-gold' : 'border-white/30 border-t-white';
  return <div className={`${size} border-2 ${colors} rounded-full animate-spin`} />;
}

export default LoadingSpinner;
