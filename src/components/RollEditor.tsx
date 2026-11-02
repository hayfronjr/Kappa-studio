import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  UserPlus,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Check,
  X,
  Play,
  Upload,
  Download,
  Phone,
  Tag,
  Building,
  Sliders,
  Plus,
  Layers,
  Sparkles,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';
import { Roll, Member, RollField, FieldType } from '../types';
import { uid, getMemberValue, getPhoneValue, getGroupValue, buildWhatsAppLink, loadSettings } from '../utils/storage';
import { exportRosterToCSV, parseCSVToMembers } from '../utils/exportUtils';

interface RollEditorProps {
  roll: Roll;
  onUpdateRoll: (updated: Roll) => void;
  onDeleteRoll: (rollId: string) => void;
  onStartSession: (roll: Roll) => void;
  onBack: () => void;
}

export const RollEditor: React.FC<RollEditorProps> = ({
  roll,
  onUpdateRoll,
  onDeleteRoll,
  onStartSession,
  onBack,
}) => {
  const [settings] = useState(() => loadSettings());
  const [query, setQuery] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(roll.name);

  // Schema & Fields Manager
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldIsGroup, setNewFieldIsGroup] = useState(false);
  const [newFieldIsPhone, setNewFieldIsPhone] = useState(false);

  // Dynamic Add Member state (fieldId -> value)
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberData, setNewMemberData] = useState<Record<string, string>>({});

  // View mode: Flat list or Grouped by Group parameter (e.g. "Pair 1", "Pair 2")
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  // Edit member
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberData, setEditMemberData] = useState<Record<string, string>>({});

  // Import / Export states
  const [notification, setNotification] = useState<string | null>(null);
  const [confirmDeleteRoll, setConfirmDeleteRoll] = useState(false);
  const [confirmDeleteMemberId, setConfirmDeleteMemberId] = useState<string | null>(null);

  const fields = roll.fields || [
    { id: 'unit', name: 'Affiliated Group / Unit', type: 'text', required: true },
    { id: 'phone', name: 'Phone', type: 'phone', required: false, isPhoneField: true },
    { id: 'tag', name: 'Pair #', type: 'tag', required: false, isGroupField: true },
  ];

  const groupField = fields.find((f) => f.id === roll.groupFieldId) || fields.find((f) => f.isGroupField);
  const phoneField = fields.find((f) => f.isPhoneField || f.type === 'phone');

  // Filtered members
  const filteredMembers = useMemo(() => {
    const q = query.toLowerCase().trim();
    return roll.members.filter((m) => {
      if (selectedGroupFilter !== 'all') {
        const gVal = getGroupValue(m, roll.groupFieldId, fields);
        if (gVal !== selectedGroupFilter) return false;
      }

      if (!q) return true;

      if (m.name.toLowerCase().includes(q)) return true;
      return Object.values(m.data || {}).some((v) =>
        String(v).toLowerCase().includes(q)
      );
    });
  }, [roll.members, query, selectedGroupFilter, roll.groupFieldId, fields]);

  // Grouped members map (for Group View)
  const groupedMembers = useMemo(() => {
    const map = new Map<string, Member[]>();
    filteredMembers.forEach((m) => {
      const gVal = getGroupValue(m, roll.groupFieldId, fields) || 'Unassigned';
      const arr = map.get(gVal) || [];
      arr.push(m);
      map.set(gVal, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredMembers, roll.groupFieldId, fields]);

  // Unique groups for quick filter
  const uniqueGroups = useMemo(() => {
    const set = new Set<string>();
    roll.members.forEach((m) => {
      const gVal = getGroupValue(m, roll.groupFieldId, fields);
      if (gVal && gVal.trim()) set.add(gVal.trim());
    });
    return Array.from(set).sort();
  }, [roll.members, roll.groupFieldId, fields]);

  // Handle adding new member with dynamic parameters
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    // Validate required fields
    for (const f of fields) {
      if (f.required && !newMemberData[f.id]?.trim()) {
        alert(`Please fill in required parameter: ${f.name}`);
        return;
      }
    }

    const member: Member = {
      id: uid('m'),
      name: newMemberName.trim(),
      data: { ...newMemberData },
      unit: newMemberData['unit'] || '',
      phone: newMemberData['phone'] || '',
      tag: newMemberData['tag'] || (groupField ? newMemberData[groupField.id] : ''),
    };

    onUpdateRoll({
      ...roll,
      members: [...roll.members, member],
      updatedAt: new Date().toISOString(),
    });

    setNewMemberName('');
    setNewMemberData({});
    setNotification(`Added ${member.name}`);
    setTimeout(() => setNotification(null), 2500);
  };

  // Add custom parameter / field to roll
  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    const fieldId = uid('f');
    const newField: RollField = {
      id: fieldId,
      name: newFieldName.trim(),
      type: newFieldType,
      required: newFieldRequired,
      isGroupField: newFieldIsGroup,
      isPhoneField: newFieldIsPhone,
    };

    let updatedGroupFieldId = roll.groupFieldId;
    if (newFieldIsGroup) {
      updatedGroupFieldId = fieldId;
    }

    const updatedFields = [...fields, newField];
    onUpdateRoll({
      ...roll,
      fields: updatedFields,
      groupFieldId: updatedGroupFieldId,
      updatedAt: new Date().toISOString(),
    });

    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setNewFieldIsGroup(false);
    setNewFieldIsPhone(false);
  };

  const handleDeleteField = (fieldId: string) => {
    if (fields.length <= 1) {
      alert('You must have at least one parameter.');
      return;
    }
    const updatedFields = fields.filter((f) => f.id !== fieldId);
    onUpdateRoll({
      ...roll,
      fields: updatedFields,
      groupFieldId: roll.groupFieldId === fieldId ? undefined : roll.groupFieldId,
      updatedAt: new Date().toISOString(),
    });
  };

  // Preset Template loader (Football Coach, Staff Roster, Class)
  const applyPresetTemplate = (preset: 'football' | 'staff' | 'church' | 'class') => {
    let presetFields: RollField[] = [];
    let groupFieldId = '';

    if (preset === 'football') {
      presetFields = [
        { id: 'squad_no', name: 'Squad #', type: 'number', required: true },
        { id: 'position', name: 'Position', type: 'text', required: true, isGroupField: true },
        { id: 'country', name: 'Country / Nationality', type: 'text' },
        { id: 'contact', name: 'Phone Contact', type: 'phone', isPhoneField: true },
      ];
      groupFieldId = 'position';
    } else if (preset === 'staff') {
      presetFields = [
        { id: 'unit', name: 'Department / Unit', type: 'text', required: true, isGroupField: true },
        { id: 'role', name: 'Job Title', type: 'text', required: true },
        { id: 'phone', name: 'Phone Number', type: 'phone', isPhoneField: true },
        { id: 'status', name: 'Employment Status (Intern / Full-Time)', type: 'tag' },
      ];
      groupFieldId = 'unit';
    } else if (preset === 'class') {
      presetFields = [
        { id: 'student_id', name: 'Student ID', type: 'text', required: true },
        { id: 'group_no', name: 'Lab / Project Group #', type: 'tag', isGroupField: true },
        { id: 'phone', name: 'Phone', type: 'phone', isPhoneField: true },
      ];
      groupFieldId = 'group_no';
    } else {
      presetFields = [
        { id: 'unit', name: 'Affiliated Group / Unit', type: 'text', required: true },
        { id: 'phone', name: 'Phone', type: 'phone', isPhoneField: true },
        { id: 'tag', name: 'Pair #', type: 'tag', isGroupField: true },
      ];
      groupFieldId = 'tag';
    }

    onUpdateRoll({
      ...roll,
      fields: presetFields,
      groupFieldId,
      updatedAt: new Date().toISOString(),
    });
    setNotification(`Applied preset parameters!`);
    setTimeout(() => setNotification(null), 3000);
  };

  // CSV Export for mass editing
  const handleExportCSV = async () => {
    const ok = await exportRosterToCSV(roll);
    if (ok) {
      setNotification('Roster exported to CSV! You can edit in Excel or AI and re-import.');
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // CSV Import (from mass edit or external spreadsheet)
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const { members } = parseCSVToMembers(text, roll, uid);
      if (members.length === 0) {
        alert('Could not find valid rows in the CSV file.');
        return;
      }

      const replace = confirm(
        `Found ${members.length} members in CSV.\n\nClick OK to REPLACE the existing roster, or CANCEL to MERGE with existing members.`
      );

      let updatedMembers: Member[] = [];
      if (replace) {
        updatedMembers = members;
      } else {
        // Merge: update matching by name or add new
        const existingNames = new Map(roll.members.map((m) => [m.name.toLowerCase().trim(), m]));
        const merged = [...roll.members];

        members.forEach((imported) => {
          const key = imported.name.toLowerCase().trim();
          const match = existingNames.get(key);
          if (match) {
            match.data = { ...match.data, ...imported.data };
            match.unit = imported.data['unit'] || match.unit;
            match.phone = imported.data['phone'] || match.phone;
            match.tag = imported.data['tag'] || match.tag;
          } else {
            merged.push(imported);
          }
        });
        updatedMembers = merged;
      }

      onUpdateRoll({
        ...roll,
        members: updatedMembers,
        updatedAt: new Date().toISOString(),
      });

      setNotification(`Imported ${members.length} members successfully!`);
      setTimeout(() => setNotification(null), 3500);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const startEditMember = (m: Member) => {
    setEditingMemberId(m.id);
    setEditMemberName(m.name);
    setEditMemberData({ ...(m.data || {}) });
  };

  const saveEditMember = () => {
    if (!editingMemberId) return;
    const updated = roll.members.map((m) => {
      if (m.id === editingMemberId) {
        return {
          ...m,
          name: editMemberName.trim() || m.name,
          data: { ...editMemberData },
          unit: editMemberData['unit'] || m.unit,
          phone: editMemberData['phone'] || m.phone,
          tag: editMemberData['tag'] || (groupField ? editMemberData[groupField.id] : m.tag),
        };
      }
      return m;
    });

    onUpdateRoll({
      ...roll,
      members: updated,
      updatedAt: new Date().toISOString(),
    });
    setEditingMemberId(null);
  };

  const handleDeleteMember = (memberId: string) => {
    onUpdateRoll({
      ...roll,
      members: roll.members.filter((m) => m.id !== memberId),
      updatedAt: new Date().toISOString(),
    });
    setConfirmDeleteMemberId(null);
  };

  return (
    <div className="mx-auto max-w-4xl pb-16">
      {/* Top Banner Card */}
      <div className="mb-6 rounded-2xl border border-[#e3e1d8] bg-white p-4 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-1.5 text-xs font-semibold text-[#1d2b25] transition hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onStartSession(roll)}
              className="flex items-center gap-1.5 rounded-lg bg-[#116b52] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0e5742] dark:bg-[#3fbf95] dark:text-[#0b1410]"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Take Register Now</span>
            </button>

            {confirmDeleteRoll ? (
              <button
                onClick={() => onDeleteRoll(roll.id)}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
              >
                Confirm Delete?
              </button>
            ) : (
              <button
                onClick={() => setConfirmDeleteRoll(true)}
                title="Delete this roster"
                className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Title editing */}
        <div className="mt-4">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full max-w-md rounded-lg border border-[#116b52] bg-white px-3 py-1.5 text-base font-bold text-[#1d2b25] dark:bg-[#121816] dark:text-[#e8efe9]"
              />
              <button
                onClick={() => {
                  if (nameInput.trim()) {
                    onUpdateRoll({ ...roll, name: nameInput.trim() });
                  }
                  setEditingName(false);
                }}
                className="rounded-lg bg-[#116b52] px-3 py-1.5 text-xs font-semibold text-white dark:bg-[#3fbf95] dark:text-[#0b1410]"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-xl sm:text-2xl text-[#1d2b25] dark:text-[#e8efe9]">
                {roll.name}
              </h1>
              <button
                onClick={() => setEditingName(true)}
                className="rounded-lg p-1 text-[#6b7770] hover:bg-stone-100 dark:text-[#92a199] dark:hover:bg-stone-800"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-[#116b52] dark:text-[#3fbf95]">
              {roll.members.length} People Registered
            </span>
            <span>•</span>
            <span className="text-[#6b7770] dark:text-[#92a199]">
              {fields.length} Custom Parameters (
              {fields.map((f) => f.name).join(', ')})
            </span>
            <button
              onClick={() => setShowSchemaModal(true)}
              className="ml-1 inline-flex items-center gap-1 rounded-md border border-[#116b52]/40 bg-[#e3f3ec] px-2 py-0.5 text-[11px] font-semibold text-[#116b52] hover:bg-[#d4ede1] dark:border-[#3fbf95]/40 dark:bg-[#1e3a2f] dark:text-[#3fbf95]"
            >
              <Sliders className="h-3 w-3" />
              <span>Customize Parameters</span>
            </button>
          </div>
        </div>

        {notification && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Mass-Editing Export / Import Toolbar */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e3e1d8] pt-3 text-xs dark:border-[#2b3731]">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-1.5 font-semibold text-[#1d2b25] transition hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
            title="Download CSV of this roster to mass edit in Excel, Python, or AI tools"
          >
            <Download className="h-3.5 w-3.5 text-[#116b52] dark:text-[#3fbf95]" />
            <span>Export Roster CSV (For AI / Mass Edit)</span>
          </button>

          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-1.5 font-semibold text-[#1d2b25] transition hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]">
            <Upload className="h-3.5 w-3.5 text-[#116b52] dark:text-[#3fbf95]" />
            <span>Import / Re-upload Edited CSV</span>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleCSVImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Add New Person Form with Custom Parameters */}
      <div className="mb-6 rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-[#116b52] dark:text-[#3fbf95]">
            Add a Person to {roll.name}
          </h2>
          <span className="text-[11px] text-[#6b7770] dark:text-[#92a199]">
            * Required fields
          </span>
        </div>

        <form onSubmit={handleAddMember} className="mt-3.5 space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
            {/* Primary Name Field */}
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-semibold text-[#1d2b25] dark:text-[#e8efe9] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="Full Name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="w-full rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[#116b52] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
              />
            </div>

            {/* Dynamic Custom Fields */}
            {fields.map((field) => (
              <div key={field.id} className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-[#1d2b25] dark:text-[#e8efe9] mb-1 truncate">
                  {field.name} {field.required ? '*' : ''}
                </label>
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'phone' ? 'tel' : 'text'}
                  required={field.required}
                  placeholder={field.name}
                  value={newMemberData[field.id] || ''}
                  onChange={(e) =>
                    setNewMemberData({
                      ...newMemberData,
                      [field.id]: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[#116b52] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-[#116b52] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0e5742] active:scale-95 dark:bg-[#3fbf95] dark:text-[#0b1410]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Member</span>
            </button>
          </div>
        </form>
      </div>

      {/* Roster View Controls (Search, View Mode, Grouping Filter) */}
      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7770] dark:text-[#92a199]" />
          <input
            type="search"
            placeholder="Search roster members..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-[#e3e1d8] bg-white py-2 pl-9 pr-3 text-xs text-[#1d2b25] shadow-2xs outline-hidden placeholder:text-[#6b7770] focus:border-[#116b52] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
          />
        </div>

        {/* Group Filter & View Mode Toggles */}
        <div className="flex items-center gap-2">
          {uniqueGroups.length > 0 && (
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="rounded-xl border border-[#e3e1d8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
            >
              <option value="all">
                All {groupField ? groupField.name : 'Groups'} ({uniqueGroups.length})
              </option>
              {uniqueGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}

          {/* Group View Toggle */}
          {groupField && (
            <div className="flex rounded-xl border border-[#e3e1d8] bg-white p-0.5 text-xs font-medium dark:border-[#2b3731] dark:bg-[#1b2420]">
              <button
                onClick={() => setViewMode('flat')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  viewMode === 'flat'
                    ? 'bg-[#116b52] text-white dark:bg-[#3fbf95] dark:text-[#0b1410]'
                    : 'text-[#6b7770]'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  viewMode === 'grouped'
                    ? 'bg-[#116b52] text-white dark:bg-[#3fbf95] dark:text-[#0b1410]'
                    : 'text-[#6b7770]'
                }`}
              >
                Group Cards
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Roster Members Display: Grouped or Flat */}
      {viewMode === 'grouped' && groupField ? (
        <div className="space-y-4">
          {groupedMembers.map(([groupName, membersInGroup]) => (
            <div
              key={groupName}
              className="rounded-2xl border border-[#e3e1d8] bg-white p-4 shadow-2xs dark:border-[#2b3731] dark:bg-[#1b2420]"
            >
              <div className="flex items-center justify-between border-b border-[#e3e1d8] pb-2 mb-3 dark:border-[#2b3731]">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#116b52] px-2.5 py-0.5 text-xs font-bold text-white dark:bg-[#3fbf95] dark:text-[#0b1410]">
                    {groupField.name}: {groupName}
                  </span>
                  <span className="text-xs text-[#6b7770] dark:text-[#92a199]">
                    ({membersInGroup.length} members)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {membersInGroup.map((m) => {
                  const phone = getPhoneValue(m, fields);
                  const waLink = buildWhatsAppLink(phone, settings.whatsappCountryCode);

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3 dark:border-[#2b3731] dark:bg-[#121816]"
                    >
                      <div>
                        <div className="font-semibold text-xs text-[#1d2b25] dark:text-[#e8efe9]">
                          {m.name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-1 text-[11px] text-[#6b7770] dark:text-[#92a199]">
                          {fields
                            .filter((f) => f.id !== groupField.id)
                            .map((f) => {
                              const val = getMemberValue(m, f.id);
                              if (!val) return null;
                              return (
                                <span key={f.id} className="mr-1.5">
                                  {val}
                                </span>
                              );
                            })}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {phone && (
                          <>
                            <a
                              href={`tel:${phone.split('/')[0].replace(/\s+/g, '')}`}
                              title={`Call ${m.name}`}
                              className="rounded-lg p-1 text-[#6b7770] hover:text-[#116b52] dark:text-[#92a199]"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`WhatsApp ${m.name}`}
                                className="rounded-lg p-1 text-[#6b7770] hover:text-emerald-600 dark:text-[#92a199]"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => startEditMember(m)}
                          className="rounded-lg p-1 text-[#6b7770] hover:text-[#116b52]"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat List View */
        <div className="space-y-2">
          {filteredMembers.length === 0 ? (
            <div className="rounded-xl border border-[#e3e1d8] bg-white p-6 text-center text-xs text-[#6b7770] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#92a199]">
              No members match your search criteria.
            </div>
          ) : (
            filteredMembers.map((member, index) => {
              const isEditing = editingMemberId === member.id;
              const phone = getPhoneValue(member, fields);
              const waLink = buildWhatsAppLink(phone, settings.whatsappCountryCode);

              if (isEditing) {
                return (
                  <div
                    key={member.id}
                    className="rounded-xl border border-[#116b52] bg-white p-3 shadow-md dark:border-[#3fbf95] dark:bg-[#1b2420]"
                  >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                      <div>
                        <label className="text-[10px] text-[#6b7770] font-semibold">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editMemberName}
                          onChange={(e) => setEditMemberName(e.target.value)}
                          className="w-full rounded-lg border border-[#e3e1d8] p-1.5 text-xs text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                        />
                      </div>
                      {fields.map((f) => (
                        <div key={f.id}>
                          <label className="text-[10px] text-[#6b7770] font-semibold truncate block">
                            {f.name}
                          </label>
                          <input
                            type="text"
                            value={editMemberData[f.id] || ''}
                            onChange={(e) =>
                              setEditMemberData({
                                ...editMemberData,
                                [f.id]: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-[#e3e1d8] p-1.5 text-xs text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-2.5 flex justify-end gap-2">
                      <button
                        onClick={() => setEditingMemberId(null)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-[#6b7770]"
                      >
                        <X className="h-3 w-3" />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={saveEditMember}
                        className="flex items-center gap-1 rounded-lg bg-[#116b52] px-3 py-1 text-xs font-semibold text-white dark:bg-[#3fbf95] dark:text-[#0b1410]"
                      >
                        <Check className="h-3 w-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-xl border border-[#e3e1d8] bg-white p-3 transition hover:border-[#116b52]/40 dark:border-[#2b3731] dark:bg-[#1b2420]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#e3f3ec] text-xs font-bold text-[#116b52] dark:bg-[#1e3a2f] dark:text-[#3fbf95]">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-[#1d2b25] dark:text-[#e8efe9]">
                          {member.name}
                        </span>
                        {/* Display badges for defined custom fields */}
                        {fields.map((f) => {
                          const val = getMemberValue(member, f.id);
                          if (!val) return null;
                          if (f.isGroupField) {
                            return (
                              <span
                                key={f.id}
                                className="rounded-full bg-[#116b52]/10 px-2 py-0.2 text-[10px] font-bold text-[#116b52] dark:bg-[#3fbf95]/20 dark:text-[#3fbf95]"
                              >
                                {val}
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>

                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#6b7770] dark:text-[#92a199]">
                        {fields
                          .filter((f) => !f.isGroupField)
                          .map((f, fIdx) => {
                            const val = getMemberValue(member, f.id);
                            if (!val) return null;
                            return (
                              <React.Fragment key={f.id}>
                                {fIdx > 0 && <span>•</span>}
                                <span>{val}</span>
                              </React.Fragment>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {phone && (
                      <>
                        <a
                          href={`tel:${phone.split('/')[0].replace(/\s+/g, '')}`}
                          title={`Call ${member.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e3e1d8] text-[#6b7770] hover:bg-emerald-50 hover:text-emerald-700 dark:border-[#2b3731] dark:text-[#92a199]"
                        >
                          <Phone className="h-3 w-3" />
                        </a>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Chat with ${member.name} on WhatsApp`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e3e1d8] text-[#6b7770] hover:bg-emerald-50 hover:text-emerald-700 dark:border-[#2b3731] dark:text-[#92a199]"
                          >
                            <MessageCircle className="h-3 w-3" />
                          </a>
                        )}
                      </>
                    )}

                    <button
                      onClick={() => startEditMember(member)}
                      className="rounded-lg p-1.5 text-[#6b7770] hover:bg-stone-100 hover:text-[#1d2b25] dark:text-[#92a199]"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    {confirmDeleteMemberId === member.id ? (
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white"
                      >
                        Delete?
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteMemberId(member.id)}
                        className="rounded-lg p-1.5 text-[#6b7770] hover:bg-rose-50 hover:text-rose-600 dark:text-[#92a199]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Schema / Custom Parameter Manager Modal */}
      {showSchemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1b2420]">
            <div className="flex items-center justify-between border-b border-[#e3e1d8] pb-3 dark:border-[#2b3731]">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#116b52] dark:text-[#3fbf95]" />
                <h3 className="font-bold text-base text-[#1d2b25] dark:text-[#e8efe9]">
                  Customize Roster Parameters
                </h3>
              </div>
              <button
                onClick={() => setShowSchemaModal(false)}
                className="rounded-lg p-1 text-[#6b7770] hover:bg-stone-100 dark:text-[#92a199]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Template Presets */}
            <div className="mt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7770] dark:text-[#92a199]">
                Quick Starter Templates:
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => applyPresetTemplate('church')}
                  className="rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-2.5 py-1 text-[#1d2b25] hover:bg-emerald-50 dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                >
                  SNS / Pairs &amp; Unit
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTemplate('football')}
                  className="rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-2.5 py-1 text-[#1d2b25] hover:bg-emerald-50 dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                >
                  ⚽ Football / Sports Team
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTemplate('staff')}
                  className="rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-2.5 py-1 text-[#1d2b25] hover:bg-emerald-50 dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                >
                  🏢 Staff &amp; Employees
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetTemplate('class')}
                  className="rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-2.5 py-1 text-[#1d2b25] hover:bg-emerald-50 dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                >
                  🎓 Class / Lab Groups
                </button>
              </div>
            </div>

            {/* Current Parameters List */}
            <div className="mt-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7770] dark:text-[#92a199]">
                Current Active Parameters:
              </span>
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs dark:border-[#2b3731] dark:bg-[#121816]"
                  >
                    <div>
                      <span className="font-bold text-[#1d2b25] dark:text-[#e8efe9]">
                        {field.name}
                      </span>
                      <span className="ml-2 font-mono text-[10px] text-[#6b7770] dark:text-[#92a199]">
                        ({field.type})
                      </span>
                      {field.required && (
                        <span className="ml-1.5 text-rose-500 font-bold text-[10px]">
                          Required
                        </span>
                      )}
                      {field.isGroupField && (
                        <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Group / Pair
                        </span>
                      )}
                      {field.isPhoneField && (
                        <span className="ml-1.5 rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          Call / WhatsApp
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteField(field.id)}
                      className="rounded-lg p-1 text-[#6b7770] hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Custom Parameter Form */}
            <form onSubmit={handleAddField} className="mt-4 border-t border-[#e3e1d8] pt-3 dark:border-[#2b3731]">
              <span className="text-xs font-bold text-[#116b52] dark:text-[#3fbf95]">
                + Add Another Parameter
              </span>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  placeholder="Parameter Name (e.g. Squad #, Position)"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[#116b52] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                />

                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                  className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs font-medium text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                >
                  <option value="text">Text (General string)</option>
                  <option value="number">Number (e.g. Squad #, Age, Salary)</option>
                  <option value="phone">Phone (Enables Call &amp; WhatsApp)</option>
                  <option value="tag">Tag / Group (e.g. Pair 1, Intern)</option>
                  <option value="email">Email Address</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-[#6b7770] dark:text-[#92a199]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFieldRequired}
                    onChange={(e) => setNewFieldRequired(e.target.checked)}
                    className="rounded accent-[#116b52]"
                  />
                  <span>Required parameter</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFieldIsGroup}
                    onChange={(e) => setNewFieldIsGroup(e.target.checked)}
                    className="rounded accent-[#116b52]"
                  />
                  <span>Group parameter (Pair / Team)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFieldIsPhone}
                    onChange={(e) => setNewFieldIsPhone(e.target.checked)}
                    className="rounded accent-[#116b52]"
                  />
                  <span>Phone parameter</span>
                </label>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSchemaModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-[#6b7770]"
                >
                  Done
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-[#116b52] px-4 py-2 text-xs font-semibold text-white shadow-xs dark:bg-[#3fbf95] dark:text-[#0b1410]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Parameter</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
