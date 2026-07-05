/**
 * Word document export — uses the `docx` package (client-side, no server).
 * Generates a full Member Profile document with all details and attendance history.
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType, VerticalAlign,
  Header, Footer, ImageRun,
} from 'docx';
import { saveAs } from 'file-saver';

// ── Color constants (hex, no #) ────────────────────────────────────────────
const RED   = 'CC0000';
const GOLD  = 'C9A84C';
const WHITE = 'F0F0F0';
const GREY  = '888888';
const BLACK = '1A1A1A';
const BG    = 'F9F5F0';

// ── Border helpers ─────────────────────────────────────────────────────────
const solidBorder = (color = GOLD, size = 6) => ({
  style: BorderStyle.SINGLE, size, color,
});
const noBorder = () => ({ style: BorderStyle.NONE, size: 0, color: 'FFFFFF' });

const tableBorders = () => ({
  top:     solidBorder(GOLD, 4),
  bottom:  solidBorder(GOLD, 4),
  left:    solidBorder(GOLD, 4),
  right:   solidBorder(GOLD, 4),
  insideH: solidBorder('DDCCAA', 2),
  insideV: solidBorder('DDCCAA', 2),
});

// ── Reusable paragraph helpers ─────────────────────────────────────────────
const centeredText = (text, opts = {}) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing:   { before: opts.before ?? 100, after: opts.after ?? 100 },
    children:  [
      new TextRun({
        text,
        size:    opts.size   ?? 22,
        color:   opts.color  ?? BLACK,
        bold:    opts.bold   ?? false,
        italics: opts.italics ?? false,
      }),
    ],
  });

const sectionHeading = (text) =>
  new Paragraph({
    spacing: { before: 300, after: 120 },
    border:  { bottom: solidBorder(GOLD, 6) },
    children: [
      new TextRun({
        text,
        bold:    true,
        size:    26,
        color:   RED,
        allCaps: true,
      }),
    ],
  });

// ── Table helpers ──────────────────────────────────────────────────────────
const headerCell = (text, widthPct = 25) =>
  new TableCell({
    shading:       { type: ShadingType.CLEAR, color: 'auto', fill: RED },
    verticalAlign: VerticalAlign.CENTER,
    width:         { size: widthPct, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing:   { before: 60, after: 60 },
        children:  [new TextRun({ text, bold: true, size: 19, color: WHITE })],
      }),
    ],
  });

const dataCell = (text, color = BLACK, bold = false, widthPct) =>
  new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    ...(widthPct ? { width: { size: widthPct, type: WidthType.PERCENTAGE } } : {}),
    children: [
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [new TextRun({ text: String(text ?? ''), size: 20, color, bold })],
      }),
    ],
  });

// ── Status color map ───────────────────────────────────────────────────────
const STATUS_COLORS = {
  attended: '006633',
  absent:   'CC0000',
  excused:  'AA7700',
};

// ── Image helpers ─────────────────────────────────────────────────────────
async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null; // CORS or network error — skip photo gracefully
  }
}

function detectImageType(url = '') {
  const u = url.toLowerCase().split('?')[0];
  if (u.endsWith('.png'))  return 'png';
  if (u.endsWith('.gif'))  return 'gif';
  if (u.endsWith('.webp')) return 'png'; // docx doesn't support webp — treat as png
  return 'jpg';
}

// ── Date formatter ─────────────────────────────────────────────────────────
function fmtDate(ts) {
  if (!ts) return 'N/A';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Event photo grid (2 columns) ──────────────────────────────────────────
function buildPhotoGrid(photos) {
  const tables = [];
  for (let i = 0; i < photos.length; i += 2) {
    const pair = photos.slice(i, i + 2);
    // Pad to 2 cells if odd
    while (pair.length < 2) pair.push(null);

    tables.push(
      new Table({
        width:   { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder(),
          insideH: noBorder(), insideV: noBorder(),
        },
        rows: [
          new TableRow({
            children: pair.map(item =>
              new TableCell({
                width:   { size: 50, type: WidthType.PERCENTAGE },
                borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
                children: item ? [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing:   { before: 80, after: 40 },
                    children:  [new ImageRun({ data: item.buffer, type: item.imgType, transformation: { width: 210, height: 145 } })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing:   { before: 0, after: 0 },
                    children:  [new TextRun({ text: item.event.title, size: 18, bold: true, color: BLACK })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing:   { before: 0, after: 140 },
                    children:  [new TextRun({ text: fmtDate(item.event.date), size: 16, color: GREY, italics: true })],
                  }),
                ] : [new Paragraph({ children: [] })],
              })
            ),
          }),
        ],
      })
    );
  }
  return tables;
}

// ─── Main export function ──────────────────────────────────────────────────
/**
 * @param {object}   member     - Firestore member document
 * @param {object[]} events     - All events array
 * @param {object[]} attendance - Member's attendance records
 */
