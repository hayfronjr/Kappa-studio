import { jsPDF } from 'jspdf';
import { Session, Roll, Member, AppState } from '../types';
import {
  countPresent,
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
  getMarkTimestamp,
  getMarkStatus,
  isMemberPresent,
} from './storage';

/**
 * Downloads a file locally to the user's device (Android downloads folder, Windows filesystem).
 * Uses File System Access API where supported (Edge/Chrome on Windows/Desktop)
 * with reliable fallback to anchor click for Android & mobile.
 */
export async function downloadFile(
  content: BlobPart,
  filename: string,
  mimeType: string
): Promise<boolean> {
  const blob = new Blob([content], { type: mimeType });

  // Try modern File System Access API if user is on Windows/Desktop Chrome/Edge
  if (
    typeof window !== 'undefined' &&
    'showSaveFilePicker' in window &&
    window.self === window.top // Avoid iframe permission issues
  ) {
    try {
      const ext = filename.split('.').pop() || 'txt';
      const handle = await (window as unknown as {
        showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: `${ext.toUpperCase()} File`,
            accept: { [mimeType]: [`.${ext}`] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return false;
      }
    }
  }

  // Universal Fallback (works seamlessly on Android, iOS, Windows, macOS, Linux)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
  return true;
}

/**
 * Escapes fields for standard CSV (RFC 4180 compliant)
 */
function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Formats date and time to match the reference format:
 * e.g. "31 Oct 2026, 12:08:12"
 */
export function formatRefDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${day}, ${time}`;
  } catch {
    return isoString;
  }
}

/**
 * Exports a single attendance session to CSV spreadsheet format.
 * Ideal for Microsoft Excel, Google Sheets, Power BI, Python/Pandas.
 */
export async function exportSessionToCSV(session: Session): Promise<boolean> {
  const presentCount = countPresent(session);
  const totalCount = session.members.length;
  const absentCount = totalCount - presentCount;
  const attendanceRate = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : '0';

  const lines: string[] = [];

  // Metadata Header Block
  lines.push(['# RollCall - Session Attendance Log'].map(escapeCSV).join(','));
  lines.push(['Session Title', session.title].map(escapeCSV).join(','));
  lines.push(['Roster Name', session.rollName].map(escapeCSV).join(','));
  lines.push(['Session Started', formatRefDateTime(session.start)].map(escapeCSV).join(','));
  lines.push([
    'Session Ended',
    session.end ? formatRefDateTime(session.end) : 'In Progress',
  ].map(escapeCSV).join(','));
  lines.push([
    'Attendance Summary',
    `Present: ${presentCount} | Absent: ${absentCount} | Total: ${totalCount} (${attendanceRate}%)`,
  ].map(escapeCSV).join(','));
  lines.push(['Location', session.location || 'N/A'].map(escapeCSV).join(','));
  lines.push(['Notes', session.notes || ''].map(escapeCSV).join(','));
  lines.push(''); // Blank row separator

  // Data Table Headers
  lines.push([
    '#',
    'Name',
    'Unit',
    'Phone',
    'Status / time',
    'Tag',
    'Attendance Note',
  ].map(escapeCSV).join(','));

  // Data Rows
  session.members.forEach((m, idx) => {
    const mark = session.marks[m.id];
    const present = isMemberPresent(session, m.id);
    const ts = getMarkTimestamp(mark);
    const markDetail = typeof mark === 'object' ? mark : undefined;

    lines.push([
      idx + 1,
      m.name,
      m.unit || '',
      m.phone || '',
      present ? (ts ? formatRefDateTime(ts) : 'Present') : 'Absent',
      m.tag || '',
      markDetail?.note || '',
    ].map(escapeCSV).join(','));
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const cleanTitle = session.title.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'attendance';
  const filename = `${cleanTitle}_Attendance_${new Date().toISOString().slice(0, 10)}.csv`;

  return downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Exports an Attendance Matrix CSV across all sessions for a specific roll.
 */
export async function exportAttendanceMatrixCSV(roll: Roll, sessions: Session[]): Promise<boolean> {
  const rollSessions = sessions.filter((s) => s.rollId === roll.id);
  rollSessions.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const lines: string[] = [];
  lines.push(['# RollCall - Multi-Session Attendance Matrix'].map(escapeCSV).join(','));
  lines.push(['Roster Name', roll.name].map(escapeCSV).join(','));
  lines.push(['Total Recorded Sessions', rollSessions.length].map(escapeCSV).join(','));
  lines.push(['Generated Date', formatRefDateTime(new Date().toISOString())].map(escapeCSV).join(','));
  lines.push('');

  // Headers
  const headers = ['#', 'Name', 'Unit', 'Phone', 'Tag'];
  rollSessions.forEach((s) => {
    headers.push(`${s.title} (${formatDateOnly(s.start)})`);
  });
  headers.push('Total Present', 'Total Sessions', 'Attendance Rate %');
  lines.push(headers.map(escapeCSV).join(','));

  // Rows for each member
  roll.members.forEach((m, idx) => {
    let presentCount = 0;
    const sessionMarks = rollSessions.map((s) => {
      const present = isMemberPresent(s, m.id);
      if (present) presentCount++;
      return present ? 'P' : 'A';
    });

    const rate =
      rollSessions.length > 0
        ? ((presentCount / rollSessions.length) * 100).toFixed(1) + '%'
        : '0%';

    const row = [
      idx + 1,
      m.name,
      m.unit || '',
      m.phone || '',
      m.tag || '',
      ...sessionMarks,
      presentCount,
      rollSessions.length,
      rate,
    ];
    lines.push(row.map(escapeCSV).join(','));
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const cleanName = roll.name.replace(/[^\w\-]+/g, '_').slice(0, 30);
  const filename = `${cleanName}_Attendance_Matrix_${new Date().toISOString().slice(0, 10)}.csv`;

  return downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Exports a detailed, human-readable text audit log file (.txt / .log)
 */
export async function exportAuditLogText(session: Session): Promise<boolean> {
  const presentCount = countPresent(session);
  const totalCount = session.members.length;
  const absentCount = totalCount - presentCount;
  const rate = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : '0';

  const divider = '='.repeat(80);
  const thinDivider = '-'.repeat(80);

  const checkedInList = session.members
    .filter((m) => isMemberPresent(session, m.id))
    .map((m) => {
      const ts = getMarkTimestamp(session.marks[m.id]);
      const status = getMarkStatus(session.marks[m.id]);
      return { member: m, timestamp: ts, status };
    })
    .sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return a.timestamp.localeCompare(b.timestamp);
    });

  const absentList = session.members.filter((m) => !isMemberPresent(session, m.id));

  const textLines: string[] = [
    divider,
    '                        ROLLCALL - ATTENDANCE AUDIT LOG                         ',
    divider,
    `Session:       ${session.title}`,
    `Roster:        ${session.rollName} (${totalCount} members total)`,
    `Session Start: ${formatRefDateTime(session.start)}`,
    `Session End:   ${session.end ? formatRefDateTime(session.end) : 'Still Open / In Progress'}`,
    `Status:        ${session.status.toUpperCase()}`,
    `Location:      ${session.location || 'Not specified'}`,
    `Summary:       ${presentCount} Present | ${absentCount} Absent | ${rate}% Turnout`,
    divider,
    '',
    `SECTION 1: CHRONOLOGICAL CHECK-IN TIMELINE (${checkedInList.length} Attendees)`,
    thinDivider,
  ];

  if (checkedInList.length === 0) {
    textLines.push('  [No attendees checked in]');
  } else {
    checkedInList.forEach((item, index) => {
      const timeStr = item.timestamp ? formatRefDateTime(item.timestamp) : '--:--:--';
      const tagStr = item.member.tag ? ` [${item.member.tag}]` : '';
      const unitStr = item.member.unit ? ` (${item.member.unit})` : '';
      const phoneStr = item.member.phone ? ` - Ph: ${item.member.phone}` : '';
      const numStr = String(index + 1).padStart(3, ' ');
      textLines.push(
        `${numStr}. [${timeStr}] ${item.status.toUpperCase().padEnd(7)} ${item.member.name}${unitStr}${tagStr}${phoneStr}`
      );
    });
  }

  textLines.push('');
  textLines.push(`SECTION 2: ABSENT MEMBERS (${absentList.length} Absent)`);
  textLines.push(thinDivider);

  if (absentList.length === 0) {
    textLines.push('  [Everyone was present! 100% attendance]');
  } else {
    absentList.forEach((m, index) => {
      const tagStr = m.tag ? ` [${m.tag}]` : '';
      const unitStr = m.unit ? ` (${m.unit})` : '';
      const phoneStr = m.phone ? ` - Ph: ${m.phone}` : '';
      const numStr = String(index + 1).padStart(3, ' ');
      textLines.push(`${numStr}. ABSENT  ${m.name}${unitStr}${tagStr}${phoneStr}`);
    });
  }

  textLines.push('');
  textLines.push(divider);
  textLines.push(`Log Generated: ${formatRefDateTime(new Date().toISOString())}`);
  textLines.push('System: RollCall Application');
  textLines.push('Sign-off Supervisor Signature: __________________________  Date: ____________');
  textLines.push(divider);

  const cleanTitle = session.title.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'attendance';
  const filename = `${cleanTitle}_AuditLog_${new Date().toISOString().slice(0, 10)}.log`;

  return downloadFile(textLines.join('\r\n'), filename, 'text/plain;charset=utf-8;');
}

/**
 * Exports a PDF that matches the exact layout, typography, colors,
 * and column structure of the reference PDF generated by the HTML version:
 * - Green bold title
 * - Roll name, Started and Finished timestamps
 * - Present, Absent, Total count summary
 * - Column widths: # (8mm), Name (56mm), Unit (38mm), Phone (44mm), Status / time (40mm)
 * - Green highlight (#e3f3ec) for present rows
 * - Page X of Y footer
 */
export async function exportSessionToPDF(session: Session): Promise<boolean> {
  const d = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = 12;
  const W = 186;

  // Streamlined 4 columns: #, Name, Affiliated Group, Status / time
  const cols: [string, number][] = [
    ['#', 10],
    ['Name', 72],
    ['Affiliated Group', 56],
    ['Status / time', 48],
  ];
  const X: number[] = [L];
  cols.forEach((c, i) => X.push(X[i] + c[1]));

  const cut = (t: string | undefined | null, w: number): string => {
    let str = String(t || '');
    if (d.getTextWidth(str) <= w - 3) return str;
    while (str.length > 1 && d.getTextWidth(str + '…') > w - 3) {
      str = str.slice(0, -1);
    }
    return str + '…';
  };

  const th = (y: number): number => {
    d.setFillColor(17, 107, 82);
    d.rect(L, y, W, 7, 'F');
    d.setTextColor(255);
    d.setFont('helvetica', 'bold');
    d.setFontSize(9);
    cols.forEach((c, i) => d.text(c[0], X[i] + 1.5, y + 4.8));
    return y + 7;
  };

  const n = countPresent(session);
  const absentCount = session.members.length - n;

  // Header Typography
  d.setTextColor(17, 107, 82);
  d.setFont('helvetica', 'bold');
  d.setFontSize(16);
  d.text(cut(session.title, W), L, 18);

  d.setTextColor(90);
  d.setFont('helvetica', 'normal');
  d.setFontSize(9);
  d.text('Roll: ' + session.rollName, L, 25);
  d.text(
    'Started: ' +
      formatRefDateTime(session.start) +
      (session.end ? '     Finished: ' + formatRefDateTime(session.end) : '     (in progress)'),
    L,
    30
  );

  d.setFont('helvetica', 'bold');
  d.setTextColor(30);
  d.text(
    'Present: ' + n + '     Absent: ' + absentCount + '     Total: ' + session.members.length,
    L,
    36
  );

  let y = th(41);

  session.members.forEach((m, k) => {
    if (y > 282) {
      d.addPage();
      y = th(14);
    }
    const on = session.marks[m.id];
    const ts = getMarkTimestamp(on);

    // Present rows get clean soft green; Absent rows get uniform clean background (no alternating dark zebra stripes)
    if (on) {
      d.setFillColor(227, 243, 236); // #e3f3ec
      d.rect(L, y, W, 6.4, 'F');
    } else {
      // Single uniform shade for all absentees
      d.setFillColor(255, 255, 255);
      d.rect(L, y, W, 6.4, 'F');
    }

    // Subtle bottom dividing hairline
    d.setDrawColor(230, 230, 225);
    d.setLineWidth(0.12);
    d.line(L, y + 6.4, L + W, y + 6.4);

    d.setFont('helvetica', 'normal');
    d.setFontSize(8.5);
    d.setTextColor(30);

    // # Number
    d.text(String(k + 1), X[0] + 1.5, y + 4.4);

    // Name
    d.setFont('helvetica', 'bold');
    d.text(cut(m.name, 70), X[1] + 1.5, y + 4.4);

    // Affiliated Group / Unit (and tag if present)
    d.setFont('helvetica', 'normal');
    d.setTextColor(80);
    const groupVal = m.unit ? (m.tag ? `${m.unit} (${m.tag})` : m.unit) : m.tag || 'General';
    d.text(cut(groupVal, 54), X[2] + 1.5, y + 4.4);

    // Status / time
    if (on && ts) {
      d.setTextColor(17, 107, 82);
      d.setFont('helvetica', 'bold');
      d.text(cut(formatRefDateTime(ts), 48), X[3] + 1.5, y + 4.4);
    } else {
      d.setTextColor(150);
      d.setFont('helvetica', 'normal');
      d.text('Absent', X[3] + 1.5, y + 4.4);
    }

    y += 6.4;
  });

  const np = d.getNumberOfPages();
  for (let p = 1; p <= np; p++) {
    d.setPage(p);
    d.setFont('helvetica', 'normal');
    d.setFontSize(8);
    d.setTextColor(120);
    d.text('Page ' + p + ' of ' + np, 105, 291, { align: 'center' });
  }

  const name =
    (session.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'register') + '.pdf';

  const pdfBlob = d.output('blob');
  return downloadFile(pdfBlob, name, 'application/pdf');
}

/**
 * Exports complete application database as structured JSON for complete offline backup.
 */
export async function exportDatabaseBackup(state: AppState): Promise<boolean> {
  const jsonStr = JSON.stringify(state, null, 2);
  const filename = `RollCall_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  return downloadFile(jsonStr, filename, 'application/json');
}

/**
 * Exports a roster to CSV format suitable for mass-editing in Excel, Python, or AI tools (Gemini/ChatGPT/Claude).
 * Columns: Name, followed by each custom field defined on the roll.
 */
export async function exportRosterToCSV(roll: Roll): Promise<boolean> {
  const lines: string[] = [];

  // Header row: Name, followed by all parameter names
  const headers = ['Full Name', ...roll.fields.map((f) => f.name)];
  lines.push(headers.map(escapeCSV).join(','));

  // Data rows
  roll.members.forEach((m) => {
    const row = [
      m.name,
      ...roll.fields.map((f) => {
        return m.data?.[f.id] || (m as any)[f.id] || '';
      }),
    ];
    lines.push(row.map(escapeCSV).join(','));
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const cleanName = roll.name.replace(/[^\w\-]+/g, '_').slice(0, 30);
  const filename = `${cleanName}_Roster_Template_${new Date().toISOString().slice(0, 10)}.csv`;

  return downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Parses full CSV text according to RFC 4180 specifications.
 * Correctly handles embedded commas inside quotes (e.g. "Assistant Overseer, Unity Hall"),
 * escaped double-quotes (""), and multiline records.
 */
export function parseCSVRecords(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  // Strip byte-order-mark if present
  const cleaned = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped double-quote: "" -> "
        currentField += '"';
        i++; // skip next quote
      } else {
        // Toggle quote boundary
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Field separator outside quotes
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      // Row separator outside quotes
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  // Push any trailing field and row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses CSV text to extract members matching the roll's parameters.
 * RFC 4180 compliant: correctly preserves strings containing commas (e.g. "Assistant Overseer, Unity Hall").
 */
export function parseCSVToMembers(
  csvText: string,
  roll: Roll,
  idGenerator: (prefix: string) => string
): { members: Member[]; unmatchedHeaders: string[] } {
  const records = parseCSVRecords(csvText);
  if (records.length < 2) return { members: [], unmatchedHeaders: [] };

  // Header row
  const rawHeaders = records[0].map((h) => h.replace(/^["']|["']$/g, '').trim());

  // Find column index for member name
  let nameIndex = rawHeaders.findIndex((h) => /name|full\s*name|person|member/i.test(h));
  if (nameIndex === -1) nameIndex = 0;

  // Map each roll field to matched column index
  const fieldMapping: { fieldId: string; colIndex: number }[] = [];
  const unmatchedHeaders: string[] = [];

  roll.fields.forEach((field) => {
    const colIdx = rawHeaders.findIndex(
      (h, idx) =>
        idx !== nameIndex &&
        (h.toLowerCase() === field.name.toLowerCase() ||
          h.toLowerCase().includes(field.name.toLowerCase()) ||
          field.name.toLowerCase().includes(h.toLowerCase()))
    );
    if (colIdx !== -1) {
      fieldMapping.push({ fieldId: field.id, colIndex: colIdx });
    }
  });

  const members: Member[] = [];

  for (let i = 1; i < records.length; i++) {
    const cols = records[i];
    if (!cols || cols.length === 0) continue;

    const name = cols[nameIndex];
    if (!name || !name.trim()) continue;

    const data: Record<string, string> = {};
    fieldMapping.forEach(({ fieldId, colIndex }) => {
      if (cols[colIndex] !== undefined) {
        data[fieldId] = cols[colIndex].trim();
      }
    });

    // Populate any remaining fields by index order if not mapped
    roll.fields.forEach((f, idx) => {
      if (!data[f.id]) {
        const fallbackIdx = idx + 1;
        if (cols[fallbackIdx] !== undefined) {
          data[f.id] = cols[fallbackIdx].trim();
        }
      }
    });

    members.push({
      id: idGenerator('m'),
      name: name.trim(),
      unit: data['unit'] || '',
      phone: data['phone'] || '',
      tag: data['tag'] || '',
      data,
    });
  }

  return { members, unmatchedHeaders };
}

