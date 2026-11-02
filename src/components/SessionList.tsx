import React, { useState } from 'react';
import {
  History,
  Play,
  FileCheck,
  FileSpreadsheet,
  Trash2,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  BarChart2,
} from 'lucide-react';
import { Session, Roll } from '../types';
import {
  countPresent,
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
} from '../utils/storage';
import { exportSessionToPDF, exportSessionToCSV } from '../utils/exportUtils';

interface SessionListProps {
  sessions: Session[];
  rolls: Roll[];
  onOpenSession: (session: Session) => void;
  onViewDetails: (session: Session) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSessionPrompt: () => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  rolls,
  onOpenSession,
  onViewDetails,
  onDeleteSession,
  onNewSessionPrompt,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sort sessions latest first
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
  );

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-xl sm:text-2xl text-[#1d2b25] dark:text-[#e8efe9]">
            Attendance Registers
          </h1>
          <p className="mt-0.5 text-xs text-[#6b7770] dark:text-[#92a199]">
            All roll calls recorded on this device. Tap a session to resume, analyze, or export.
          </p>
        </div>

        <button
          onClick={onNewSessionPrompt}
          className="flex items-center gap-1.5 rounded-xl bg-[#116b52] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0e5742] active:scale-95 dark:bg-[#3fbf95] dark:text-[#0b1410]"
        >
          <Plus className="h-4 w-4" />
          <span>Take New Register</span>
        </button>
      </div>

      {sortedSessions.length === 0 ? (
        <div className="rounded-2xl border border-[#e3e1d8] bg-white p-12 text-center shadow-xs dark:border-[#2b3731] dark:bg-[#1b2420]">
          <History className="mx-auto h-12 w-12 text-[#6b7770] opacity-40 dark:text-[#92a199]" />
          <h3 className="mt-3 font-bold text-base text-[#1d2b25] dark:text-[#e8efe9]">
            No Attendance Registers Taken Yet
          </h3>
          <p className="mt-1 text-xs text-[#6b7770] dark:text-[#92a199]">
            Select a roll roster and tap &quot;Take Register&quot; to begin.
          </p>
          <button
            onClick={onNewSessionPrompt}
            className="mt-4 rounded-xl bg-[#116b52] px-4 py-2 text-xs font-semibold text-white dark:bg-[#3fbf95] dark:text-[#0b1410]"
          >
            Start First Roll Call
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSessions.map((session) => {
            const total = session.members.length;
            const present = countPresent(session);
            const rate = total > 0 ? ((present / total) * 100).toFixed(0) : '0';
            const isOpen = session.status === 'open';

            return (
              <div
                key={session.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition-all sm:flex-row sm:items-center ${
                  isOpen
                    ? 'border-[#116b52]/50 bg-[#e3f3ec]/40 shadow-xs dark:border-[#3fbf95]/50 dark:bg-[#1e3a2f]/30'
                    : 'border-[#e3e1d8] bg-white hover:border-[#116b52]/40 dark:border-[#2b3731] dark:bg-[#1b2420]'
                }`}
              >
                {/* Info block */}
                <div
                  onClick={() => (isOpen ? onOpenSession(session) : onViewDetails(session))}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-base text-[#1d2b25] hover:text-[#116b52] dark:text-[#e8efe9] dark:hover:text-[#3fbf95]">
                      {session.title}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                        isOpen
                          ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                          : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {isOpen ? 'IN PROGRESS' : 'SAVED'}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6b7770] dark:text-[#92a199]">
                    <span>Roster: {session.rollName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateOnly(session.start)}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-[#116b52] dark:text-[#3fbf95]">
                      {present} / {total} Present ({rate}%)
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center justify-end gap-2 border-t border-[#e3e1d8]/60 pt-3 sm:mt-0 sm:border-0 sm:pt-0">
                  {isOpen ? (
                    <button
                      onClick={() => onOpenSession(session)}
                      className="flex items-center gap-1.5 rounded-xl bg-[#116b52] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#0e5742] active:scale-95 dark:bg-[#3fbf95] dark:text-[#0b1410]"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Resume</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onViewDetails(session)}
                      className="flex items-center gap-1.5 rounded-xl bg-[#116b52] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#0e5742] dark:bg-[#3fbf95] dark:text-[#0b1410]"
                    >
                      <BarChart2 className="h-3 w-3" />
                      <span>Analysis</span>
                    </button>
                  )}

                  <button
                    onClick={() => exportSessionToPDF(session)}
                    title="Quick Download PDF"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3e1d8] bg-white text-[#6b7770] hover:bg-stone-50 hover:text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#92a199]"
                  >
                    <FileCheck className="h-3.5 w-3.5 text-rose-600" />
                  </button>

                  <button
                    onClick={() => exportSessionToCSV(session)}
                    title="Quick Download CSV Spreadsheet"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3e1d8] bg-white text-[#6b7770] hover:bg-stone-50 hover:text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#92a199]"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  </button>

                  {confirmDeleteId === session.id ? (
                    <button
                      onClick={() => onDeleteSession(session.id)}
                      className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs"
                    >
                      Delete?
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(session.id)}
                      title="Delete session"
                      className="rounded-lg p-1.5 text-[#6b7770] hover:bg-rose-50 hover:text-rose-600 dark:text-[#92a199]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
