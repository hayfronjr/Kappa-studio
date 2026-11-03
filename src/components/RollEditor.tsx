import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Trash2,
  Edit2,
  Check,
  X,
  Play,
  Upload,
  Download,
  Phone,
  Sliders,
  Plus,
  CheckCircle2,
  MessageCircle,
  Lightbulb,
  Clock,
  Calendar,
  Layers,
} from 'lucide-react';
import { Roll, Member, RollField, FieldType, GroupLabelType, MemberTag, LabelConfig } from '../types';
import {
  uid,
  getMemberValue,
  getPhoneValue,
  getGroupValue,
  buildWhatsAppLink,
  loadSettings,
  formatGroupDisplay,
  isMemberTagActive,
  generateAutoLabel,
  getMemberDisplayValues,
} from '../utils/storage';
import { exportRosterToCSV, parseCSVToMembers } from '../utils/exportUtils';

interface RollEditorProps {
  roll: Roll;
  onUpdateRoll: (updated: Roll) => void;
  onDeleteRoll: (rollId: string) => void;
  onStartSession: (roll: Roll) => void;
  onBack: () => void;
}

const TAG_COLOR_PALETTE = [
  { name: 'Rose', color: '#e11d48' },
  { name: 'Forest', color: '#116b52' },
  { name: 'Blue', color: '#2563eb' },
  { name: 'Amber', color: '#d97706' },
  { name: 'Purple', color: '#7c3aed' },
  { name: 'Orange', color: '#ea580c' },
  { name: 'Teal', color: '#0d9488' },
  { name: 'Slate', color: '#475569' },
];