export async function downloadMemberProfile(member, events, attendance) {
  // ── Fetch profile photo (if any) ────────────────────────────────────────
  const photoBuffer = await fetchImageBuffer(member.profilePhoto);
  const photoType   = detectImageType(member.profilePhoto);

  // ── Fetch one photo per attended event (parallel) ────────────────────────
  const attendedEventIds = [...new Set(
    attendance.filter(a => a.status === 'attended').map(a => a.eventId)
  )];
  const eventPhotoResults = await Promise.all(
    attendedEventIds.map(async (eventId) => {
      const ev = events.find(e => e.id === eventId);
      if (!ev?.photos?.length) return null;
      // Prefer 'event' type photo over sign sheet
      const photo = ev.photos.find(p => p.type === 'event') ?? ev.photos[0];
      const buffer = await fetchImageBuffer(photo.url);
      return buffer ? { event: ev, buffer, imgType: detectImageType(photo.url) } : null;
    })
  );
  const eventPhotos = eventPhotoResults.filter(Boolean);

  // ── Profile header: photo  +  name / position / ID ───────────────────────
  const profileHeaderTable = new Table({
    width:   { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder(),
      insideH: noBorder(), insideV: noBorder(),
    },
    rows: [
      new TableRow({
        children: [
          // Photo cell
          new TableCell({
            width:         { size: 20, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            borders:       { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing:   { before: 0, after: 0 },
                children: photoBuffer
                  ? [new ImageRun({ data: photoBuffer, type: photoType, transformation: { width: 100, height: 100 } })]
                  : [new TextRun({ text: member.fullName?.charAt(0)?.toUpperCase() ?? '?', size: 52, bold: true, color: RED })],
              }),
            ],
          }),
          // Name / info cell
          new TableCell({
            width:         { size: 80, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            borders:       { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
            children: [
              new Paragraph({
                spacing:  { before: 40, after: 40 },
                children: [new TextRun({ text: member.fullName || 'N/A', size: 40, bold: true, color: BLACK })],
              }),
              new Paragraph({
                spacing:  { before: 0, after: 40 },
                children: [new TextRun({ text: member.position || 'Member', size: 24, color: GOLD })],
              }),
              new Paragraph({
                spacing:  { before: 0, after: 40 },
                children: [
                  new TextRun({ text: member.memberId || '', size: 18, color: GREY }),
                  new TextRun({ text: `  ·  Term ${member.term || 'N/A'}`, size: 18, color: GREY }),
                  new TextRun({ text: `  ·  ${member.isActive ? 'Active' : 'Inactive'}`, size: 18, color: member.isActive ? '006633' : RED, bold: true }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const detailRows = [
    ['Full Name',    member.fullName  || 'N/A'],
    ['Email',        member.email     || 'N/A'],
    ['Phone',        member.phone     || 'N/A'],
    ['Position',     member.position  || 'Member'],
    ['Term',         member.term      || 'N/A'],
    ['Join Date',    fmtDate(member.joinDate)],
    ['Status',       member.isActive ? 'Active' : 'Inactive'],
  ].map(([field, value]) =>
    new TableRow({
      children: [
        new TableCell({
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F5EDDE' },
          width:   { size: 30, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              spacing: { before: 80, after: 80 },
              children: [new TextRun({ text: field, bold: true, size: 20, color: RED })],
            }),
          ],
        }),
        dataCell(value, BLACK, false, 70),
      ],
    }),
  );

  const attendanceRows = attendance.map((record, idx) => {
    const event  = events.find(e => e.id === record.eventId);
    const color  = STATUS_COLORS[record.status] ?? GREY;
    const status = record.status
      ? record.status.charAt(0).toUpperCase() + record.status.slice(1)
      : 'N/A';

    return new TableRow({
      children: [
        dataCell(String(idx + 1), GREY),
        dataCell(event?.title    ?? 'Unknown Event'),
        dataCell(fmtDate(event?.date)),
        dataCell(event?.category ?? 'N/A'),
        dataCell(status, color, true),
      ],
    });
  });

  const attended = attendance.filter(a => a.status === 'attended').length;
  const total    = attendance.length;
  const rate     = total ? Math.round((attended / total) * 100) : 0;

  const doc = new Document({
    creator:     'MoraLeo Portal',
    title:       `${member.fullName} — Member Profile`,
    description: 'Leo Club of Moratuwa Member Profile Document',
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border:    { bottom: solidBorder(GOLD, 8) },
                spacing:   { before: 0, after: 120 },
                children: [
                  new TextRun({ text: 'LEO CLUB OF MORATUWA', bold: true, size: 32, color: RED, allCaps: true }),
                  new TextRun({ text: '   |   Member Portal', size: 20, color: GOLD }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border:    { top: solidBorder(GOLD, 4) },
                spacing:   { before: 80 },
                children: [
                  new TextRun({
                    text:    `Generated by MoraLeo Portal  ·  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  ·  Confidential`,
                    size:    16,
                    color:   GREY,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ── Profile header: photo + name/info ──
          profileHeaderTable,
          new Paragraph({ spacing: { before: 0, after: 200 }, children: [] }),

          // ── Member Details ──
          sectionHeading('Member Details'),
          new Table({
            width:   { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders(),
            rows:    detailRows,
          }),

          // ── Attendance History ──
          sectionHeading('Attendance History'),

          ...(attendance.length === 0
            ? [
                new Paragraph({
                  spacing:  { before: 120, after: 120 },
                  children: [new TextRun({ text: 'No attendance records found.', size: 20, color: GREY, italics: true })],
                }),
              ]
            : [
                new Table({
                  width:   { size: 100, type: WidthType.PERCENTAGE },
                  borders: tableBorders(),
                  rows: [
                    new TableRow({
                      tableHeader: true,
                      children: [
                        headerCell('#', 6),
                        headerCell('Event Name', 38),
                        headerCell('Date', 20),
                        headerCell('Category', 18),
                        headerCell('Status', 18),
                      ],
                    }),
                    ...attendanceRows,
                  ],
                }),
              ]
          ),

          // ── Summary line ──
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing:   { before: 160, after: 0 },
            children:  [
              new TextRun({
                text:  `Total: ${total}  |  Attended: ${attended}  |  Attendance Rate: ${rate}%`,
                size:  18,
                color: GREY,
                bold:  true,
              }),
            ],
          }),

          // ── Event Photos ──
          ...(eventPhotos.length > 0 ? [
            sectionHeading('Event Photos'),
            new Paragraph({
              spacing:  { before: 40, after: 120 },
              children: [new TextRun({ text: `Photos from ${eventPhotos.length} event${eventPhotos.length > 1 ? 's' : ''} attended by this member.`, size: 18, color: GREY, italics: true })],
            }),
            ...buildPhotoGrid(eventPhotos),
          ] : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${(member.fullName || 'Member').replace(/\s+/g, '_')}_Profile_${new Date().getFullYear()}.docx`;
  saveAs(blob, filename);
}
