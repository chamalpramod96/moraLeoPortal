import { useState } from 'react';
import { safeHttpsUrl } from '../../utils/helpers';
import { formatTime, isNoticeToday } from '../../domain/notices';

const LONG_TEXT = 280;   // longer descriptions start folded

const formatNoticeDate = (ts) => {
  const d = ts?.toDate ? ts.toDate() : null;
  return d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : '';
};

/**
 * One notice: the invitation card (click for full size) and the details.
 * `past` dims it a little (it's in "Earlier notices").
 */
function NoticeCard({ notice: n, past = false, isAdmin, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const img   = safeHttpsUrl(n.imageUrl);
  const link  = safeHttpsUrl(n.link);
  const today = isNoticeToday(n);
  const long  = (n.description ?? '').length > LONG_TEXT;

  return (
    <div className={`card rounded-xl p-4 flex flex-col sm:flex-row gap-4 ${past ? 'opacity-75' : ''}`}>
      {img && (
        <a href={img} target="_blank" rel="noopener noreferrer" title="View full invitation card"
           className="relative w-full max-w-xs mx-auto sm:mx-0 sm:w-44 aspect-[4/5] flex-shrink-0 self-start
                      rounded-lg overflow-hidden bg-black/30 border border-subtle">
          <img src={img} alt={`${n.title} invitation card`}
               className="absolute inset-0 w-full h-full object-contain hover:opacity-90 transition-opacity" />
        </a>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {today && (
              <span className="inline-block mb-1 text-[10px] font-semibold uppercase tracking-wide
                               text-portal-bg bg-portal-gold rounded px-1.5 py-0.5">Today</span>
            )}
            <h3 className="text-portal-text font-semibold text-lg leading-snug break-words">{n.title}</h3>
          </div>
          {isAdmin && (
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => onEdit(n)} title="Edit notice"
                className="text-portal-muted hover:text-portal-gold transition-colors p-1.5">
                <i className="fa-solid fa-pen-to-square" />
              </button>
              <button onClick={() => onDelete(n)} title="Delete notice"
                className="text-portal-muted hover:text-red-400 transition-colors p-1.5">
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-2 space-y-1 text-sm text-portal-muted">
          <p><i className="fa-solid fa-calendar w-5 text-portal-gold" />{formatNoticeDate(n.date)}</p>
          {n.time && <p><i className="fa-solid fa-clock w-5 text-portal-gold" />{formatTime(n.time)}</p>}
          {n.place && <p className="break-words"><i className="fa-solid fa-location-dot w-5 text-portal-gold" />{n.place}</p>}
        </div>

        {n.description && (
          <div className="mt-3">
            <p className={`text-sm text-portal-text/90 whitespace-pre-line break-words leading-relaxed
                           ${long && !expanded ? 'line-clamp-5' : ''}`}>
              {n.description}
            </p>
            {long && (
              <button onClick={() => setExpanded(e => !e)}
                className="mt-1 text-xs text-portal-gold hover:text-portal-gold-light">
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
                       border border-portal-gold/50 text-portal-gold hover:bg-portal-gold/10 transition-colors">
            <i className="fa-solid fa-arrow-up-right-from-square" /> Open link
          </a>
        )}
      </div>
    </div>
  );
}

export default NoticeCard;