const DAYS_OF_WEEK = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

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
  const [newFieldGroupLabelType, setNewFieldGroupLabelType] = useState<GroupLabelType>('numbers');
  const [newFieldIsPhone, setNewFieldIsPhone] = useState(false);
  const [newFieldIsWhatsappActive, setNewFieldIsWhatsappActive] = useState(true);
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldLabelType, setNewFieldLabelType] = useState<'number' | 'letter' | 'both'>('number');
  const [newFieldLabelPrefix, setNewFieldLabelPrefix] = useState('Pair ');
  const [newFieldLabelStartValue, setNewFieldLabelStartValue] = useState(1);
  const [newFieldLabelStep, setNewFieldLabelStep] = useState(1);
  const [newFieldLabelItemsPer, setNewFieldLabelItemsPer] = useState(2);
  const [newFieldShowInRoster, setNewFieldShowInRoster] = useState(true);
  const [newFieldOrder, setNewFieldOrder] = useState<number>(1);

  // Edit existing parameter state
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState('');
  const [editFieldType, setEditFieldType] = useState<FieldType>('text');
  const [editFieldRequired, setEditFieldRequired] = useState(false);
  const [editFieldIsGroup, setEditFieldIsGroup] = useState(false);
  const [editFieldGroupLabelType, setEditFieldGroupLabelType] = useState<GroupLabelType>('numbers');
  const [editFieldIsPhone, setEditFieldIsPhone] = useState(false);
  const [editFieldIsWhatsappActive, setEditFieldIsWhatsappActive] = useState(true);
  const [editFieldOptions, setEditFieldOptions] = useState('');
  const [editFieldLabelType, setEditFieldLabelType] = useState<'number' | 'letter' | 'both'>('number');
  const [editFieldLabelPrefix, setEditFieldLabelPrefix] = useState('Pair ');
  const [editFieldLabelStartValue, setEditFieldLabelStartValue] = useState(1);
  const [editFieldLabelStep, setEditFieldLabelStep] = useState(1);
  const [editFieldLabelItemsPer, setEditFieldLabelItemsPer] = useState(2);
  const [editFieldShowInRoster, setEditFieldShowInRoster] = useState(true);
  const [editFieldOrder, setEditFieldOrder] = useState<number>(1);

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

  // Member Tag Modal State (Lightbulb feature - multi-parameter display times)
  const [tagModalMember, setTagModalMember] = useState<Member | null>(null);
  const [tagText, setTagText] = useState('');
  const [tagColor, setTagColor] = useState('#e11d48');
  const [tagUntilEnabled, setTagUntilEnabled] = useState(false);
  const [tagUntilDateTime, setTagUntilDateTime] = useState('');
  const [tagForEnabled, setTagForEnabled] = useState(false);
  const [tagForDurationMinutes, setTagForDurationMinutes] = useState(60);
  const [tagEveryEnabled, setTagEveryEnabled] = useState(false);
  const [tagEveryDays, setTagEveryDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [tagEveryStartTime, setTagEveryStartTime] = useState('09:00');
  const [tagEveryEndTime, setTagEveryEndTime] = useState('17:00');

  // Import / Export states
  const [notification, setNotification] = useState<string | null>(null);
  const [confirmDeleteRoll, setConfirmDeleteRoll] = useState(false);
  const [confirmDeleteMemberId, setConfirmDeleteMemberId] = useState<string | null>(null);

  const fields: RollField[] = useMemo(() => {
    if (roll.fields && roll.fields.length > 0) {
      return roll.fields.map((f) => {
        let t = f.type;
        if ((t as string) === 'tag') t = 'label';
        if ((t as string) === 'select') t = 'choice';
        return {
          ...f,
          type: t,
        };
      });
    }
    return [
      { id: 'unit', name: 'Affiliated Group / Unit', type: 'text', required: true },
      { id: 'phone', name: 'Phone', type: 'phone', required: false, isPhoneField: true, isWhatsappActive: true },
      { id: 'tag', name: 'Pair #', type: 'label', required: false, isGroupField: true },
    ];
  }, [roll.fields]);

  const groupField = fields.find((f) => f.id === roll.groupFieldId) || fields.find((f) => f.isGroupField);
  const phoneFields = fields.filter((f) => f.isPhoneField || f.type === 'phone');

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
      if (m.memberTag?.text?.toLowerCase().includes(q)) return true;
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

  // Handle adding new member with dynamic parameters & auto-assigned labels
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

    const memberData: Record<string, string> = { ...newMemberData };

    // Auto-assign labels for any label parameters if left blank
    fields.forEach((f) => {
      if (f.type === 'label' && (!memberData[f.id] || !memberData[f.id].trim())) {
        memberData[f.id] = generateAutoLabel(roll.members.length, f);
      }
    });

    const member: Member = {
      id: uid('m'),
      name: newMemberName.trim(),
      data: memberData,
      unit: memberData['unit'] || '',
      phone: memberData['phone'] || '',
      tag: memberData['tag'] || (groupField ? memberData[groupField.id] : ''),
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
    const isPhone = newFieldType === 'phone' || newFieldIsPhone;

    const labelConfig: LabelConfig | undefined =
      newFieldType === 'label'
        ? {
            labelType: newFieldLabelType,
            prefix: newFieldLabelPrefix,
            startValue: Number(newFieldLabelStartValue) || 1,
            step: Number(newFieldLabelStep) || 1,
            itemsPerLabel: Number(newFieldLabelItemsPer) || 1,
          }
        : undefined;

    const options =
      newFieldType === 'choice' && newFieldOptions.trim()
        ? newFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
        : undefined;

    const newField: RollField = {
      id: fieldId,
      name: newFieldName.trim(),
      type: newFieldType,
      required: newFieldRequired,
      isGroupField: newFieldIsGroup,
      groupLabelType: newFieldIsGroup ? newFieldGroupLabelType : undefined,
      isPhoneField: isPhone,
      isWhatsappActive: isPhone ? newFieldIsWhatsappActive : false,
      showInRoster: newFieldShowInRoster,
      order: Number(newFieldOrder) || (fields.length + 1),
      labelConfig,
      options,
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
    setNewFieldGroupLabelType('numbers');
    setNewFieldIsPhone(false);
    setNewFieldIsWhatsappActive(true);
    setNewFieldShowInRoster(true);
    setNewFieldOrder(fields.length + 2);
    setNewFieldOptions('');
    setNewFieldLabelType('number');
    setNewFieldLabelPrefix('Pair ');
    setNewFieldLabelStartValue(1);
    setNewFieldLabelStep(1);
    setNewFieldLabelItemsPer(2);
  };

  const startEditField = (field: RollField) => {
    setEditingFieldId(field.id);
    setEditFieldName(field.name);
    setEditFieldType(field.type);
    setEditFieldRequired(!!field.required);
    setEditFieldIsGroup(!!field.isGroupField || roll.groupFieldId === field.id);
    setEditFieldGroupLabelType(field.groupLabelType || 'numbers');
    setEditFieldIsPhone(!!field.isPhoneField || field.type === 'phone');
    setEditFieldIsWhatsappActive(field.isWhatsappActive !== false);
    setEditFieldShowInRoster(field.showInRoster !== false);
    setEditFieldOrder(field.order ?? (fields.findIndex((f) => f.id === field.id) + 1));
    setEditFieldOptions(field.options ? field.options.join(', ') : '');
    if (field.labelConfig) {
      setEditFieldLabelType(field.labelConfig.labelType);
      setEditFieldLabelPrefix(field.labelConfig.prefix || '');
      setEditFieldLabelStartValue(field.labelConfig.startValue);
      setEditFieldLabelStep(field.labelConfig.step);
      setEditFieldLabelItemsPer(field.labelConfig.itemsPerLabel || 1);
    } else {
      setEditFieldLabelType('number');
      setEditFieldLabelPrefix(/pair/i.test(field.name) ? 'Pair ' : 'Group ');
      setEditFieldLabelStartValue(1);
      setEditFieldLabelStep(1);
      setEditFieldLabelItemsPer(/pair/i.test(field.name) ? 2 : 1);
    }
  };

  const saveEditField = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingFieldId || !editFieldName.trim()) return;

    let updatedGroupFieldId = roll.groupFieldId;
    if (editFieldIsGroup) {
      updatedGroupFieldId = editingFieldId;
    } else if (roll.groupFieldId === editingFieldId) {
      updatedGroupFieldId = undefined;
    }

    const isPhone = editFieldType === 'phone' || editFieldIsPhone;
    const labelConfig: LabelConfig | undefined =
      editFieldType === 'label'
        ? {
            labelType: editFieldLabelType,
            prefix: editFieldLabelPrefix,
            startValue: Number(editFieldLabelStartValue) || 1,
            step: Number(editFieldLabelStep) || 1,
            itemsPerLabel: Number(editFieldLabelItemsPer) || 1,
          }
        : undefined;

    const options =
      editFieldType === 'choice' && editFieldOptions.trim()
        ? editFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
        : undefined;

    const updatedFields = fields.map((f) => {
      if (f.id === editingFieldId) {
        return {
          ...f,
          name: editFieldName.trim(),
          type: editFieldType,
          required: editFieldRequired,
          isGroupField: editFieldIsGroup,
          groupLabelType: editFieldIsGroup ? editFieldGroupLabelType : undefined,
          isPhoneField: isPhone,
          isWhatsappActive: isPhone ? editFieldIsWhatsappActive : false,
          showInRoster: editFieldShowInRoster,
          order: Number(editFieldOrder) || 1,
          labelConfig,
          options,
        };
      }
      return f;
    });

    onUpdateRoll({
      ...roll,
      fields: updatedFields,
      groupFieldId: updatedGroupFieldId,
      updatedAt: new Date().toISOString(),
    });

    setEditingFieldId(null);
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

  // Open Tag Modal for a specific member
  const openTagModal = (member: Member) => {
    setTagModalMember(member);
    setTagText(member.memberTag?.text || '');
    setTagColor(member.memberTag?.color || '#e11d48');
    const t = member.memberTag?.timing;
    if (t) {
      setTagUntilEnabled(!!t.untilEnabled);
      setTagUntilDateTime(t.untilDateTime || '');
      setTagForEnabled(!!t.forEnabled);
      setTagForDurationMinutes(t.forDurationMinutes || 60);
      setTagEveryEnabled(!!t.everyEnabled);
      setTagEveryDays(t.everyDays || [1, 2, 3, 4, 5]);
      setTagEveryStartTime(t.everyStartTime || '09:00');
      setTagEveryEndTime(t.everyEndTime || '17:00');
    } else {
      const legacy = member.memberTag?.timingType;
      setTagUntilEnabled(legacy === 'until');
      setTagUntilDateTime(member.memberTag?.untilDateTime || '');
      setTagForEnabled(legacy === 'for');
      setTagForDurationMinutes(member.memberTag?.forDurationMinutes || 60);
      setTagEveryEnabled(legacy === 'every');
      setTagEveryDays(member.memberTag?.everyDays || [1, 2, 3, 4, 5]);
      setTagEveryStartTime(member.memberTag?.everyStartTime || '09:00');
      setTagEveryEndTime(member.memberTag?.everyEndTime || '17:00');
    }
  };

  // Save Tag configuration for member
  const handleSaveMemberTag = () => {
    if (!tagModalMember) return;

    let updatedTag: MemberTag | undefined;
    if (tagText.trim()) {
      updatedTag = {
        text: tagText.trim(),
        color: tagColor,
        timing: {
          untilEnabled: tagUntilEnabled,
          untilDateTime: tagUntilEnabled ? tagUntilDateTime : undefined,
          forEnabled: tagForEnabled,
          forDurationMinutes: tagForEnabled ? Number(tagForDurationMinutes) : undefined,
          everyEnabled: tagEveryEnabled,
          everyDays: tagEveryEnabled ? tagEveryDays : undefined,
          everyStartTime: tagEveryEnabled ? tagEveryStartTime : undefined,
          everyEndTime: tagEveryEnabled ? tagEveryEndTime : undefined,
        },
        createdAt: tagModalMember.memberTag?.createdAt || new Date().toISOString(),
      };
    }

    const updatedMembers = roll.members.map((m) => {
      if (m.id === tagModalMember.id) {
        return {
          ...m,
          memberTag: updatedTag,
        };
      }
      return m;
    });

    onUpdateRoll({
      ...roll,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    });

    setTagModalMember(null);
  };

  // Remove Tag
  const handleRemoveMemberTag = () => {
    if (!tagModalMember) return;
    const updatedMembers = roll.members.map((m) => {
      if (m.id === tagModalMember.id) {
        return {
          ...m,
          memberTag: undefined,
        };
      }
      return m;
    });

    onUpdateRoll({
      ...roll,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    });

    setTagModalMember(null);
  };

  // Preset Template loader (Football Coach, Staff Roster, Class, Church)
  const applyPresetTemplate = (preset: 'football' | 'staff' | 'church' | 'class') => {
    let presetFields: RollField[] = [];
    let groupFieldId = '';

    if (preset === 'football') {
      presetFields = [
        { id: 'squad_no', name: 'Squad #', type: 'number', required: true },
        {
          id: 'position',
          name: 'Preferred Position',
          type: 'choice',
          required: true,
          isGroupField: true,
          options: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
        },
        { id: 'country', name: 'Country / Nationality', type: 'text' },
        { id: 'contact', name: 'Phone Contact', type: 'phone', isPhoneField: true, isWhatsappActive: true },
      ];
      groupFieldId = 'position';
    } else if (preset === 'staff') {
      presetFields = [
        { id: 'unit', name: 'Working Unit', type: 'text', required: true, isGroupField: true },
        { id: 'role', name: 'Job Title', type: 'text', required: true },
        { id: 'salary', name: 'Salary', type: 'number' },
        {
          id: 'status',
          name: 'Status Tag',
          type: 'choice',
          options: ['Intern', 'Full-Time', 'Part-Time', 'On Leave'],
        },
        { id: 'phone', name: 'Phone', type: 'phone', isPhoneField: true, isWhatsappActive: true },
      ];
      groupFieldId = 'unit';
    } else if (preset === 'class') {
      presetFields = [
        { id: 'student_id', name: 'Student ID', type: 'text', required: true },
        {
          id: 'group_no',
          name: 'Lab Group #',
          type: 'label',
          isGroupField: true,
          labelConfig: { labelType: 'number', prefix: 'Group ', startValue: 1, step: 1, itemsPerLabel: 4 },
        },
        { id: 'phone', name: 'Phone', type: 'phone', isPhoneField: true, isWhatsappActive: true },
      ];
      groupFieldId = 'group_no';
    } else {
      presetFields = [
        { id: 'unit', name: 'Affiliated Group / Unit', type: 'text', required: true },
        { id: 'phone', name: 'Phone', type: 'phone', isPhoneField: true, isWhatsappActive: true },
        {
          id: 'tag',
          name: 'Pair #',
          type: 'label',
          isGroupField: true,
          labelConfig: { labelType: 'number', prefix: 'Pair ', startValue: 1, step: 1, itemsPerLabel: 2 },
        },
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

  // CSV Export
  const handleExportCSV = async () => {
    const ok = await exportRosterToCSV(roll);
    if (ok) {
      setNotification('Roster exported to CSV! You can edit in Excel and re-import.');
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // CSV Import (RFC 4180 compliant)
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvContent = event.target?.result as string;
      if (!csvContent) return;

      const { members } = parseCSVToMembers(csvContent, roll, uid);
      if (members.length === 0) {
        alert('Could not find any members in this CSV file. Please make sure the CSV has a Full Name column.');
        return;
      }

      let updatedMembers: Member[];
      if (roll.members.length === 0) {
        updatedMembers = members;
      } else {
        const existingNames = new Map<string, Member>();
        roll.members.forEach((m) => existingNames.set(m.name.toLowerCase().trim(), m));

        const merged: Member[] = [...roll.members];
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
              className="flex items-center gap-1.5 rounded-lg bg-[var(--theme-primary)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-90 active:scale-95"
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
                className="w-full max-w-md rounded-lg border border-[var(--theme-primary)] bg-white px-3 py-1.5 text-base font-bold text-[#1d2b25] dark:bg-[#121816] dark:text-[#e8efe9]"
              />
              <button
                onClick={() => {
                  if (nameInput.trim()) {
                    onUpdateRoll({ ...roll, name: nameInput.trim() });
                  }
                  setEditingName(false);
                }}
                className="rounded-lg bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-semibold text-white"
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
            <span className="font-semibold text-[var(--theme-primary)]">
              {roll.members.length} People Registered
            </span>
            <span>•</span>
            <span className="text-[#6b7770] dark:text-[#92a199]">
              {fields.length} parameters
            </span>
            <button
              onClick={() => setShowSchemaModal(true)}
              className="ml-1 inline-flex items-center gap-1 rounded-md border border-[var(--theme-primary)]/50 bg-[var(--theme-primary-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--theme-primary)] hover:opacity-90 transition-colors"
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
            title="Download CSV of this roster to edit in Excel or other tools"
          >
            <Download className="h-3.5 w-3.5 text-[var(--theme-primary)]" />
            <span>Export CSV</span>
          </button>

          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-1.5 font-semibold text-[#1d2b25] transition hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]">
            <Upload className="h-3.5 w-3.5 text-[var(--theme-primary)]" />
            <span>Import/Re-upload edited CSV</span>
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
          <h2 className="font-bold text-sm text-[var(--theme-primary)]">
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
                className="w-full rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[var(--theme-primary)] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
              />
            </div>

            {/* Dynamic Custom Fields */}
            {fields.map((field) => {
              if (field.type === 'choice' && field.options && field.options.length > 0) {
                return (
                  <div key={field.id} className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-[#1d2b25] dark:text-[#e8efe9] mb-1 truncate">
                      {field.name} {field.required ? '*' : ''}
                    </label>
                    <select
                      required={field.required}
                      value={newMemberData[field.id] || ''}
                      onChange={(e) =>
                        setNewMemberData({
                          ...newMemberData,
                          [field.id]: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[var(--theme-primary)] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                    >
                      <option value="">Select {field.name}...</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              const autoPlaceholder =
                field.type === 'label'
                  ? `Auto (${generateAutoLabel(roll.members.length, field)})`
                  : field.name;

              return (
                <div key={field.id} className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-[#1d2b25] dark:text-[#e8efe9] mb-1 truncate">
                    {field.name} {field.required ? '*' : ''}
                  </label>
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'phone' ? 'tel' : 'text'}
                    required={field.required}
                    placeholder={autoPlaceholder}
                    value={newMemberData[field.id] || ''}
                    onChange={(e) =>
                      setNewMemberData({
                        ...newMemberData,
                        [field.id]: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[var(--theme-primary)] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90 active:scale-95"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Member</span>
            </button>
          </div>
        </form>
      </div>

      {/* Roster Search & Controls Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7770]" />
          <input
            type="text"
            placeholder="Search by name, tag, or details..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-[#e3e1d8] bg-white pl-9 pr-4 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[var(--theme-primary)] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Group filter */}
          {uniqueGroups.length > 0 && (
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="rounded-xl border border-[#e3e1d8] bg-white px-3 py-2 text-xs text-[#1d2b25] outline-hidden dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
            >
              <option value="all">All Groups ({roll.members.length})</option>
              {uniqueGroups.map((g) => (
                <option key={g} value={g}>
                  {formatGroupDisplay(g, groupField)}
                </option>
              ))}
            </select>
          )}

          {/* View Mode Toggle */}
          {groupField && (
            <div className="flex rounded-xl border border-[#e3e1d8] bg-white p-0.5 text-xs dark:border-[#2b3731] dark:bg-[#1b2420]">
              <button
                onClick={() => setViewMode('flat')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  viewMode === 'flat'
                    ? 'bg-[var(--theme-primary)] text-white'
                    : 'text-[#6b7770]'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  viewMode === 'grouped'
                    ? 'bg-[var(--theme-primary)] text-white'
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
                  <span className="rounded-full bg-[var(--theme-primary)] px-2.5 py-0.5 text-xs font-bold text-white">
                    {groupField.name}: {formatGroupDisplay(groupName, groupField)}
                  </span>
                  <span className="text-xs text-[#6b7770] dark:text-[#92a199]">
                    ({membersInGroup.length} members)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {membersInGroup.map((m) => {
                  const phone = getPhoneValue(m, fields);
                  const isWaActive = fields.some((f) => (f.isPhoneField || f.type === 'phone') && f.isWhatsappActive !== false);
                  const waLink = isWaActive ? buildWhatsAppLink(phone, settings.whatsappCountryCode) : null;
                  const activeTag = isMemberTagActive(m.memberTag);

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3 dark:border-[#2b3731] dark:bg-[#121816]"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-xs text-[#1d2b25] dark:text-[#e8efe9]">
                            {m.name}
                          </span>
                          {/* Dedicated Tag Lightbulb Feature Badge - ONLY shown next to name if set & active */}
                          {activeTag && m.memberTag && (
                            <span
                              className="inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-bold shadow-2xs"
                              style={{
                                color: m.memberTag.color,
                                backgroundColor: `${m.memberTag.color}15`,
                                border: `1px solid ${m.memberTag.color}40`,
                              }}
                            >
                              {m.memberTag.text}
                            </span>
                          )}
                        </div>

                        {/* Parameters displayed UNDER name as secondary text - values only separated by centered dot */}
                        {(() => {
                          const displayValues = getMemberDisplayValues(
                            m,
                            fields.filter((f) => f.id !== groupField.id)
                          );
                          if (displayValues.length === 0) return null;
                          return (
                            <div className="mt-1 text-[11px] text-[#6b7770] dark:text-[#92a199] truncate">
                              {displayValues.join(' • ')}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Action Icons in Uniform Rounded Squares */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Lightbulb Tag Button */}
                        <button
                          type="button"
                          onClick={() => openTagModal(m)}
                          title={m.memberTag ? `Tag: ${m.memberTag.text}` : 'Set Tag for member'}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                            activeTag && m.memberTag
                              ? 'border-[var(--theme-primary)]/60 bg-[var(--theme-primary-light)] text-[var(--theme-primary)]'
                              : 'border-[#e3e1d8] text-[#6b7770] hover:bg-[#eae8df] hover:text-[#1d2b25] dark:border-[#2b3731] dark:text-[#92a199] dark:hover:bg-[#1b2420]'
                          }`}
                        >
                          <Lightbulb
                            className={`h-3.5 w-3.5 ${activeTag && m.memberTag ? 'fill-current' : ''}`}
                            style={activeTag && m.memberTag ? { color: m.memberTag.color } : undefined}
                          />
                        </button>

                        {phone && (
                          <a
                            href={`tel:${phone.split('/')[0].replace(/\s+/g, '')}`}
                            title={`Call ${m.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e3e1d8] text-[#6b7770] hover:bg-[var(--theme-primary-light)] hover:text-[var(--theme-primary)] dark:border-[#2b3731] dark:text-[#92a199]"
                          >
                            <Phone className="h-3 w-3" />
                          </a>
                        )}

                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`WhatsApp ${m.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e3e1d8] text-[#6b7770] hover:bg-emerald-50 hover:text-emerald-600 dark:border-[#2b3731] dark:text-[#92a199]"
                          >
                            <MessageCircle className="h-3 w-3" />
                          </a>
                        )}

                        <button
                          onClick={() => startEditMember(m)}
                          title="Edit member"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e3e1d8] text-[#6b7770] hover:bg-[#eae8df] hover:text-[#1d2b25] dark:border-[#2b3731] dark:text-[#92a199] dark:hover:bg-[#1b2420]"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>

                        <button
                          onClick={() => handleDeleteMember(m.id)}
                          title="Delete member"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e3e1d8] text-[#6b7770] hover:bg-rose-50 hover:text-rose-600 dark:border-[#2b3731] dark:text-[#92a199] dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3 w-3" />
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
              const isWaActive = fields.some((f) => (f.isPhoneField || f.type === 'phone') && f.isWhatsappActive !== false);
              const waLink = isWaActive ? buildWhatsAppLink(phone, settings.whatsappCountryCode) : null;
              const activeTag = isMemberTagActive(member.memberTag);

              if (isEditing) {
                return (
                  <div
                    key={member.id}
                    className="rounded-xl border border-[var(--theme-primary)] bg-white p-3 shadow-md dark:border-[var(--theme-primary)] dark:bg-[#1b2420]"
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
                          {f.type === 'choice' && f.options && f.options.length > 0 ? (
                            <select
                              value={editMemberData[f.id] || ''}
                              onChange={(e) =>
                                setEditMemberData({
                                  ...editMemberData,
                                  [f.id]: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-[#e3e1d8] p-1.5 text-xs text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                            >
                              <option value="">Select...</option>
                              {f.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
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
                          )}
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
                        className="flex items-center gap-1 rounded-lg bg-[var(--theme-primary)] px-3 py-1 text-xs font-semibold text-white"
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
                  className="flex items-center justify-between rounded-xl border border-[#e3e1d8] bg-white p-3 transition hover:border-[var(--theme-primary)]/40 dark:border-[#2b3731] dark:bg-[#1b2420]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <div className="theme-tag-badge flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-[#1d2b25] dark:text-[#e8efe9]">
                          {member.name}
                        </span>

                        {/* Dedicated Tag Lightbulb Feature Badge - ONLY shown next to name if set & active */}
                        {activeTag && member.memberTag && (
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold shadow-2xs transition"
                            style={{
                              color: member.memberTag.color,
                              backgroundColor: `${member.memberTag.color}18`,
                              border: `1px solid ${member.memberTag.color}45`,
                            }}
                          >
                            {member.memberTag.text}
                          </span>
                        )}
                      </div>

                      {/* Parameters displayed UNDER name as secondary text - values only separated by centered dot */}
                      {(() => {
                        const displayValues = getMemberDisplayValues(member, fields);
                        if (displayValues.length === 0) return null;
                        return (
                          <div className="mt-1 text-xs text-[#6b7770] dark:text-[#92a199]">
                            {displayValues.join(' • ')}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Action Icons in Uniform Rounded Squares */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Lightbulb Tag Button */}
                    <button
                      type="button"
                      onClick={() => openTagModal(member)}
                      title={member.memberTag ? `Tag: ${member.memberTag.text}` : 'Set Tag for member'}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                        activeTag && member.memberTag
                          ? 'border-[var(--theme-primary)]/60 bg-[var(--theme-primary-light)] text-[var(--theme-primary)]'
                          : 'border-[#e3e1d8] text-[#6b7770] hover:bg-[#f6f5f0] hover:text-[#1d2b25] dark:border-[#2b3731] dark:text-[#92a199] dark:hover:bg-[#121816]'
                      }`}
                    >
                      <Lightbulb
                        className={`h-3.5 w-3.5 ${activeTag && member.memberTag ? 'fill-current' : ''}`}
                        style={activeTag && member.memberTag ? { color: member.memberTag.color } : undefined}
                      />
                    </button>

                    {phone && (
                      <a
                        href={`tel:${phone.split('/')[0].replace(/\s+/g, '')}`}
                        title={`Call ${member.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e3e1d8] text-[#6b7770] hover:bg-[var(--theme-primary-light)] hover:text-[var(--theme-primary)] dark:border-[#2b3731] dark:text-[#92a199]"
                      >
                        <Phone className="h-3 w-3" />
                      </a>
                    )}

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

                    <button
                      onClick={() => startEditMember(member)}
                      title="Edit member"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e3e1d8] text-[#6b7770] hover:bg-[#f6f5f0] hover:text-[#1d2b25] dark:border-[#2b3731] dark:text-[#92a199] dark:hover:bg-[#121816]"
                    >
                      <Edit2 className="h-3 w-3" />
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
                        title="Delete member"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e3e1d8] text-[#6b7770] hover:bg-rose-50 hover:text-rose-600 dark:border-[#2b3731] dark:text-[#92a199] dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Member Tag & Schedule Modal (Lightbulb Feature) */}
      {tagModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#1b2420] border border-[#e3e1d8] dark:border-[#2b3731]">
            <div className="flex items-center justify-between border-b border-[#e3e1d8] pb-3 dark:border-[#2b3731]">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${tagColor}20`, color: tagColor }}
                >
                  <Lightbulb className="h-4 w-4 fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1d2b25] dark:text-[#e8efe9]">
                    Member Tag: {tagModalMember.name}
                  </h3>
                  <p className="text-[11px] text-[#6b7770] dark:text-[#92a199]">
                    Custom label displayed next to name
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTagModalMember(null)}
                className="rounded-lg p-1 text-[#6b7770] hover:bg-stone-100 dark:text-[#92a199]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Tag Text Input */}
              <div>
                <label className="block text-[11px] font-semibold text-[#1d2b25] dark:text-[#e8efe9] mb-1">
                  Tag Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. Captain, Substitute, On Duty, VIP, Intern"
                  value={tagText}
                  onChange={(e) => setTagText(e.target.value)}
                  className="w-full rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[var(--theme-primary)] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                />
              </div>

              {/* Tag Color Swatches */}
              <div>
                <label className="block text-[11px] font-semibold text-[#1d2b25] dark:text-[#e8efe9] mb-1.5">
                  Tag Color
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {TAG_COLOR_PALETTE.map((pal) => (
                    <button
                      key={pal.color}
                      type="button"
                      onClick={() => setTagColor(pal.color)}
                      style={{ backgroundColor: pal.color }}
                      className={`h-7 w-7 rounded-lg transition-transform ${
                        tagColor.toLowerCase() === pal.color.toLowerCase()
                          ? 'ring-2 ring-offset-2 ring-stone-800 scale-110'
                          : 'hover:scale-105'
                      }`}
                      title={pal.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    title="Custom color"
                  />
                </div>
              </div>

              {/* Live Preview */}
              {tagText.trim() && (
                <div className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-2.5 text-xs dark:border-[#2b3731] dark:bg-[#121816]">
                  <span className="text-[10px] uppercase tracking-wider text-[#6b7770] font-semibold block mb-1">
                    Live Preview:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#1d2b25] dark:text-[#e8efe9]">
                      {tagModalMember.name}
                    </span>
                    <span
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold shadow-2xs"
                      style={{
                        color: tagColor,
                        backgroundColor: `${tagColor}18`,
                        border: `1px solid ${tagColor}40`,
                      }}
                    >
                      {tagText}
                    </span>
                  </div>
                </div>
              )}

              {/* Display Timing Options */}
              <div>
                <label className="block text-[11px] font-semibold text-[#1d2b25] dark:text-[#e8efe9] mb-1.5">
                  Display Times
                </label>
                <div className="space-y-2.5">
                  {/* Parameter 1: Until a set time and/or date */}
                  <div className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-2.5 dark:border-[#2b3731] dark:bg-[#121816]">
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#1d2b25] dark:text-[#e8efe9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tagUntilEnabled}
                        onChange={(e) => setTagUntilEnabled(e.target.checked)}
                        className="rounded accent-[var(--theme-primary)]"
                      />
                      <span>Until a set time and/or date</span>
                    </label>
                    {tagUntilEnabled && (
                      <input
                        type="datetime-local"
                        value={tagUntilDateTime}
                        onChange={(e) => setTagUntilDateTime(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-[#e3e1d8] bg-white p-1.5 text-xs text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
                      />
                    )}
                  </div>

                  {/* Parameter 2: For a set period */}
                  <div className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-2.5 dark:border-[#2b3731] dark:bg-[#121816]">
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#1d2b25] dark:text-[#e8efe9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tagForEnabled}
                        onChange={(e) => setTagForEnabled(e.target.checked)}
                        className="rounded accent-[var(--theme-primary)]"
                      />
                      <span>For a set period</span>
                    </label>
                    {tagForEnabled && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[
                          { label: '1 hour', min: 60 },
                          { label: '4 hours', min: 240 },
                          { label: '8 hours', min: 480 },
                          { label: '1 day', min: 1440 },
                          { label: '3 days', min: 4320 },
                          { label: '7 days', min: 10080 },
                        ].map((dur) => (
                          <button
                            key={dur.min}
                            type="button"
                            onClick={() => setTagForDurationMinutes(dur.min)}
                            className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                              tagForDurationMinutes === dur.min
                                ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-bold'
                                : 'border-[#e3e1d8] bg-white text-[#6b7770] hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#1b2420]'
                            }`}
                          >
                            {dur.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Parameter 3: Every set time and/or date (recurring) */}
                  <div className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-2.5 dark:border-[#2b3731] dark:bg-[#121816]">
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#1d2b25] dark:text-[#e8efe9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tagEveryEnabled}
                        onChange={(e) => setTagEveryEnabled(e.target.checked)}
                        className="rounded accent-[var(--theme-primary)]"
                      />
                      <span>Every set time and/or date (recurring)</span>
                    </label>
                    {tagEveryEnabled && (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-1">
                          {DAYS_OF_WEEK.map((d) => {
                            const selected = tagEveryDays.includes(d.id);
                            return (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  if (selected) {
                                    setTagEveryDays(tagEveryDays.filter((id) => id !== d.id));
                                  } else {
                                    setTagEveryDays([...tagEveryDays, d.id]);
                                  }
                                }}
                                className={`h-7 w-7 rounded-lg text-[10px] font-bold transition ${
                                  selected
                                    ? 'bg-[var(--theme-primary)] text-white'
                                    : 'border border-[#e3e1d8] bg-white text-[#6b7770] hover:bg-stone-100 dark:border-[#2b3731] dark:bg-[#1b2420]'
                                }`}
                              >
                                {d.label[0]}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[#6b7770]">From</span>
                          <input
                            type="time"
                            value={tagEveryStartTime}
                            onChange={(e) => setTagEveryStartTime(e.target.value)}
                            className="rounded-lg border border-[#e3e1d8] bg-white px-2 py-1 text-xs dark:border-[#2b3731] dark:bg-[#1b2420]"
                          />
                          <span className="text-[#6b7770]">to</span>
                          <input
                            type="time"
                            value={tagEveryEndTime}
                            onChange={(e) => setTagEveryEndTime(e.target.value)}
                            className="rounded-lg border border-[#e3e1d8] bg-white px-2 py-1 text-xs dark:border-[#2b3731] dark:bg-[#1b2420]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {!tagUntilEnabled && !tagForEnabled && !tagEveryEnabled && (
                    <p className="text-[11px] text-[#6b7770] italic dark:text-[#92a199]">
                      No schedule selected: Tag will be active continuously until removed.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-[#e3e1d8] pt-3 dark:border-[#2b3731]">
              {tagModalMember.memberTag ? (
                <button
                  type="button"
                  onClick={handleRemoveMemberTag}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  Remove Tag
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTagModalMember(null)}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#6b7770]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMemberTag}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--theme-primary)] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Tag</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schema / Custom Parameter Manager Modal */}
      {showSchemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1b2420]">
            <div className="flex items-center justify-between border-b border-[#e3e1d8] pb-3 dark:border-[#2b3731]">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[var(--theme-primary)]" />
                <h3 className="font-bold text-base text-[#1d2b25] dark:text-[#e8efe9]">
                  Customize Parameters
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
                Current Active Parameters ({fields.length}):
              </span>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-1">
                {fields.map((field) => {
                  const isEditingThis = editingFieldId === field.id;

                  if (isEditingThis) {
                    return (
                      <div
                        key={field.id}
                        className="rounded-xl border-2 border-[var(--theme-primary)] bg-white p-3 shadow-md dark:border-[var(--theme-primary)] dark:bg-[#121816]"
                      >
                        <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#e3e1d8] dark:border-[#2b3731]">
                          <span className="font-bold text-xs text-[var(--theme-primary)] flex items-center gap-1">
                            <Edit2 className="h-3 w-3" />
                            <span>Edit Parameter: {field.name}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingFieldId(null)}
                            className="text-[#6b7770] hover:text-[#1d2b25]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#6b7770] mb-0.5">
                              Parameter Name
                            </label>
                            <input
                              type="text"
                              value={editFieldName}
                              onChange={(e) => setEditFieldName(e.target.value)}
                              className="w-full rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-2.5 py-1.5 text-xs text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-[#6b7770] mb-0.5">
                              Data Type
                            </label>
                            <select
                              value={editFieldType}
                              onChange={(e) => setEditFieldType(e.target.value as FieldType)}
                              className="w-full rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-2.5 py-1.5 text-xs text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
                            >
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="phone">Phone</option>
                              <option value="label">Label</option>
                              <option value="choice">Choice</option>
                              <option value="email">Email</option>
                              <option value="date">Date</option>
                            </select>
                          </div>
                        </div>

                        {/* Choice options input */}
                        {editFieldType === 'choice' && (
                          <div className="mt-2">
                            <label className="block text-[10px] font-semibold text-[#6b7770] mb-0.5">
                              Options (comma-separated)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Intern, Full-Time, Contractor, On Leave"
                              value={editFieldOptions}
                              onChange={(e) => setEditFieldOptions(e.target.value)}
                              className="w-full rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-2.5 py-1.5 text-xs text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
                            />
                          </div>
                        )}

                        {/* Label formatting section */}
                        {editFieldType === 'label' && (
                          <div className="mt-2.5 rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] p-2.5 dark:border-[#2b3731] dark:bg-[#1b2420]">
                            <label className="block text-[11px] font-bold text-[#1d2b25] dark:text-[#e8efe9] mb-1.5">
                              Label Formatting
                            </label>
                            <div className="grid grid-cols-3 gap-1.5 text-[11px] mb-2">
                              <label className={`flex items-center gap-1.5 rounded-md border p-1.5 cursor-pointer transition ${
                                editFieldLabelType === 'number' ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-bold' : 'border-[#e3e1d8] dark:border-[#2b3731]'
                              }`}>
                                <input
                                  type="radio"
                                  name={`editLabelType_${field.id}`}
                                  value="number"
                                  checked={editFieldLabelType === 'number'}
                                  onChange={() => setEditFieldLabelType('number')}
                                  className="accent-[var(--theme-primary)]"
                                />
                                <span>Numbered (1, 2, 3...)</span>
                              </label>

                              <label className={`flex items-center gap-1.5 rounded-md border p-1.5 cursor-pointer transition ${
                                editFieldLabelType === 'letter' ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-bold' : 'border-[#e3e1d8] dark:border-[#2b3731]'
                              }`}>
                                <input
                                  type="radio"
                                  name={`editLabelType_${field.id}`}
                                  value="letter"
                                  checked={editFieldLabelType === 'letter'}
                                  onChange={() => setEditFieldLabelType('letter')}
                                  className="accent-[var(--theme-primary)]"
                                />
                                <span>Lettered (A, B, C...)</span>
                              </label>

                              <label className={`flex items-center gap-1.5 rounded-md border p-1.5 cursor-pointer transition ${
                                editFieldLabelType === 'both' ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-bold' : 'border-[#e3e1d8] dark:border-[#2b3731]'
                              }`}>
                                <input
                                  type="radio"
                                  name={`editLabelType_${field.id}`}
                                  value="both"
                                  checked={editFieldLabelType === 'both'}
                                  onChange={() => setEditFieldLabelType('both')}
                                  className="accent-[var(--theme-primary)]"
                                />
                                <span>Both (1-A, 1-B...)</span>
                              </label>
                            </div>

                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div className="col-span-2">
                                <label className="block text-[10px] text-[#6b7770]">Prefix / Structure</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Pair , Group "
                                  value={editFieldLabelPrefix}
                                  onChange={(e) => setEditFieldLabelPrefix(e.target.value)}
                                  className="w-full rounded-md border border-[#e3e1d8] bg-white p-1 text-xs dark:border-[#2b3731] dark:bg-[#121816]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#6b7770]">Start From</label>
                                <input
                                  type="number"
                                  value={editFieldLabelStartValue}
                                  onChange={(e) => setEditFieldLabelStartValue(Number(e.target.value))}
                                  className="w-full rounded-md border border-[#e3e1d8] bg-white p-1 text-xs dark:border-[#2b3731] dark:bg-[#121816]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#6b7770]">Step</label>
                                <input
                                  type="number"
                                  value={editFieldLabelStep}
                                  onChange={(e) => setEditFieldLabelStep(Number(e.target.value))}
                                  className="w-full rounded-md border border-[#e3e1d8] bg-white p-1 text-xs dark:border-[#2b3731] dark:bg-[#121816]"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Parameter Checkbox Settings: Required, Group, Display in roster, Order, W/A active */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-[#6b7770] dark:text-[#92a199]">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editFieldRequired}
                              onChange={(e) => setEditFieldRequired(e.target.checked)}
                              className="rounded accent-[var(--theme-primary)]"
                            />
                            <span>Required</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editFieldIsGroup}
                              onChange={(e) => setEditFieldIsGroup(e.target.checked)}
                              className="rounded accent-[var(--theme-primary)]"
                            />
                            <span>Group</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editFieldShowInRoster}
                              onChange={(e) => setEditFieldShowInRoster(e.target.checked)}
                              className="rounded accent-[var(--theme-primary)]"
                            />
                            <span>Display in roster</span>
                          </label>

                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-semibold text-[#1d2b25] dark:text-[#e8efe9]">Order:</span>
                            <input
                              type="number"
                              min={1}
                              value={editFieldOrder}
                              onChange={(e) => setEditFieldOrder(Number(e.target.value))}
                              className="w-14 rounded-md border border-[#e3e1d8] bg-white px-2 py-0.5 text-xs text-center text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                            />
                          </div>

                          {editFieldType === 'phone' && (
                            <label className="flex items-center gap-1.5 cursor-pointer text-emerald-700 dark:text-emerald-400 font-medium">
                              <input
                                type="checkbox"
                                checked={editFieldIsWhatsappActive}
                                onChange={(e) => setEditFieldIsWhatsappActive(e.target.checked)}
                                className="rounded accent-emerald-600"
                              />
                              <span>W/A active</span>
                            </label>
                          )}
                        </div>

                        <div className="mt-2.5 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingFieldId(null)}
                            className="rounded-lg px-2.5 py-1 text-xs text-[#6b7770]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEditField()}
                            className="flex items-center gap-1 rounded-lg bg-[var(--theme-primary)] px-3 py-1 text-xs font-semibold text-white"
                          >
                            <Check className="h-3 w-3" />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={field.id}
                      className="flex items-center justify-between rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs dark:border-[#2b3731] dark:bg-[#121816]"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-[#1d2b25] dark:text-[#e8efe9]">
                          {field.name}
                        </span>
                        <span className="font-mono text-[10px] text-[#6b7770] dark:text-[#92a199]">
                          ({field.type})
                        </span>
                        {field.order !== undefined && (
                          <span className="rounded bg-[#f0f0ea] px-1.5 py-0.2 text-[10px] font-semibold text-[#6b7770] dark:bg-[#25322c] dark:text-[#92a199]">
                            #{field.order}
                          </span>
                        )}
                        {field.showInRoster === false && (
                          <span className="rounded bg-stone-200 px-1.5 py-0.2 text-[10px] font-bold text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                            Hidden in roster
                          </span>
                        )}
                        {field.required && (
                          <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[10px] font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                            Required
                          </span>
                        )}
                        {field.isGroupField && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Group
                          </span>
                        )}
                        {field.type === 'phone' && field.isWhatsappActive !== false && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            W/A active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEditField(field)}
                          title="Edit parameter"
                          className="rounded-lg p-1.5 text-[#6b7770] hover:bg-[#e3e1d8]/50 hover:text-[var(--theme-primary)] dark:hover:bg-[#2b3731]"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteField(field.id)}
                          title="Delete parameter"
                          className="rounded-lg p-1.5 text-[#6b7770] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add New Custom Parameter Form */}
            <form onSubmit={handleAddField} className="mt-4 border-t border-[#e3e1d8] pt-3 dark:border-[#2b3731]">
              <span className="text-xs font-bold text-[var(--theme-primary)]">
                + Add Another Parameter
              </span>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  placeholder="Parameter Name (e.g. Squad #, Department)"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[var(--theme-primary)] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                />

                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                  className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs font-medium text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="phone">Phone</option>
                  <option value="label">Label</option>
                  <option value="choice">Choice</option>
                  <option value="email">Email</option>
                  <option value="date">Date</option>
                </select>
              </div>

              {/* Choice options input */}
              {newFieldType === 'choice' && (
                <div className="mt-2">
                  <label className="block text-[10px] font-semibold text-[#6b7770] mb-0.5">
                    Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Intern, Full-Time, Contractor, On Leave"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    className="w-full rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[var(--theme-primary)] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                  />
                </div>
              )}

              {/* Label formatting section */}
              {newFieldType === 'label' && (
                <div className="mt-2.5 rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] p-2.5 dark:border-[#2b3731] dark:bg-[#121816]">
                  <label className="block text-[11px] font-bold text-[#1d2b25] dark:text-[#e8efe9] mb-1.5">
                    Label Formatting
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px] mb-2">
                    <label className={`flex items-center gap-1.5 rounded-md border p-1.5 cursor-pointer transition ${
                      newFieldLabelType === 'number' ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-bold' : 'border-[#e3e1d8] dark:border-[#2b3731]'
                    }`}>
                      <input
                        type="radio"
                        name="newLabelType"
                        value="number"
                        checked={newFieldLabelType === 'number'}
                        onChange={() => setNewFieldLabelType('number')}
                        className="accent-[var(--theme-primary)]"
                      />
                      <span>Numbered (1, 2, 3...)</span>
                    </label>

                    <label className={`flex items-center gap-1.5 rounded-md border p-1.5 cursor-pointer transition ${
                      newFieldLabelType === 'letter' ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-bold' : 'border-[#e3e1d8] dark:border-[#2b3731]'
                    }`}>
                      <input
                        type="radio"
                        name="newLabelType"
                        value="letter"
                        checked={newFieldLabelType === 'letter'}
                        onChange={() => setNewFieldLabelType('letter')}
                        className="accent-[var(--theme-primary)]"
                      />
                      <span>Lettered (A, B, C...)</span>
                    </label>

                    <label className={`flex items-center gap-1.5 rounded-md border p-1.5 cursor-pointer transition ${
                      newFieldLabelType === 'both' ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-bold' : 'border-[#e3e1d8] dark:border-[#2b3731]'
                    }`}>
                      <input
                        type="radio"
                        name="newLabelType"
                        value="both"
                        checked={newFieldLabelType === 'both'}
                        onChange={() => setNewFieldLabelType('both')}
                        className="accent-[var(--theme-primary)]"
                      />
                      <span>Both (1-A, 1-B...)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="col-span-2">
                      <label className="block text-[10px] text-[#6b7770]">Prefix / Structure</label>
                      <input
                        type="text"
                        placeholder="e.g. Pair , Group "
                        value={newFieldLabelPrefix}
                        onChange={(e) => setNewFieldLabelPrefix(e.target.value)}
                        className="w-full rounded-md border border-[#e3e1d8] bg-white p-1 text-xs dark:border-[#2b3731] dark:bg-[#121816]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#6b7770]">Start From</label>
                      <input
                        type="number"
                        value={newFieldLabelStartValue}
                        onChange={(e) => setNewFieldLabelStartValue(Number(e.target.value))}
                        className="w-full rounded-md border border-[#e3e1d8] bg-white p-1 text-xs dark:border-[#2b3731] dark:bg-[#121816]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#6b7770]">Step</label>
                      <input
                        type="number"
                        value={newFieldLabelStep}
                        onChange={(e) => setNewFieldLabelStep(Number(e.target.value))}
                        className="w-full rounded-md border border-[#e3e1d8] bg-white p-1 text-xs dark:border-[#2b3731] dark:bg-[#121816]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Toggles: Required, Group, Display in roster, Order, W/A active */}
              <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-[#6b7770] dark:text-[#92a199]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFieldRequired}
                    onChange={(e) => setNewFieldRequired(e.target.checked)}
                    className="rounded accent-[var(--theme-primary)]"
                  />
                  <span>Required</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFieldIsGroup}
                    onChange={(e) => setNewFieldIsGroup(e.target.checked)}
                    className="rounded accent-[var(--theme-primary)]"
                  />
                  <span>Group</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFieldShowInRoster}
                    onChange={(e) => setNewFieldShowInRoster(e.target.checked)}
                    className="rounded accent-[var(--theme-primary)]"
                  />
                  <span>Display in roster</span>
                </label>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-semibold text-[#1d2b25] dark:text-[#e8efe9]">Order:</span>
                  <input
                    type="number"
                    min={1}
                    value={newFieldOrder}
                    onChange={(e) => setNewFieldOrder(Number(e.target.value))}
                    className="w-14 rounded-md border border-[#e3e1d8] bg-white px-2 py-0.5 text-xs text-center text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                  />
                </div>

                {newFieldType === 'phone' && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-emerald-700 dark:text-emerald-400 font-medium">
                    <input
                      type="checkbox"
                      checked={newFieldIsWhatsappActive}
                      onChange={(e) => setNewFieldIsWhatsappActive(e.target.checked)}
                      className="rounded accent-emerald-600"
                    />
                    <span>W/A active</span>
                  </label>
                )}
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
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--theme-primary)] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90"
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
