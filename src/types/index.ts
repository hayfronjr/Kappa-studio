export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

export type FieldType = 'text' | 'number' | 'phone' | 'label' | 'choice' | 'email' | 'date';

export type GroupLabelType = 'numbers' | 'letters' | 'text';

export interface LabelConfig {
  labelType: 'number' | 'letter' | 'both';
  prefix?: string; // e.g. "Pair " or "Group "
  startValue: number; // e.g. 1
  step: number; // e.g. 1
  itemsPerLabel?: number; // e.g. 2 for pairs, 1 for individual
}

export interface RollField {
  id: string;
  name: string;
  type: FieldType;
  required?: boolean;
  options?: string[]; // for choice types
  isGroupField?: boolean; // Marks this field as the grouping parameter (e.g. "Department", "Pair #")
  groupLabelType?: GroupLabelType; // for backward compatibility
  labelConfig?: LabelConfig; // for 'label' datatype
  isPhoneField?: boolean; // Phone field
  isWhatsappActive?: boolean; // Determines whether WhatsApp click-to-chat action is enabled
  showInRoster?: boolean; // Controls whether parameter is displayed under name in roster (default: true)
  order?: number; // Order index for display (1, 2, 3...)
}

export interface MemberTagTiming {
  untilEnabled?: boolean;
  untilDateTime?: string; // ISO or datetime-local string
  forEnabled?: boolean;
  forDurationMinutes?: number;
  everyEnabled?: boolean;
  everyDays?: number[]; // [0..6] (0=Sun, 1=Mon, etc.)
  everyStartTime?: string; // "09:00"
  everyEndTime?: string; // "17:00"
}

export interface MemberTag {
  text: string;
  color: string; // Hex color code or css color string (e.g. #e11d48, #116b52)
  timing?: MemberTagTiming; // Multi-parameter active display times
  timingType?: 'permanent' | 'until' | 'for' | 'every'; // legacy fallback
  untilDateTime?: string;
  forDurationMinutes?: number;
  createdAt?: string;
  everyDays?: number[];
  everyStartTime?: string;
  everyEndTime?: string;
}

export interface Member {
  id: string;
  name: string;
  // Dynamic fields storage: keyed by field ID (e.g. { unit: "Editorial", phone: "0555233330", label: "Pair 1" })
  data: Record<string, string>;
  memberTag?: MemberTag; // Editable tag feature with lightbulb icon, color choice, and display timings
  // Legacy backward-compatibility helpers
  unit?: string;
  phone?: string;
  tag?: string;
  notes?: string;
}

export interface MarkDetail {
  timestamp: string;
  status: AttendanceStatus;
  note?: string;
}

// Marks can either be a simple ISO timestamp string or a MarkDetail
export type MarkValue = string | MarkDetail;

export interface Roll {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  fields: RollField[];
  groupFieldId?: string; // ID of the field used to group members (e.g. "Pair #" or "Department")
  members: Member[];
}

export interface Session {
  id: string;
  rollId: string;
  rollName: string;
  title: string;
  start: string;
  end: string | null;
  status: 'open' | 'closed';
  fields: RollField[];
  members: Member[];
  marks: Record<string, MarkValue>;
  location?: string;
  notes?: string;
}

export type ThemeColor = 'green' | 'blue' | 'purple' | 'amber' | 'rose' | 'slate';
export type AppFont = 'sans' | 'rounded' | 'jakarta' | 'outfit' | 'mono' | 'serif';

export interface AppSettings {
  themeColor: ThemeColor;
  mode: 'light' | 'dark' | 'system';
  font: AppFont;
  whatsappCountryCode: string; // e.g. "233" or ""
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface AppState {
  rolls: Roll[];
  sessions: Session[];
  settings?: AppSettings;
}
