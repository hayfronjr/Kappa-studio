import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Download,
  FileSpreadsheet,
  Building,
  TrendingUp,
  Award,
  AlertTriangle,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { Roll, Session, RollField } from '../types';
import { isMemberPresent, formatDateOnly, getMemberValue, formatGroupDisplay } from '../utils/storage';
import { exportAttendanceMatrixCSV } from '../utils/exportUtils';

interface AnalyticsViewProps {
  rolls: Roll[];
  sessions: Session[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ rolls, sessions }) => {
  const [selectedRollId, setSelectedRollId] = useState<string>(rolls[0]?.id || '');
  const [selectedGroupingFieldId, setSelectedGroupingFieldId] = useState<string>('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const currentRoll = rolls.find((r) => r.id === selectedRollId) || rolls[0];

  // Eligible grouping parameters (e.g. department, unit, group, position, status)
  const groupingFields: RollField[] = useMemo(() => {
    if (!currentRoll) return [];
    return (currentRoll.fields || []).filter((f) => !f.isPhoneField && f.type !== 'phone');
  }, [currentRoll]);

  // Dynamically select field that implies groups/departments
  const activeGroupingField: RollField | undefined = useMemo(() => {
    if (!groupingFields.length) return undefined;
    if (selectedGroupingFieldId) {
      const match = groupingFields.find((f) => f.id === selectedGroupingFieldId);
      if (match) return match;
    }
    // Prefer explicitly configured group field, or fields named department / unit / group / team / squad
    const preferred =
      groupingFields.find((f) => f.id === currentRoll?.groupFieldId) ||
      groupingFields.find((f) => f.isGroupField) ||
      groupingFields.find((f) => /department|unit|group|team|squad|class|portfolio|position|wing/i.test(f.name)) ||
      groupingFields[0];
    return preferred;
  }, [groupingFields, selectedGroupingFieldId, currentRoll]);

  // Sessions belonging to current roll
  const rollSessions = useMemo(() => {
    if (!currentRoll) return [];
    return sessions
      .filter((s) => s.rollId === currentRoll.id)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [sessions, currentRoll]);

  // Member-by-member attendance stats
  const memberStats = useMemo(() => {
    if (!currentRoll || rollSessions.length === 0) return [];

    return currentRoll.members
      .map((m) => {
        let attended = 0;
        let streak = 0;
        let currentStreakCount = 0;

        rollSessions.forEach((s) => {
          const present = isMemberPresent(s, m.id);
          if (present) {
            attended++;
            currentStreakCount++;
            if (currentStreakCount > streak) streak = currentStreakCount;
          } else {
            currentStreakCount = 0;
          }
        });

        const rate = (attended / rollSessions.length) * 100;
        return {
          member: m,
          attended,
          totalPossible: rollSessions.length,
          rate,
          streak,
        };
      })
      .sort((a, b) => b.rate - a.rate || b.attended - a.attended);
  }, [currentRoll, rollSessions]);

  // Dynamic Group / Department performance aggregated across sessions
  const groupStats = useMemo(() => {
    if (!currentRoll || rollSessions.length === 0 || !activeGroupingField) return [];

    const map = new Map<string, { totalPossible: number; totalAttended: number; memberCount: number }>();

    currentRoll.members.forEach((m) => {
      const rawVal = getMemberValue(m, activeGroupingField.id) || (m as any)[activeGroupingField.id] || 'General';
      const displayVal = formatGroupDisplay(rawVal, activeGroupingField);

      const entry = map.get(displayVal) || { totalPossible: 0, totalAttended: 0, memberCount: 0 };
      entry.memberCount += 1;
      entry.totalPossible += rollSessions.length;

      rollSessions.forEach((s) => {
        if (isMemberPresent(s, m.id)) {
          entry.totalAttended += 1;
        }
      });

      map.set(displayVal, entry);
    });

    return Array.from(map.entries())
      .map(([groupName, data]) => ({
        groupName,
        memberCount: data.memberCount,
        attended: data.totalAttended,
        possible: data.totalPossible,
        rate: data.totalPossible > 0 ? (data.totalAttended / data.totalPossible) * 100 : 0,
      }))
      .sort((a, b) => b.rate - a.rate || b.attended - a.attended);
  }, [currentRoll, rollSessions, activeGroupingField]);

  // Overall attendance rate
  const overallTurnout = useMemo(() => {
    if (memberStats.length === 0) return 0;
    const totalAttended = memberStats.reduce((acc, m) => acc + m.attended, 0);
    const totalPossible = memberStats.reduce((acc, m) => acc + m.totalPossible, 0);
    return totalPossible > 0 ? (totalAttended / totalPossible) * 100 : 0;
  }, [memberStats]);

  const handleExportMatrix = async () => {
    if (!currentRoll) return;
    const success = await exportAttendanceMatrixCSV(currentRoll, sessions);
    if (success) {
      setExportNotice('Full Attendance Matrix CSV exported to device storage!');
      setTimeout(() => setExportNotice(null), 3500);
    }
  };

  if (!currentRoll) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center text-xs text-[#6b7770]">
        No roster found. Please create a roll first.
      </div>
    );
  }

  const topAttendees = memberStats.filter((m) => m.rate >= 80);
  const lowAttendees = memberStats.filter((m) => m.rate < 50);

  return (
    <div className="mx-auto max-w-4xl pb-16">
      {/* Header & Roll Picker */}
      <div className="mb-6 rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-xl sm:text-2xl text-[#1d2b25] dark:text-[#e8efe9]">
              Long-Term Attendance Analytics
            </h1>
            <p className="mt-0.5 text-xs text-[#6b7770] dark:text-[#92a199]">
              Analyze consistency, attendance trends, and export complete roster matrices across multiple dates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedRollId}
              onChange={(e) => setSelectedRollId(e.target.value)}
              className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs font-semibold text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
            >
              {rolls.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleExportMatrix}
              disabled={rollSessions.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-[#116b52] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0e5742] active:scale-95 disabled:opacity-50 dark:bg-[#3fbf95] dark:text-[#0b1410]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Matrix CSV</span>
            </button>
          </div>
        </div>

        {exportNotice && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Aggregate KPI cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3 text-center dark:border-[#2b3731] dark:bg-[#121816]">
            <div className="text-xs font-medium text-[#6b7770] dark:text-[#92a199]">
              Overall Turnout
            </div>
            <div className="mt-1 font-bold text-2xl text-[#116b52] dark:text-[#3fbf95]">
              {overallTurnout.toFixed(1)}%
            </div>
          </div>

          <div className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3 text-center dark:border-[#2b3731] dark:bg-[#121816]">
            <div className="text-xs font-medium text-[#6b7770] dark:text-[#92a199]">
              Sessions Analyzed
            </div>
            <div className="mt-1 font-bold text-2xl text-[#1d2b25] dark:text-[#e8efe9]">
              {rollSessions.length}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
              High Attendance (≥80%)
            </div>
            <div className="mt-1 font-bold text-2xl text-emerald-700 dark:text-emerald-400">
              {topAttendees.length}
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
            <div className="text-xs font-medium text-rose-800 dark:text-rose-300">
              Needs Follow-Up (&lt;50%)
            </div>
            <div className="mt-1 font-bold text-2xl text-rose-700 dark:text-rose-400">
              {lowAttendees.length}
            </div>
          </div>
        </div>
      </div>

      {rollSessions.length === 0 ? (
        <div className="rounded-2xl border border-[#e3e1d8] bg-white p-12 text-center text-xs text-[#6b7770] dark:border-[#2b3731] dark:bg-[#1b2420]">
          No recorded sessions yet for &quot;{currentRoll.name}&quot;. Take a roll call to view analytics.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Dynamic Group / Department Aggregate Attendance */}
          <div className="rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e1d8] pb-3 dark:border-[#2b3731]">
              <div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-[#116b52] dark:text-[#3fbf95]" />
                  <h2 className="font-bold text-base text-[#1d2b25] dark:text-[#e8efe9]">
                    {activeGroupingField ? `${activeGroupingField.name} Aggregate Attendance` : 'Group Aggregate Attendance'}
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-[#6b7770] dark:text-[#92a199]">
                  Cumulative attendance breakdown across all recorded sessions
                </p>
              </div>

              {groupingFields.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-medium text-[#6b7770] dark:text-[#92a199]">Group by parameter:</span>
                  <select
                    value={activeGroupingField?.id || ''}
                    onChange={(e) => setSelectedGroupingFieldId(e.target.value)}
                    className="rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-2.5 py-1 text-xs font-semibold text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                  >
                    {groupingFields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {groupStats.length === 0 ? (
                <div className="col-span-2 py-4 text-center text-xs text-[#6b7770]">
                  No group data found for this parameter.
                </div>
              ) : (
                groupStats.map((item) => (
                  <div
                    key={item.groupName}
                    className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3 dark:border-[#2b3731] dark:bg-[#121816]"
                  >
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="font-semibold text-[#1d2b25] dark:text-[#e8efe9] truncate">
                          {item.groupName}
                        </span>
                        <span className="text-[11px] text-[#6b7770] dark:text-[#92a199] shrink-0">
                          ({item.memberCount} {item.memberCount === 1 ? 'person' : 'people'})
                        </span>
                      </div>
                      <span className="font-bold text-[#1d2b25] dark:text-[#e8efe9] shrink-0">
                        {item.attended}/{item.possible} ({item.rate.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e3e1d8] dark:bg-[#2b3731]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.rate >= 80
                            ? 'bg-emerald-600'
                            : item.rate >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${item.rate}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Member Attendance Matrix Preview */}
          <div className="rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#116b52] dark:text-[#3fbf95]" />
                <h2 className="font-bold text-base text-[#1d2b25] dark:text-[#e8efe9]">
                  Member Turnout &amp; Streak Table
                </h2>
              </div>
              <button
                onClick={handleExportMatrix}
                className="flex items-center gap-1 rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-2.5 py-1 text-xs font-medium text-[#116b52] hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#3fbf95]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Full Spreadsheet</span>
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e3e1d8] text-[#6b7770] dark:border-[#2b3731] dark:text-[#92a199]">
                    <th className="py-2 pr-3 font-semibold">Attendee</th>
                    <th className="py-2 px-3 font-semibold">
                      {activeGroupingField ? activeGroupingField.name : 'Group'}
                    </th>
                    <th className="py-2 px-3 text-center font-semibold">Present</th>
                    <th className="py-2 px-3 text-center font-semibold">Rate</th>
                    <th className="py-2 pl-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e3e1d8]/60 dark:divide-[#2b3731]/60">
                  {memberStats.map(({ member, attended, totalPossible, rate }) => {
                    const groupVal = activeGroupingField
                      ? getMemberValue(member, activeGroupingField.id) || (member as any)[activeGroupingField.id] || ''
                      : member.unit || '';

                    return (
                      <tr key={member.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
                        <td className="py-2.5 pr-3 font-medium text-[#1d2b25] dark:text-[#e8efe9]">
                          <div>{member.name}</div>
                          {member.tag && member.tag !== groupVal && (
                            <div className="text-[10px] text-[#6b7770] dark:text-[#92a199]">
                              {member.tag}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[#6b7770] dark:text-[#92a199]">
                          {formatGroupDisplay(groupVal, activeGroupingField) || 'General'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-[#1d2b25] dark:text-[#e8efe9]">
                          {attended} / {totalPossible}
                        </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            rate >= 80
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : rate >= 50
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {rate.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        {member.phone && (
                          <div className="inline-flex items-center gap-1">
                            <a
                              href={`tel:${member.phone.split('/')[0].replace(/\s+/g, '')}`}
                              title={`Call ${member.name}`}
                              className="rounded-lg p-1 text-[#6b7770] hover:text-[#116b52] dark:text-[#92a199]"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={`https://wa.me/${member.phone.split('/')[0].replace(/[^\d+]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`WhatsApp ${member.name}`}
                              className="rounded-lg p-1 text-[#6b7770] hover:text-emerald-600 dark:text-[#92a199]"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </div>
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
      )}
    </div>
  );
};
