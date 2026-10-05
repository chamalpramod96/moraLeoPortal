/**
 * Error banner at the top of a form. Renders nothing when there's no message.
 * <FormError message={formError} />
 */
function FormError({ message, className = '' }) {
  if (!message) return null;
  return (
    <p className={`text-red-400 text-sm bg-red-900/20 border border-red-600/30 rounded-lg px-3 py-2 ${className}`}>
      <i className="fa-solid fa-circle-exclamation mr-2" />{message}
    </p>
  );
}

export default FormError;
