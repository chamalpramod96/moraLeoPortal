import { useState, useRef, useId } from 'react';
import { matchMembers } from '../domain/memberSearch';

const MAX_SUGGESTIONS = 8;

/**
 * Type-to-search member picker (replaces a long dropdown). `value` is the
 * chosen member's email, '' for none, or any other string shown with
 * `otherLabel` (e.g. a former member being kept). Suggestions open below
 * the box, in the page flow, so a modal never cuts them off.
 */
function MemberPicker({ members, value, onChange, excluded, otherLabel = '', placeholder = 'Type a name…' }) {
  const [query,  setQuery]  = useState('');
  const [open,   setOpen]   = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listId   = useId();

  const selected = members.find(m => m.email === value);
  const label    = selected?.fullName ?? (value ? otherLabel : '');
  const matches  = open ? matchMembers(members, query, excluded, MAX_SUGGESTIONS) : [];

  const choose = (m) => {
    onChange(m.email);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') {
      // Pick the highlighted member instead of submitting the form
      if (open && matches[active]) { e.preventDefault(); choose(matches[active]); }
    } else if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); setQuery(''); }
  };

  return (
    <div>
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2
                       text-portal-muted/60 text-xs pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck="false"
          value={open ? query : label}
          placeholder={label || placeholder}
          onFocus={() => { setOpen(true); setQuery(''); setActive(0); }}
          onBlur={() => { setOpen(false); setQuery(''); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          onKeyDown={handleKeyDown}
          className="w-full bg-portal-bg border border-white/5 rounded-lg pl-8 pr-8 py-2
                     text-portal-text text-sm placeholder-portal-muted/50
                     focus:outline-none focus:border-portal-gold/50"
        />
        {value && !open && (
          <button type="button" title="Clear" onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-portal-muted hover:text-red-400 p-1">
            <i className="fa-solid fa-xmark text-xs" />
          </button>
        )}
      </div>

      {open && (
        <ul id={listId} role="listbox"
            className="mt-1 max-h-52 overflow-y-auto rounded-lg border border-portal-gold/30 bg-portal-bg">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-xs text-portal-muted italic">No members match “{query}”</li>
          ) : matches.map((m, i) => (
            <li key={m.email} role="option" aria-selected={i === active}
                // mousedown (not click) so the input doesn't blur first
                onMouseDown={e => { e.preventDefault(); choose(m); }}
                onMouseEnter={() => setActive(i)}
                className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2
                            ${i === active ? 'bg-portal-gold/15 text-portal-gold' : 'text-portal-text'}`}>
              <span className="truncate">{m.fullName}</span>
              {m.memberId && <span className="text-[11px] font-mono text-portal-muted flex-shrink-0">{m.memberId}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MemberPicker;
