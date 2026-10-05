/** Full-screen notice when the app can't reach Firebase (offline, weak signal). */
function ConnectionError() {
  return (
    <div className="min-h-screen bg-portal-bg flex items-center justify-center p-4">
      <div className="card-gold rounded-xl p-8 max-w-sm w-full text-center">
        <i className="fa-solid fa-wifi text-3xl text-portal-gold mb-4" />
        <h2 className="text-lg font-semibold text-portal-text">Can't connect</h2>
        <p className="text-portal-muted text-sm mt-2">
          MoraConnect couldn't reach the server. Check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 w-full bg-portal-red hover:bg-portal-red-dark text-white font-semibold
                     py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-rotate-right" /> Try again
        </button>
      </div>
    </div>
  );
}

export default ConnectionError;
