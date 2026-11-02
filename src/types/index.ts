export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

export type FieldType = 'text' | 'number' | 'phone' | 'email' | 'select' | 'tag';

export interface RollField {
  id: string;
  name: string;
  type: FieldType;
  required?: boolean;
  options?: string[]; // for select/tag types
  isGroupField?: boolean; // Marks this field as the grouping parameter (e.g. "Pair #", "Squad", "Group #")
  isPhoneField?: boolean; // Enables phone call & WhatsApp click-to-chat integration
}

export interface Member {
  id: string;
  name: string;
  // Dynamic fields storage: keyed by field ID (e.g. { unit: "Editorial", phone: "0555233330", pair: "Pair 1", position: "Forward" })
  data: Record<string, string>;
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
export type AppFont = 'sans' | 'rounded' | 'mono' | 'serif';

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
