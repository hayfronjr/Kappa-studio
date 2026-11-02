import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  CheckSquare,
  Square,
  Volume2,
  VolumeX,
  Vibrate,
  Clock,
  UserCheck,
  UserX,
  Download,
  FileSpreadsheet,
  FileText,
  FileCheck,
  Shuffle,
  Phone,
  MessageCircle,
  MoreHorizontal,
  ChevronDown,
  Sparkles,
  LayoutGrid,
  List,
  Users,
} from 'lucide-react';
import { Session, Member, MarkValue } from '../types';
import {
  countPresent,
  countLate,
  formatDateTime,
  formatTimeOnly,
  getMarkTimestamp,
  getMarkStatus,
  isMemberPresent,
  getPhoneValue,
  getGroupValue,
  buildWhatsAppLink,
  loadSettings,
} from '../utils/storage';
import {
  playCheckSound,
  playUncheckSound,
  playCompleteSound,
  triggerHaptic,
  triggerCelebration,
} from '../utils/soundAndHaptics';
import {
  exportSessionToCSV,
  exportSessionToPDF,
  exportAuditLogText,
} from '../utils/exportUtils';

interface SessionViewProps {
  session: Session;
  onUpdateSession: (updated: Session) => void;
  onCloseSession: (session: Session) => void;
  onBack: () => void;
  onViewDetails: (session: Session) => void;
}

