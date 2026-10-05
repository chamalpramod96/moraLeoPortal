/**
 * Bulk member import from a CSV file (Members → Add CSV File). Pure
 * functions, no Firebase — covered by memberImport.test.js.
 *
 * The file needs a header row with a name, ID and email column; phone and
 * position are optional. Header names are matched loosely ("First Name" /
 * "Name" / "Full Name", "ID" / "Member ID", …).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COLUMNS = {
  name:     ['first name', 'name', 'full name', 'fullname', 'member name'],
  memberId: ['id', 'member id', 'memberid', 'member no', 'membership id'],
  email:    ['email', 'e-mail', 'email address', 'mail'],
  phone:    ['phone', 'mobile', 'phone number', 'contact'],
  position: ['position', 'designation'],
};

/** Splits CSV text into rows of cells (handles quotes, BOM and CRLF). */
export function parseCsv(text) {
  const src = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;   // drop Excel's BOM
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

const cleanSpaces = (s = '') => s.replace(/\s+/g, ' ').trim();

/** "Akila Perera" → "Leo Akila Perera" (no double "Leo"). */
export const leoName = (name) => {
  const n = cleanSpaces(name);
  if (!n) return '';
  return /^leo\s/i.test(n) ? n : `Leo ${n}`;
};

/**
 * CSV text → { rows, error }. Each row: { line, fullName, memberId, email,
 * phone, position } with names prefixed "Leo " and emails lowercased.
 * `line` is the row's line number in the file (header = line 1).
 */
export function readImportFile(text) {
  const [header, ...body] = parseCsv(text);
  if (!header) return { rows: [], error: 'The file is empty.' };

  const heads = header.map(h => cleanSpaces(h).toLowerCase());
  const col = Object.fromEntries(
    Object.entries(COLUMNS).map(([key, names]) => [key, heads.findIndex(h => names.includes(h))]),
  );
  if (col.name < 0 || col.memberId < 0 || col.email < 0) {
    return { rows: [], error: 'The file needs a header row with Name, ID and Email columns.' };
  }

  const get = (cells, key) => (col[key] >= 0 ? cleanSpaces(cells[col[key]] ?? '') : '');
  const rows = body.map((cells, i) => ({
    line:     i + 2,
    fullName: leoName(get(cells, 'name')),
    memberId: get(cells, 'memberId'),
    email:    get(cells, 'email').toLowerCase(),
    phone:    get(cells, 'phone'),
    position: get(cells, 'position'),
  }));
  return { rows, error: rows.length ? null : 'The file has no member rows.' };
}

/**
 * Decides what happens to each row, given the members already in the
 * system. Adds `status` and `reason`:
 *   'new'     — will be added
 *   'exists'  — ID or email already in the system: skipped
 *   'invalid' — missing/bad data or repeated in the file: skipped
 */
export function planImport(rows, existingMembers) {
  const takenIds    = new Set(existingMembers.map(m => (m.memberId ?? '').trim().toLowerCase()).filter(Boolean));
  const takenEmails = new Set(existingMembers.map(m => (m.email ?? '').trim().toLowerCase()));
  const seenIds = new Map(), seenEmails = new Map();

  return rows.map(r => {
    const id = r.memberId.toLowerCase();
    let status = 'new', reason = '';

    if (!r.fullName)                       { status = 'invalid'; reason = 'Name missing'; }
    else if (!r.memberId)                  { status = 'invalid'; reason = 'ID missing'; }
    else if (!r.email)                     { status = 'invalid'; reason = 'Email missing'; }
    else if (!EMAIL_RE.test(r.email))      { status = 'invalid'; reason = 'Invalid email'; }
    else if (takenIds.has(id))             { status = 'exists';  reason = 'ID already in the system'; }
    else if (takenEmails.has(r.email))     { status = 'exists';  reason = 'Email already in the system'; }
    else if (seenIds.has(id))              { status = 'invalid'; reason = `Same ID as line ${seenIds.get(id)}`; }
    else if (seenEmails.has(r.email))      { status = 'invalid'; reason = `Same email as line ${seenEmails.get(r.email)}`; }

    if (r.memberId && !seenIds.has(id)) seenIds.set(id, r.line);
    if (r.email && !seenEmails.has(r.email)) seenEmails.set(r.email, r.line);
    return { ...r, status, reason };
  });
}
