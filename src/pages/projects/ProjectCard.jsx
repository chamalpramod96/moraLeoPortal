import { PROJECT_ROLES }  from '../../data/pointsConfig';
import { formatDateShort, safeHttpsUrl } from '../../utils/helpers';

/**
 * One project: 4:5 poster thumbnail, name, date and its officers.
 * `myKey` (the viewer's memberKey) marks their own roles with "You".
 */
function ProjectCard({ project: p, myKey, isAdmin, onEdit, onDelete }) {
  const img = safeHttpsUrl(p.imageUrl);
  return (
    <div className="card rounded-xl p-4 flex gap-4">
      {/* 4:5 poster thumbnail — click to view full size */}
      <div className="relative w-28 sm:w-36 aspect-[4/5] flex-shrink-0 self-start rounded-lg overflow-hidden
                      bg-white/[0.03] border border-subtle">
        {img ? (
          <a href={img} target="_blank" rel="noopener noreferrer" title="View full poster">
            <img src={img} alt={p.name}
              className="absolute inset-0 w-full h-full object-cover hover:opacity-90 transition-opacity" />
          </a>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="fa-solid fa-image text-3xl text-portal-muted/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-portal-text font-semibold leading-snug break-words">{p.name}</h3>
            {p.date && <p className="text-portal-muted text-xs mt-0.5">{formatDateShort(p.date)}</p>}
          </div>
          {isAdmin && (
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => onEdit(p)} title="Edit project"
                className="text-portal-muted hover:text-portal-gold transition-colors p-1.5">
                <i className="fa-solid fa-pen-to-square" />
              </button>
              <button onClick={() => onDelete(p)} title="Delete project"
                className="text-portal-muted hover:text-red-400 transition-colors p-1.5">
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {PROJECT_ROLES.map(r => {
            const holder = p.roles?.[r.id];
            const isMe   = holder?.key && holder.key === myKey;
            return (
              <div key={r.id} className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-portal-muted">
                  {r.label}
                  {holder && (
                    <span className="ml-1.5 text-portal-gold font-semibold normal-case tracking-normal">
                      +{p.rolePoints?.[r.id] ?? r.points}
                    </span>
                  )}
                </p>
                <p className="flex items-start gap-1.5 text-sm min-w-0">
                  <span className={`break-words ${holder ? 'text-portal-text' : 'text-portal-muted/60 italic'}`}>
                    {holder?.name || '—'}
                  </span>
                  {isMe && (
                    <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide
                                     text-portal-bg bg-portal-gold rounded px-1.5 py-0.5">You</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ProjectCard;
