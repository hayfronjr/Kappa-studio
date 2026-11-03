import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  FileCheck,
  RotateCcw,
  Trash2,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Building,
  BarChart2,
  Calendar,
} from 'lucide-react';
import { Session, Roll } from '../types';
import {
  countPresent,
  countLate,
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
  getMarkTimestamp,
  getMarkStatus,
  isMemberPresent,
} from '../utils/storage';
import {
  exportSessionToCSV,
  exportSessionToPDF,
  exportAuditLogText,
  exportAttendanceMatrixCSV,
} from '../utils/exportUtils';

interface SessionDetailProps {
  session: Session;
  roll?: Roll;
  allSessions: Session[];
  onBack: () => void;
  onResume: (session: Session) => void;
  onReopen: (session: Session) => void;
  onDelete: (sessionId: string) => void;
}

export const SessionDetail: React.FC<SessionDetailProps> = ({
  session,
  roll,
  allSessions,
  onBack,
  onResume,
  onReopen,
  onDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const totalCount = session.members.length;
  const presentCount = countPresent(session);
  const lateCount = countLate(session);
  const absentCount = totalCount - presentCount;
  const rate = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : '0';

  // Unit breakdown for this session
  const unitStats = useMemo(() => {
    const map = new Map<string, { total: number; present: number }>();
    session.members.forEach((m) => {
      const u = m.unit?.trim() || 'General';
      const current = map.get(u) || { total: 0, present: 0 };
      current.total += 1;
      if (isMemberPresent(session, m.id)) {
        current.present += 1;
      }
      map.set(u, current);
    });

    return Array.from(map.entries())
      .map(([unit, stat]) => ({
        unit,
        total: stat.total,
        present: stat.present,
        rate: stat.total > 0 ? (stat.present / stat.total) * 100 : 0,
      }))
      .sort((a, b) => b.rate - a.rate || b.total - a.total);
  }, [session]);

  // Arrival timeline breakdown (group marks by 15-minute or 5-minute time buckets)
  const arrivalHistogram = useMemo(() => {
    const marksWithTime = session.members
      .map((m) => {
        const ts = getMarkTimestamp(session.marks[m.id]);
        return ts ? new Date(ts) : null;
      })
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (marksWithTime.length === 0) return [];

    // Bucket into 5-minute intervals
    const buckets = new Map<string, number>();
    marksWithTime.forEach((d) => {
      const minutes = Math.floor(d.getMinutes() / 5) * 5;
      const key = `${String(d.getHours()).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });

    return Array.from(buckets.entries()).map(([timeLabel, count]) => ({
      timeLabel,
      count,
    }));
  }, [session]);

  const maxBucketCount = Math.max(...arrivalHistogram.map((h) => h.count), 1);

  const handleExport = async (type: 'csv' | 'pdf' | 'log' | 'matrix') => {
    let success = false;
    if (type === 'csv') {
      success = await exportSessionToCSV(session);
      if (success) setExportSuccess('CSV spreadsheet exported to your device!');
    } else if (type === 'pdf') {
      success = await exportSessionToPDF(session);
      if (success) setExportSuccess('PDF attendance sheet downloaded!');
    } else if (type === 'log') {
      success = await exportAuditLogText(session);
      if (success) setExportSuccess('Chronological audit log file saved!');
    } else if (type === 'matrix' && roll) {
      success = await exportAttendanceMatrixCSV(roll, allSessions);
      if (success) setExportSuccess('Multi-session attendance matrix exported!');
    }
    setTimeout(() => setExportSuccess(null), 3500);
  };

  return (
    <div className="mx-auto max-w-4xl pb-16">
      {/* Top Header Card */}
      <div className="mb-6 rounded-2xl border border-[#e3e1d8] bg-white p-4 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-1.5 text-xs font-semibold text-[#1d2b25] transition hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Sessions</span>
          </button>

          <div className="flex items-center gap-2">
            {session.status === 'open' ? (
              <button
                onClick={() => onResume(session)}
                className="flex items-center gap-1.5 rounded-lg bg-[#116b52] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs dark:bg-[#3fbf95] dark:text-[#0b1410]"
              >
                <span>Resume Live Roll Call</span>
              </button>
            ) : (
              <button
                onClick={() => onReopen(session)}
                className="flex items-center gap-1.5 rounded-lg border border-[#e3e1d8] bg-white px-3 py-1.5 text-xs font-medium text-[#6b7770] hover:bg-stone-50 dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#92a199]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reopen Session</span>
              </button>
            )}

            {confirmDelete ? (
              <button
                onClick={() => onDelete(session.id)}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
              >
                Confirm Delete?
              </button>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Delete this register session"
                className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Title and date info */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-xl sm:text-2xl text-[#1d2b25] dark:text-[#e8efe9]">
              {session.title}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                session.status === 'open'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              {session.status.toUpperCase()}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6b7770] dark:text-[#92a199]">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Roster: {session.rollName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {formatDateOnly(session.start)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Started: {formatTimeOnly(session.start)}{' '}
              {session.end ? `• Finished: ${formatTimeOnly(session.end)}` : '• In progress'}
            </span>
          </div>
        </div>

        {/* Big Metrics Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3 text-center dark:border-[#2b3731] dark:bg-[#121816]">
            <div className="text-xs font-medium text-[#6b7770] dark:text-[#92a199]">
              Attendance Rate
            </div>
            <div className="mt-1 font-bold text-2xl text-[#116b52] dark:text-[#3fbf95]">
              {rate}%
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
              Present Members
            </div>
            <div className="mt-1 font-bold text-2xl text-emerald-700 dark:text-emerald-400">
              {presentCount} <span className="text-xs font-normal text-[#6b7770]">/ {totalCount}</span>
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
            <div className="text-xs font-medium text-rose-800 dark:text-rose-300">
              Absent Members
            </div>
            <div className="mt-1 font-bold text-2xl text-rose-700 dark:text-rose-400">
              {absentCount}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="text-xs font-medium text-amber-800 dark:text-amber-300">
              Late Arrivals
            </div>
            <div className="mt-1 font-bold text-2xl text-amber-700 dark:text-amber-400">
              {lateCount}
            </div>
          </div>
        </div>
      </div>

      {/* Export Alert Notification */}
      {exportSuccess && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* Export Center */}
      <div className="mb-6 rounded-2xl border border-[var(--theme-primary)]/40 bg-white p-5 shadow-sm dark:border-[var(--theme-primary)]/40 dark:bg-[#1b2420]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-base text-[var(--theme-primary)]">
              Local File Export Center
            </h2>
            <p className="mt-0.5 text-xs text-[#6b7770] dark:text-[#92a199]">
              Export rolls and attendance logs directly to your Windows desktop or Android device storage for later analysis.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Option 1: CSV Spreadsheet */}
          <div className="flex flex-col justify-between rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3.5 transition hover:border-[#116b52] dark:border-[#2b3731] dark:bg-[#121816]">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <FileSpreadsheet className="h-5 w-5" />
                <span className="font-bold text-sm">CSV Spreadsheet</span>
              </div>
              <span className="mt-1 inline-block rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Best for Excel &amp; Data
              </span>
              <p className="mt-2 text-xs text-[#6b7770] dark:text-[#92a199]">
                Full table of members with timestamps, status, departments, and phone numbers. Opens in Excel, Sheets, and Pandas.
              </p>
            </div>
            <button
              onClick={() => handleExport('csv')}
              style={{ backgroundColor: '#059669' }}
              className="no-theme-override mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white shadow-2xs hover:brightness-95 active:scale-95 transition"
            >
              <Download className="h-3.5 w-3.5 text-white" />
              <span>Download CSV</span>
            </button>
          </div>

          {/* Option 2: PDF Document */}
          <div className="flex flex-col justify-between rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3.5 transition hover:border-[#116b52] dark:border-[#2b3731] dark:bg-[#121816]">
            <div>
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <FileCheck className="h-5 w-5" />
                <span className="font-bold text-sm">PDF Attendance Sheet</span>
              </div>
              <span className="mt-1 inline-block rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-semibold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                Best for Printing &amp; Filing
              </span>
              <p className="mt-2 text-xs text-[#6b7770] dark:text-[#92a199]">
                Clean, paginated A4 document with attendance table, summary stats, and supervisor sign-off signature box.
              </p>
            </div>
            <button
              onClick={() => handleExport('pdf')}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 active:scale-95 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </button>
          </div>

          {/* Option 3: Chronological Audit Log (.log/.txt) */}
          <div className="flex flex-col justify-between rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3.5 transition hover:border-[#116b52] dark:border-[#2b3731] dark:bg-[#121816]">
            <div>
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <FileText className="h-5 w-5" />
                <span className="font-bold text-sm">Audit Log (.log)</span>
              </div>
              <span className="mt-1 inline-block rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Best for Forensic Verification
              </span>
              <p className="mt-2 text-xs text-[#6b7770] dark:text-[#92a199]">
                Second-by-second chronological record of check-in events and absentees for security audits and archiving.
              </p>
            </div>
            <button
              onClick={() => handleExport('log')}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 active:scale-95 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Log File</span>
            </button>
          </div>

          {/* Option 4: Multi-Session Matrix */}
          <div className="flex flex-col justify-between rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3.5 transition hover:border-[#116b52] dark:border-[#2b3731] dark:bg-[#121816]">
            <div>
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                <BarChart2 className="h-5 w-5" />
                <span className="font-bold text-sm">Attendance Matrix</span>
              </div>
              <span className="mt-1 inline-block rounded bg-purple-100 px-1.5 py-0.2 text-[10px] font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                Best for Longitudinal Analysis
              </span>
              <p className="mt-2 text-xs text-[#6b7770] dark:text-[#92a199]">
                Cross-tabulates all members across all past dates with overall turnout rates and attendance streak counts.
              </p>
            </div>
            <button
              onClick={() => handleExport('matrix')}
              disabled={!roll}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-purple-600 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-purple-700 active:scale-95 disabled:opacity-50 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytical Breakdown: Arrival Times & Department Turnout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Arrival Timeline Histogram */}
        <div className="rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--theme-primary)]" />
            <h3 className="font-bold text-sm text-[#1d2b25] dark:text-[#e8efe9]">
              Check-In Timeline Distribution
            </h3>
          </div>
          <p className="mt-1 text-xs text-[#6b7770] dark:text-[#92a199]">
            When did attendees arrive during the roll call?
          </p>

          <div className="mt-4 space-y-2">
            {arrivalHistogram.length === 0 ? (
              <p className="text-xs text-[#6b7770] dark:text-[#92a199]">
                No check-in times recorded yet.
              </p>
            ) : (
              arrivalHistogram.map((item) => {
                const barWidth = Math.round((item.count / maxBucketCount) * 100);
                return (
                  <div key={item.timeLabel} className="flex items-center gap-3 text-xs">
                    <span className="w-12 font-mono font-medium text-[#6b7770] dark:text-[#92a199]">
                      {item.timeLabel}
                    </span>
                    <div className="h-4 flex-1 overflow-hidden rounded-md bg-[var(--theme-primary-light)]">
                      <div
                        className="h-full bg-[var(--theme-primary)] transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-bold text-[#1d2b25] dark:text-[#e8efe9]">
                      {item.count}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Unit / Department Performance */}
        <div className="rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-[var(--theme-primary)]" />
            <h3 className="font-bold text-sm text-[#1d2b25] dark:text-[#e8efe9]">
              Turnout by Unit / Department
            </h3>
          </div>
          <p className="mt-1 text-xs text-[#6b7770] dark:text-[#92a199]">
            Attendance breakdown across groups
          </p>

          <div className="mt-4 max-h-64 space-y-2.5 overflow-y-auto pr-1">
            {unitStats.map((item) => (
              <div key={item.unit} className="text-xs">
                <div className="flex justify-between font-medium">
                  <span className="truncate text-[#1d2b25] dark:text-[#e8efe9]">
                    {item.unit}
                  </span>
                  <span className="text-[#6b7770] dark:text-[#92a199]">
                    {item.present}/{item.total} ({item.rate.toFixed(0)}%)
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#e3e1d8] dark:bg-[#2b3731]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.rate >= 80
                        ? 'bg-emerald-600 dark:bg-emerald-400'
                        : item.rate >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full Attendance Register Table (Matching PDF format) */}
      <div className="mt-6 rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-[#116b52] dark:text-[#3fbf95]">
              Attendance Register Sheet ({session.members.length} Members)
            </h3>
            <p className="text-xs text-[#6b7770] dark:text-[#92a199]">
              Present: {presentCount} • Absent: {absentCount} • Finished: {session.end ? formatDateTime(session.end) : 'In progress'}
            </p>
          </div>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--theme-primary)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:opacity-90 transition"
          >
            <FileCheck className="h-4 w-4" />
            <span>Download Matching PDF</span>
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[#e3e1d8] dark:border-[#2b3731]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[var(--theme-primary)] text-white">
                <th className="py-2.5 px-3 font-bold w-12">#</th>
                <th className="py-2.5 px-3 font-bold">Name</th>
                <th className="py-2.5 px-3 font-bold">Unit</th>
                <th className="py-2.5 px-3 font-bold">Phone</th>
                <th className="py-2.5 px-3 font-bold">Status / time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e1d8] dark:divide-[#2b3731]">
              {session.members.map((m, idx) => {
                const mark = session.marks[m.id];
                const isPresent = isMemberPresent(session, m.id);
                const ts = getMarkTimestamp(mark);

                return (
                  <tr
                    key={m.id}
                    className={`transition-colors ${
                      isPresent
                        ? 'bg-[var(--theme-primary-light)] text-[var(--app-tx)]'
                        : 'bg-white dark:bg-[#1b2420]'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-medium text-[#1d2b25] dark:text-[#e8efe9]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#1d2b25] dark:text-[#e8efe9]">
                      {m.name}
                      {m.tag && (
                        <span className="ml-1.5 rounded bg-[var(--app-card-subtle)] px-1.5 py-0.2 text-[10px] font-normal text-[#6b7770] dark:text-[#92a199]">
                          {m.tag}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#6b7770] dark:text-[#92a199]">
                      {m.unit}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#6b7770] dark:text-[#92a199]">
                      {m.phone}
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      {isPresent && ts ? (
                        <span className="text-[var(--theme-primary)] font-semibold">
                          {formatDateOnly(ts)}, {formatTimeOnly(ts)}
                        </span>
                      ) : (
                        <span className="text-[#969696] dark:text-[#6b7770]">
                          Absent
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