export const SessionView: React.FC<SessionViewProps> = ({
  session,
  onUpdateSession,
  onCloseSession,
  onBack,
  onViewDetails,
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'late'>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [randomAttendee, setRandomAttendee] = useState<Member | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(session.title);
  const [activeNoteMemberId, setActiveNoteMemberId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'group'>('list');
  const [settings] = useState(() => loadSettings());

  // Extract all unique units for quick filter dropdown
  const uniqueUnits = useMemo(() => {
    const set = new Set<string>();
    session.members.forEach((m) => {
      if (m.unit && m.unit.trim()) set.add(m.unit.trim());
    });
    return Array.from(set).sort();
  }, [session.members]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    const q = query.toLowerCase().trim();
    return session.members.filter((m) => {
      const phone = getPhoneValue(m, session.fields);
      const group = getGroupValue(m, session.fields);
      const matchQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.unit && m.unit.toLowerCase().includes(q)) ||
        (m.tag && m.tag.toLowerCase().includes(q)) ||
        (phone && phone.includes(q)) ||
        (group && group.toLowerCase().includes(q)) ||
        (m.data && Object.values(m.data).some((v) => String(v).toLowerCase().includes(q)));

      if (!matchQuery) return false;

      if (selectedUnit !== 'all' && m.unit !== selectedUnit) {
        return false;
      }

      const present = isMemberPresent(session, m.id);
      const mark = session.marks[m.id];
      const isLate = typeof mark === 'object' && mark.status === 'late';

      if (statusFilter === 'present') return present;
      if (statusFilter === 'absent') return !present;
      if (statusFilter === 'late') return isLate;

      return true;
    });
  }, [session, query, statusFilter, selectedUnit]);

  // Group members by custom group/pair or unit
  const groupedMembers = useMemo(() => {
    const groups: Record<string, Member[]> = {};
    filteredMembers.forEach((m) => {
      const grp = getGroupValue(m, session.fields) || m.unit || 'Ungrouped';
      if (!groups[grp]) groups[grp] = [];
      groups[grp].push(m);
    });
    return groups;
  }, [filteredMembers, session.fields]);

  const hasGroups = useMemo(() => {
    return session.members.some((m) => !!getGroupValue(m, session.fields));
  }, [session]);

  const markGroupPresent = (groupMembers: Member[]) => {
    const newMarks = { ...session.marks };
    const now = new Date().toISOString();
    groupMembers.forEach((m) => {
      if (!newMarks[m.id]) {
        newMarks[m.id] = now;
      }
    });
    playCheckSound(soundEnabled);
    triggerHaptic(25, hapticsEnabled);
    onUpdateSession({ ...session, marks: newMarks });
  };

  const clearGroupMarks = (groupMembers: Member[]) => {
    const newMarks = { ...session.marks };
    groupMembers.forEach((m) => {
      delete newMarks[m.id];
    });
    playUncheckSound(soundEnabled);
    triggerHaptic(20, hapticsEnabled);
    onUpdateSession({ ...session, marks: newMarks });
  };

  const presentCount = countPresent(session);
  const totalCount = session.members.length;
  const lateCount = countLate(session);
  const absentCount = totalCount - presentCount;
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Toggle single member attendance
  const toggleAttendance = (memberId: string) => {
    const current = session.marks[memberId];
    const newMarks = { ...session.marks };

    if (current) {
      // Mark as absent (uncheck)
      delete newMarks[memberId];
      playUncheckSound(soundEnabled);
      triggerHaptic(10, hapticsEnabled);
    } else {
      // Mark as present with current exact ISO timestamp
      newMarks[memberId] = new Date().toISOString();
      playCheckSound(soundEnabled);
      triggerHaptic(20, hapticsEnabled);

      // Check if 100% complete
      if (Object.keys(newMarks).length === totalCount) {
        triggerCelebration();
        playCompleteSound(soundEnabled);
      }
    }

    onUpdateSession({
      ...session,
      marks: newMarks,
    });
  };

  // Set member status (Present, Late, Excused)
  const setMemberStatus = (memberId: string, status: 'present' | 'late' | 'excused', note?: string) => {
    const newMarks = { ...session.marks };
    const existing = newMarks[memberId];
    const timestamp = getMarkTimestamp(existing) || new Date().toISOString();

    newMarks[memberId] = {
      timestamp,
      status,
      note: note !== undefined ? note : (typeof existing === 'object' ? existing.note : undefined),
    };

    playCheckSound(soundEnabled);
    triggerHaptic(15, hapticsEnabled);

    onUpdateSession({
      ...session,
      marks: newMarks,
    });
  };

  // Bulk actions on visible filtered members
  const markVisiblePresent = () => {
    const newMarks = { ...session.marks };
    const now = new Date().toISOString();
    filteredMembers.forEach((m) => {
      if (!newMarks[m.id]) {
        newMarks[m.id] = now;
      }
    });
    playCheckSound(soundEnabled);
    triggerHaptic(30, hapticsEnabled);
    onUpdateSession({ ...session, marks: newMarks });
  };

  const markVisibleAbsent = () => {
    const newMarks = { ...session.marks };
    filteredMembers.forEach((m) => {
      delete newMarks[m.id];
    });
    playUncheckSound(soundEnabled);
    triggerHaptic(30, hapticsEnabled);
    onUpdateSession({ ...session, marks: newMarks });
  };

  const invertVisible = () => {
    const newMarks = { ...session.marks };
    const now = new Date().toISOString();
    filteredMembers.forEach((m) => {
      if (newMarks[m.id]) {
        delete newMarks[m.id];
      } else {
        newMarks[m.id] = now;
      }
    });
    playCheckSound(soundEnabled);
    triggerHaptic(25, hapticsEnabled);
    onUpdateSession({ ...session, marks: newMarks });
  };

  const pickRandom = () => {
    if (filteredMembers.length === 0) return;
    const random = filteredMembers[Math.floor(Math.random() * filteredMembers.length)];
    setRandomAttendee(random);
    triggerHaptic(20, hapticsEnabled);
  };

  const handleFinish = () => {
    const updated: Session = {
      ...session,
      status: 'closed',
      end: new Date().toISOString(),
    };
    playCompleteSound(soundEnabled);
    triggerCelebration();
    onCloseSession(updated);
  };

  const handleSaveTitle = () => {
    const clean = titleInput.trim() || session.title;
    onUpdateSession({ ...session, title: clean });
    setEditingTitle(false);
  };

  const isOngoing = session.status === 'open';

  return (
    <div className="mx-auto max-w-4xl pb-24">
      {/* Top Header Card */}
      <div className="sticky top-[60px] z-30 -mx-3 mb-4 border-b border-[#e3e1d8] bg-[#f6f5f0]/95 px-3 py-3 backdrop-blur-md dark:border-[#2b3731] dark:bg-[#121816]/95 sm:mx-0 sm:rounded-2xl sm:border sm:p-4 sm:shadow-sm">
        {/* Navigation & Title Row */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-[#e3e1d8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1d2b25] transition hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9] dark:hover:bg-[#25322c]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Title Editor */}
          <div className="flex-1 min-w-0 px-2">
            {editingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="w-full rounded-lg border border-[#116b52] bg-white px-2.5 py-1 text-sm font-bold text-[#1d2b25] outline-hidden dark:bg-[#1b2420] dark:text-[#e8efe9]"
                />
                <button
                  onClick={handleSaveTitle}
                  className="rounded-lg bg-[#116b52] px-2.5 py-1 text-xs font-semibold text-white dark:bg-[#3fbf95] dark:text-[#0b1410]"
                >
                  Save
                </button>
              </div>
            ) : (
              <h1
                onClick={() => isOngoing && setEditingTitle(true)}
                title={isOngoing ? 'Click to rename session' : undefined}
                className={`truncate font-bold text-base sm:text-lg text-[#1d2b25] dark:text-[#e8efe9] ${
                  isOngoing ? 'cursor-pointer hover:underline decoration-dotted' : ''
                }`}
              >
                {session.title}
              </h1>
            )}
            <div className="flex items-center gap-2 text-[11px] text-[#6b7770] dark:text-[#92a199]">
              <span>Roster: {session.rollName}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimeOnly(session.start)}
              </span>
              {session.status === 'open' ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Live Roll Call
                </span>
              ) : (
                <span className="rounded-full bg-stone-200 px-2 py-0.2 text-[10px] font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  Closed
                </span>
              )}
            </div>
          </div>

          {/* Quick Audio & Haptics Toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Audio feedback ON' : 'Audio feedback OFF'}
              className={`rounded-lg p-1.5 transition ${
                soundEnabled
                  ? 'text-[#116b52] dark:text-[#3fbf95]'
                  : 'text-[#6b7770] opacity-40 dark:text-[#92a199]'
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setHapticsEnabled(!hapticsEnabled)}
              title={hapticsEnabled ? 'Haptic vibration ON' : 'Haptic vibration OFF'}
              className={`rounded-lg p-1.5 transition ${
                hapticsEnabled
                  ? 'text-[#116b52] dark:text-[#3fbf95]'
                  : 'text-[#6b7770] opacity-40 dark:text-[#92a199]'
              }`}
            >
              <Vibrate className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Live Attendance Metrics Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="text-[#116b52] dark:text-[#3fbf95]">
              {presentCount} of {totalCount} Present ({percentage}%)
            </span>
            <div className="flex items-center gap-2 text-[11px] text-[#6b7770] dark:text-[#92a199]">
              {lateCount > 0 && <span className="text-amber-600 dark:text-amber-400">{lateCount} Late</span>}
              <span className="text-rose-600 dark:text-rose-400">{absentCount} Absent</span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e3e1d8] dark:bg-[#2b3731]">
            <div
              className="h-full bg-gradient-to-r from-[#116b52] to-[#3fbf95] transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-12">
          {/* Search Bar */}
          <div className="relative sm:col-span-7">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7770] dark:text-[#92a199]" />
            <input
              type="search"
              placeholder="Search name, unit, pair, or phone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-[#e3e1d8] bg-white py-2 pl-9 pr-3 text-xs text-[#1d2b25] shadow-2xs outline-hidden placeholder:text-[#6b7770] focus:border-[#116b52] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9] dark:placeholder:text-[#92a199]"
            />
          </div>

          {/* Unit Dropdown */}
          <div className="sm:col-span-5 flex gap-1.5">
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              aria-label="Filter by department or unit"
              className="w-full rounded-xl border border-[#e3e1d8] bg-white px-2.5 py-2 text-xs font-medium text-[#1d2b25] shadow-2xs outline-hidden focus:border-[#116b52] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
            >
              <option value="all">All Units ({uniqueUnits.length})</option>
              {uniqueUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Chips & Bulk Action Controls */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            {(['all', 'present', 'absent', 'late'] as const).map((f) => {
              const active = statusFilter === f;
              const count =
                f === 'all'
                  ? totalCount
                  : f === 'present'
                  ? presentCount
                  : f === 'absent'
                  ? absentCount
                  : lateCount;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                    active
                      ? 'bg-[#116b52] text-white shadow-2xs dark:bg-[#3fbf95] dark:text-[#0b1410]'
                      : 'border border-[#e3e1d8] bg-white text-[#6b7770] hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#92a199]'
                  }`}
                >
                  {f} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg border border-[#e3e1d8] bg-white p-0.5 dark:border-[#2b3731] dark:bg-[#1b2420]">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition ${
                  viewMode === 'list'
                    ? 'bg-[#116b52] text-white shadow-2xs dark:bg-[#3fbf95] dark:text-[#0b1410]'
                    : 'text-[#6b7770] hover:text-[#1d2b25] dark:text-[#92a199]'
                }`}
                title="List View"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('group')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition ${
                  viewMode === 'group'
                    ? 'bg-[#116b52] text-white shadow-2xs dark:bg-[#3fbf95] dark:text-[#0b1410]'
                    : 'text-[#6b7770] hover:text-[#1d2b25] dark:text-[#92a199]'
                }`}
                title="Pair & Group Cards View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pairs / Groups</span>
              </button>
            </div>

            {/* Bulk Tools */}
            {isOngoing && (
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={markVisiblePresent}
                  title="Mark all shown attendees as present"
                  className="flex items-center gap-1 rounded-lg border border-[#e3e1d8] bg-white px-2 py-1 text-[11px] font-medium text-[#116b52] hover:bg-[#e3f3ec] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#3fbf95]"
                >
                  <CheckSquare className="h-3 w-3" />
                  <span>Mark All</span>
                </button>
                <button
                  onClick={markVisibleAbsent}
                  title="Clear marks for all shown attendees"
                  className="flex items-center gap-1 rounded-lg border border-[#e3e1d8] bg-white px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-rose-400"
                >
                  <Square className="h-3 w-3" />
                  <span>Clear</span>
                </button>
                <button
                  onClick={invertVisible}
                  title="Invert current selection"
                  className="rounded-lg border border-[#e3e1d8] bg-white px-2 py-1 text-[11px] font-medium text-[#6b7770] hover:bg-stone-100 dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#92a199]"
                >
                  Invert
                </button>
                <button
                  onClick={pickRandom}
                  title="Randomly pick an attendee to call"
                  className="flex items-center gap-1 rounded-lg border border-[#e3e1d8] bg-white px-2 py-1 text-[11px] font-medium text-purple-600 hover:bg-purple-50 dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-purple-300"
                >
                  <Shuffle className="h-3 w-3" />
                  <span>Random</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Random Picker Callout Modal */}
      {randomAttendee && (
        <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50/80 p-3.5 shadow-sm dark:border-purple-900 dark:bg-purple-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200">
              <Sparkles className="h-4 w-4" />
              <span className="font-bold text-xs uppercase tracking-wider">Random Roll Call Picker</span>
            </div>
            <button
              onClick={() => setRandomAttendee(null)}
              className="text-xs font-semibold text-[#6b7770] hover:text-[#1d2b25]"
            >
              Dismiss
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <div className="text-base font-bold text-[#1d2b25] dark:text-[#e8efe9]">
                {randomAttendee.name}
              </div>
              <div className="text-xs text-[#6b7770] dark:text-[#92a199]">
                {randomAttendee.unit} {randomAttendee.tag ? `• ${randomAttendee.tag}` : ''} • Ph: {randomAttendee.phone}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!isMemberPresent(session, randomAttendee.id)) {
                    toggleAttendance(randomAttendee.id);
                  }
                  setRandomAttendee(null);
                }}
                className="rounded-lg bg-[#116b52] px-3 py-1.5 text-xs font-semibold text-white shadow-xs dark:bg-[#3fbf95] dark:text-[#0b1410]"
              >
                Mark Present
              </button>
              <button
                onClick={pickRandom}
                className="rounded-lg border border-purple-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-purple-800 dark:border-purple-800 dark:bg-purple-900 dark:text-purple-200"
              >
                Pick Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendee Roster List */}
      <div className="space-y-2">
        {filteredMembers.length === 0 ? (
          <div className="rounded-xl border border-[#e3e1d8] bg-white p-8 text-center dark:border-[#2b3731] dark:bg-[#1b2420]">
            <p className="text-sm font-medium text-[#6b7770] dark:text-[#92a199]">
              No attendees found matching current search and filters.
            </p>
            <button
              onClick={() => {
                setQuery('');
                setStatusFilter('all');
                setSelectedUnit('all');
              }}
              className="mt-3 text-xs font-semibold text-[#116b52] underline dark:text-[#3fbf95]"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'group' ? (
          /* Pairs / Groups Card View */
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(groupedMembers).map(([grpName, groupMemberList]) => {
              const groupPresentCount = groupMemberList.filter((m) => isMemberPresent(session, m.id)).length;
              const allPresent = groupPresentCount === groupMemberList.length && groupMemberList.length > 0;
              const somePresent = groupPresentCount > 0 && !allPresent;

              return (
                <div
                  key={grpName}
                  className={`rounded-2xl border p-3.5 transition-all shadow-xs ${
                    allPresent
                      ? 'border-[#116b52]/40 bg-[#e3f3ec]/50 dark:border-[#3fbf95]/40 dark:bg-[#1e3a2f]/40'
                      : somePresent
                      ? 'border-amber-400/40 bg-amber-50/30 dark:border-amber-600/40 dark:bg-amber-950/20'
                      : 'border-[#e3e1d8] bg-white dark:border-[#2b3731] dark:bg-[#1b2420]'
                  }`}
                >
                  {/* Group Card Header */}
                  <div className="flex items-center justify-between border-b border-[#e3e1d8]/80 pb-2.5 mb-2.5 dark:border-[#2b3731]/80">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Users className="h-4 w-4 shrink-0 text-[#116b52] dark:text-[#3fbf95]" />
                      <span className="truncate font-bold text-sm text-[#1d2b25] dark:text-[#e8efe9]">
                        {grpName}
                      </span>
                      <span className="shrink-0 rounded-full bg-[#f6f5f0] px-2 py-0.5 text-[10px] font-bold text-[#6b7770] dark:bg-[#25322c] dark:text-[#92a199]">
                        {groupPresentCount}/{groupMemberList.length}
                      </span>
                    </div>

                    {isOngoing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => markGroupPresent(groupMemberList)}
                          title="Mark entire pair/group present"
                          className="rounded-lg bg-[#116b52]/10 px-2 py-1 text-[11px] font-bold text-[#116b52] hover:bg-[#116b52]/20 dark:bg-[#3fbf95]/15 dark:text-[#3fbf95]"
                        >
                          ✓ Mark All
                        </button>
                        <button
                          type="button"
                          onClick={() => clearGroupMarks(groupMemberList)}
                          title="Clear marks for this group"
                          className="rounded-lg px-1.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Group Members List */}
                  <div className="space-y-1.5">
                    {groupMemberList.map((member) => {
                      const isPresent = isMemberPresent(session, member.id);
                      const mark = session.marks[member.id];
                      const timestamp = getMarkTimestamp(mark);
                      const status = getMarkStatus(mark);
                      const phone = getPhoneValue(member, session.fields);
                      const whatsappUrl = phone ? buildWhatsAppLink(phone, settings.whatsappCountryCode) : null;

                      return (
                        <div
                          key={member.id}
                          className={`flex items-center justify-between gap-2 rounded-xl border p-2 transition ${
                            isPresent
                              ? 'border-[#116b52]/30 bg-[#e3f3ec]/70 dark:border-[#3fbf95]/30 dark:bg-[#1e3a2f]/60'
                              : 'border-[#e3e1d8]/70 bg-[#faf9f5] dark:border-[#2b3731]/70 dark:bg-[#151c19]'
                          }`}
                        >
                          <div
                            onClick={() => isOngoing && toggleAttendance(member.id)}
                            className={`flex flex-1 items-center gap-2.5 min-w-0 select-none ${
                              isOngoing ? 'cursor-pointer' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isPresent}
                              disabled={!isOngoing}
                              onChange={() => toggleAttendance(member.id)}
                              aria-label={`Mark attendance for ${member.name}`}
                              className="h-5 w-5 shrink-0 rounded-md accent-[#116b52] cursor-pointer dark:accent-[#3fbf95]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold text-xs sm:text-sm text-[#1d2b25] dark:text-[#e8efe9]">
                                {member.name}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#6b7770] dark:text-[#92a199]">
                                <span className="truncate">{member.unit}</span>
                                {isPresent && timestamp && (
                                  <span className="text-[#116b52] font-semibold dark:text-[#3fbf95]">
                                    • {formatTimeOnly(timestamp)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Phone & WhatsApp */}
                          <div className="flex items-center gap-1 shrink-0">
                            {phone && (
                              <a
                                href={`tel:${phone.split('/')[0].replace(/\s+/g, '')}`}
                                title={`Call ${member.name}`}
                                className="rounded-lg border border-[#e3e1d8] bg-white p-1.5 text-[#6b7770] hover:text-emerald-700 dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#92a199]"
                              >
                                <Phone className="h-3 w-3" />
                              </a>
                            )}
                            {whatsappUrl && (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Chat with ${member.name} on WhatsApp`}
                                className="rounded-lg border border-[#e3e1d8] bg-white p-1.5 text-[#6b7770] hover:text-emerald-700 dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#92a199]"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Individual List View */
          filteredMembers.map((member) => {
            const isPresent = isMemberPresent(session, member.id);
            const mark = session.marks[member.id];
            const timestamp = getMarkTimestamp(mark);
            const status = getMarkStatus(mark);
            const markDetail = typeof mark === 'object' ? mark : undefined;
            const phone = getPhoneValue(member, session.fields);
            const group = getGroupValue(member, session.fields);
            const whatsappUrl = phone ? buildWhatsAppLink(phone, settings.whatsappCountryCode) : null;

            return (
              <div
                key={member.id}
                className={`group relative flex flex-col gap-2 rounded-xl border p-3 transition-all sm:flex-row sm:items-center sm:justify-between ${
                  isPresent
                    ? 'border-[#116b52]/30 bg-[#e3f3ec]/60 dark:border-[#3fbf95]/30 dark:bg-[#1e3a2f]/50'
                    : 'border-[#e3e1d8] bg-white hover:border-[#116b52]/40 dark:border-[#2b3731] dark:bg-[#1b2420] dark:hover:border-[#3fbf95]/40'
                }`}
              >
                {/* Left checkable row */}
                <div
                  onClick={() => isOngoing && toggleAttendance(member.id)}
                  className={`flex flex-1 items-start gap-3 select-none ${
                    isOngoing ? 'cursor-pointer' : ''
                  }`}
                >
                  {/* Large tactile touch checkbox (44x44 tap target) */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isPresent}
                      disabled={!isOngoing}
                      onChange={() => toggleAttendance(member.id)}
                      aria-label={`Mark attendance for ${member.name}`}
                      className="h-6 w-6 cursor-pointer rounded-md accent-[#116b52] transition-transform active:scale-90 dark:accent-[#3fbf95]"
                    />
                  </div>

                  {/* Member Identity & Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-sm sm:text-base text-[#1d2b25] dark:text-[#e8efe9]">
                        {member.name}
                      </span>
                      {group && (
                        <span className="rounded-full bg-[#116b52]/10 px-2 py-0.5 text-[10px] font-bold text-[#116b52] dark:bg-[#3fbf95]/15 dark:text-[#3fbf95]">
                          {group}
                        </span>
                      )}
                      {member.tag && (
                        <span className="rounded-full bg-[#e3e1d8] px-2 py-0.5 text-[10px] font-bold text-[#1d2b25] dark:bg-[#2b3731] dark:text-[#e8efe9]">
                          {member.tag}
                        </span>
                      )}
                      {status === 'late' && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Late
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#6b7770] dark:text-[#92a199]">
                      <span className="font-medium">{member.unit}</span>
                      {phone && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[11px]">{phone}</span>
                        </>
                      )}
                    </div>

                    {/* Timestamp & Notes Badge */}
                    {isPresent && timestamp && (
                      <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-[#116b52] dark:text-[#3fbf95]">
                        <span>✓ {formatDateTime(timestamp)}</span>
                        {markDetail?.note && (
                          <span className="text-[#6b7770] dark:text-[#92a199]">
                            • Note: {markDetail.note}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Action buttons (Call, WhatsApp, Mark Late, Add Note) */}
                <div className="flex items-center justify-end gap-1.5 border-t border-[#e3e1d8]/50 pt-2 sm:border-0 sm:pt-0">
                  {/* Phone Dial Link */}
                  {phone && (
                    <a
                      href={`tel:${phone.split('/')[0].replace(/\s+/g, '')}`}
                      title={`Call ${member.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3e1d8] bg-white text-[#6b7770] transition hover:bg-emerald-50 hover:text-emerald-700 dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#92a199]"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  )}

                  {/* WhatsApp Link */}
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Chat with ${member.name} on WhatsApp`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3e1d8] bg-white text-[#6b7770] transition hover:bg-emerald-50 hover:text-emerald-700 dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#92a199]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  )}

                  {/* Mark as Late button */}
                  {isOngoing && isPresent && status !== 'late' && (
                    <button
                      onClick={() => setMemberStatus(member.id, 'late')}
                      title="Tag as arrived late"
                      className="rounded-lg border border-[#e3e1d8] bg-white px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-50 dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-amber-400"
                    >
                      Late
                    </button>
                  )}

                  {/* Add note toggle */}
                  {isOngoing && (
                    <button
                      onClick={() => {
                        if (activeNoteMemberId === member.id) {
                          setActiveNoteMemberId(null);
                        } else {
                          setActiveNoteMemberId(member.id);
                          setNoteInput(markDetail?.note || '');
                        }
                      }}
                      title="Add note for this attendance record"
                      className="rounded-lg border border-[#e3e1d8] bg-white px-2 py-1 text-[11px] font-medium text-[#6b7770] hover:bg-stone-100 dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#92a199]"
                    >
                      {markDetail?.note ? 'Edit Note' : '+ Note'}
                    </button>
                  )}
                </div>

                {/* Inline Note Editor */}
                {activeNoteMemberId === member.id && (
                  <div className="w-full border-t border-[#e3e1d8] pt-2 dark:border-[#2b3731]">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add note (e.g., Excused for choir duty, late 20 min)..."
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setMemberStatus(member.id, isPresent ? (status as any) : 'present', noteInput);
                            setActiveNoteMemberId(null);
                          }
                        }}
                        className="flex-1 rounded-lg border border-[#e3e1d8] bg-white px-2.5 py-1 text-xs text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
                      />
                      <button
                        onClick={() => {
                          setMemberStatus(member.id, isPresent ? (status as any) : 'present', noteInput);
                          setActiveNoteMemberId(null);
                        }}
                        className="rounded-lg bg-[#116b52] px-2.5 py-1 text-xs font-semibold text-white dark:bg-[#3fbf95] dark:text-[#0b1410]"
                      >
                        Save Note
                      </button>
                      <button
                        onClick={() => setActiveNoteMemberId(null)}
                        className="text-xs text-[#6b7770]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Control Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#e3e1d8] bg-[#f6f5f0]/95 p-3 backdrop-blur-md dark:border-[#2b3731] dark:bg-[#121816]/95">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#116b52] dark:text-[#3fbf95]">
              {presentCount} / {totalCount}
            </span>
            <span className="text-xs text-[#6b7770] dark:text-[#92a199]">
              ({percentage}% Present)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 rounded-xl border border-[#e3e1d8] bg-white px-3 py-2 text-xs font-semibold text-[#1d2b25] shadow-xs transition hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
              >
                <Download className="h-4 w-4 text-[#116b52] dark:text-[#3fbf95]" />
                <span className="hidden sm:inline">Export Log</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#6b7770]" />
              </button>

              {showExportMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-[#e3e1d8] bg-white p-2 shadow-xl dark:border-[#2b3731] dark:bg-[#1b2420]">
                  <div className="px-2 py-1 text-[11px] font-bold text-[#6b7770] uppercase tracking-wider dark:text-[#92a199]">
                    Export Options (Offline)
                  </div>
                  <button
                    onClick={() => {
                      exportSessionToCSV(session);
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[#1d2b25] hover:bg-[#e3f3ec] dark:text-[#e8efe9] dark:hover:bg-[#1e3a2f]"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <div className="text-left">
                      <div className="font-semibold">Export to CSV</div>
                      <div className="text-[10px] text-[#6b7770]">For Excel, Sheets &amp; Pandas</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      exportSessionToPDF(session);
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[#1d2b25] hover:bg-[#e3f3ec] dark:text-[#e8efe9] dark:hover:bg-[#1e3a2f]"
                  >
                    <FileCheck className="h-4 w-4 text-rose-600" />
                    <div className="text-left">
                      <div className="font-semibold">Printable PDF Report</div>
                      <div className="text-[10px] text-[#6b7770]">With sign-off block</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      exportAuditLogText(session);
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[#1d2b25] hover:bg-[#e3f3ec] dark:text-[#e8efe9] dark:hover:bg-[#1e3a2f]"
                  >
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div className="text-left">
                      <div className="font-semibold">Chronological Audit Log</div>
                      <div className="text-[10px] text-[#6b7770]">Timestamped .log text file</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Finish Session Button or View Analysis */}
            {isOngoing ? (
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 rounded-xl bg-[#116b52] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md transition hover:bg-[#0e5742] active:scale-95 dark:bg-[#3fbf95] dark:text-[#0b1410] dark:hover:bg-[#35a882]"
              >
                <UserCheck className="h-4 w-4" />
                <span>Finish &amp; Close Register</span>
              </button>
            ) : (
              <button
                onClick={() => onViewDetails(session)}
                className="flex items-center gap-2 rounded-xl bg-[#116b52] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md transition hover:bg-[#0e5742] dark:bg-[#3fbf95] dark:text-[#0b1410]"
              >
                <span>View Full Analysis</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
