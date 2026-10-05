import { describe, it, expect } from 'vitest';
import { parseCsv, leoName, readImportFile, planImport } from './memberImport';

describe('parseCsv', () => {
  it('handles a BOM, CRLF, quoted commas, escaped quotes and blank lines', () => {
    const text = String.fromCharCode(0xFEFF) + 'Name,ID\r\n"Perera, Amal",1\r\n\r\n"Say ""hi""",2\r\n';
    expect(parseCsv(text)).toEqual([['Name', 'ID'], ['Perera, Amal', '1'], ['Say "hi"', '2']]);
  });
});

describe('leoName', () => {
  it('adds "Leo " once and tidies spaces', () => {
    expect(leoName(' Amal   Perera ')).toBe('Leo Amal Perera');
    expect(leoName('Leo Amal Perera')).toBe('Leo Amal Perera');
    expect(leoName('leo amal')).toBe('leo amal');
    expect(leoName('Leon Silva')).toBe('Leo Leon Silva');
    expect(leoName('')).toBe('');
  });
});

describe('readImportFile', () => {
  it('reads the club sheet format (First Name, ID, Email)', () => {
    const { rows, error } = readImportFile(
      'First Name,ID,Email\r\nAmal Perera ,1001,Amal@Example.com\r\nLeo Nimali  Silva,1002,nimali@example.com\r\n',
    );
    expect(error).toBeNull();
    expect(rows).toEqual([
      { line: 2, fullName: 'Leo Amal Perera',  memberId: '1001', email: 'amal@example.com',   phone: '', position: '' },
      { line: 3, fullName: 'Leo Nimali Silva', memberId: '1002', email: 'nimali@example.com', phone: '', position: '' },
    ]);
  });

  it('accepts other header names and optional columns, in any order', () => {
    const { rows } = readImportFile('Email,Full Name,Member ID,Mobile,Position\nkasun@example.com,Kasun,77,0771234567,Treasurer\n');
    expect(rows[0]).toMatchObject({
      fullName: 'Leo Kasun', memberId: '77', email: 'kasun@example.com', phone: '0771234567', position: 'Treasurer',
    });
  });

  it('explains a file without the needed columns', () => {
    expect(readImportFile('Name,Phone\nAmal,077\n').error).toMatch(/Name, ID and Email/);
    expect(readImportFile('').error).toBe('The file is empty.');
    expect(readImportFile('Name,ID,Email\n').error).toBe('The file has no member rows.');
  });
});

describe('planImport', () => {
  const existing = [
    { email: 'old@example.com', memberId: '1001' },
    { email: 'admin@example.com', memberId: '' },
  ];
  const row = (line, fullName, memberId, email) => ({ line, fullName, memberId, email, phone: '', position: '' });

  it('marks new rows, skips IDs/emails already in the system and bad or repeated rows', () => {
    const plan = planImport([
      row(2, 'Leo A', '2001', 'a@example.com'),
      row(3, 'Leo B', '1001', 'b@example.com'),       // ID exists
      row(4, 'Leo C', '2003', 'admin@example.com'),   // email exists
      row(5, 'Leo D', '2001', 'd@example.com'),       // same ID as line 2
      row(6, 'Leo E', '2006', 'a@example.com'),       // same email as line 2
      row(7, 'Leo F', '2007', 'not-an-email'),
      row(8, '',      '2008', 'g@example.com'),
      row(9, 'Leo H', '',     'h@example.com'),
    ], existing);
    expect(plan.map(p => [p.line, p.status, p.reason])).toEqual([
      [2, 'new',     ''],
      [3, 'exists',  'ID already in the system'],
      [4, 'exists',  'Email already in the system'],
      [5, 'invalid', 'Same ID as line 2'],
      [6, 'invalid', 'Same email as line 2'],
      [7, 'invalid', 'Invalid email'],
      [8, 'invalid', 'Name missing'],
      [9, 'invalid', 'ID missing'],
    ]);
  });

  it('matches existing IDs ignoring case and spaces', () => {
    const plan = planImport([row(2, 'Leo A', 'abc12', 'a@example.com')], [{ email: 'x@example.com', memberId: ' ABC12 ' }]);
    expect(plan[0].status).toBe('exists');
  });
});
