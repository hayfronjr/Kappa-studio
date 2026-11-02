import { AppState, Session, Roll, Member, MarkValue, RollField, AppSettings } from '../types';
import { getInitialSeedData } from '../data/seedData';

const STORAGE_KEY = 'rollcall_app_v2';
const LEGACY_STORAGE_KEY = 'rollcall-v1';

export const DEFAULT_SETTINGS: AppSettings = {
  themeColor: 'green',
  mode: 'system',
  font: 'sans',
  whatsappCountryCode: '233', // Default Ghana prefix for SNS numbers; customizable in Settings
  soundEnabled: true,
  hapticsEnabled: true,
};

export function uid(prefix = 'rc'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        return await navigator.storage.persist();
      }
      return true;
    } catch (e) {
      console.warn('Storage persistence request failed:', e);
    }
  }
  return false;
}

export function normalizeRoll(roll: Roll): Roll {
  const defaultFields: RollField[] = roll.fields && roll.fields.length > 0
    ? roll.fields
    : [
        { id: 'unit', name: 'Affiliated Group / Unit', type: 'text', required: true },
        { id: 'phone', name: 'Phone', type: 'phone', required: false, isPhoneField: true },
        { id: 'tag', name: 'Pair #', type: 'tag', required: false, isGroupField: true },
      ];

  const members = (roll.members || []).map((m) => {
    const data = { ...(m.data || {}) };
    if (m.unit && !data['unit']) data['unit'] = m.unit;
    if (m.phone && !data['phone']) data['phone'] = m.phone;
    if (m.tag && !data['tag']) data['tag'] = m.tag;
    return {
      ...m,
      data,
      unit: m.unit || data['unit'] || '',
      phone: m.phone || data['phone'] || '',
      tag: m.tag || data['tag'] || '',
    };
  });

  return {
    ...roll,
    fields: defaultFields,
    groupFieldId: roll.groupFieldId || 'tag',
    members,
  };
}

export function normalizeSession(session: Session, rolls: Roll[]): Session {
  const matchingRoll = rolls.find((r) => r.id === session.rollId);
  const fields = session.fields && session.fields.length > 0
    ? session.fields
    : matchingRoll?.fields || [
        { id: 'unit', name: 'Affiliated Group / Unit', type: 'text', required: true },
        { id: 'phone', name: 'Phone', type: 'phone', required: false, isPhoneField: true },
        { id: 'tag', name: 'Pair #', type: 'tag', required: false, isGroupField: true },
      ];

  const members = (session.members || []).map((m) => {
    const data = { ...(m.data || {}) };
    if (m.unit && !data['unit']) data['unit'] = m.unit;
    if (m.phone && !data['phone']) data['phone'] = m.phone;
    if (m.tag && !data['tag']) data['tag'] = m.tag;
    return {
      ...m,
      data,
      unit: m.unit || data['unit'] || '',
      phone: m.phone || data['phone'] || '',
      tag: m.tag || data['tag'] || '',
    };
  });

  return {
    ...session,
    fields,
    members,
  };
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.rolls) && Array.isArray(parsed.sessions)) {
        const seed = getInitialSeedData();
        const completedSession = seed.sessions[0];

        // Normalize rolls
        const normalizedRolls = parsed.rolls.map(normalizeRoll);

        // Normalize sessions and ensure completed 73-mark session is present
        let updated = false;
        const normalizedSessions = parsed.sessions.map((s: Session) => {
          if (s.title.includes('SNS Register – 31 Oct 2026') || s.id === 'sess-sns-20261031') {
            if (Object.keys(s.marks || {}).length < 73) {
              updated = true;
              return { ...completedSession, id: s.id };
            }
          }
          return normalizeSession(s, normalizedRolls);
        });

        const state: AppState = {
          rolls: normalizedRolls,
          sessions: normalizedSessions,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };

        if (updated || !parsed.settings) {
          saveAppState(state);
        }
        return state;
      }
    }

    // Legacy migration
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (legacyParsed && Array.isArray(legacyParsed.rolls)) {
        const seed = getInitialSeedData();
        const migrated: AppState = {
          rolls: (legacyParsed.rolls || seed.rolls).map(normalizeRoll),
          sessions: [seed.sessions[0]],
          settings: DEFAULT_SETTINGS,
        };
        saveAppState(migrated);
        return migrated;
      }
    }
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
  }

  const initial = getInitialSeedData();
  const state: AppState = {
    ...initial,
    settings: DEFAULT_SETTINGS,
  };
  saveAppState(state);
  return state;
}

export function saveAppState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
    return false;
  }
}

export function getMemberValue(member: Member, fieldId: string): string {
  if (member.data && member.data[fieldId] !== undefined) {
    return member.data[fieldId];
  }
  if (fieldId === 'unit') return member.unit || '';
  if (fieldId === 'phone') return member.phone || '';
  if (fieldId === 'tag') return member.tag || '';
  return '';
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.settings) {
        return { ...DEFAULT_SETTINGS, ...parsed.settings };
      }
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    const state = loadAppState();
    state.settings = settings;
    saveAppState(state);
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function getPhoneValue(member: Member, fields?: RollField[]): string {
  if (fields) {
    const phoneField = fields.find((f) => f.isPhoneField || f.type === 'phone' || f.id === 'phone');
    if (phoneField) {
      const val = getMemberValue(member, phoneField.id);
      if (val) return val;
    }
  }
  return member.phone || member.data?.['phone'] || '';
}

export function getGroupValue(
  member: Member,
  groupFieldOrFields?: string | RollField[],
  fieldsParam?: RollField[]
): string {
  let groupFieldId: string | undefined;
  let fields: RollField[] | undefined;

  if (Array.isArray(groupFieldOrFields)) {
    fields = groupFieldOrFields;
  } else {
    groupFieldId = groupFieldOrFields;
    fields = fieldsParam;
  }

  if (groupFieldId) {
    const val = getMemberValue(member, groupFieldId);
    if (val) return val;
  }
  if (fields) {
    const groupField = fields.find((f) => f.isGroupField);
    if (groupField) {
      const val = getMemberValue(member, groupField.id);
      if (val) return val;
    }
  }
  return member.tag || member.data?.['tag'] || '';
}

/**
 * Builds clean WhatsApp click-to-chat URL:
 * Handles stripping symbols, leading zeros, and applying default country code if missing
 */
export function buildWhatsAppLink(rawPhone: string, countryCode = '233'): string | null {
  if (!rawPhone) return null;
  // Take first phone number if multiple separated by / or comma
  const first = rawPhone.split(/[/,]/)[0].trim();
  // Strip all non-digits except +
  let clean = first.replace(/[^\d+]/g, '');
  if (!clean) return null;

  if (clean.startsWith('+')) {
    clean = clean.replace('+', '');
  } else if (clean.startsWith('0') && countryCode) {
    // E.g. "0555233330" with code "233" -> "233555233330"
    clean = countryCode.replace('+', '') + clean.slice(1);
  } else if (clean.length <= 9 && countryCode) {
    clean = countryCode.replace('+', '') + clean;
  }

  return `https://wa.me/${clean}`;
}

export function getMarkTimestamp(mark?: MarkValue): string | null {
  if (!mark) return null;
  if (typeof mark === 'string') return mark;
  return mark.timestamp || null;
}

export function getMarkStatus(mark?: MarkValue): string {
  if (!mark) return 'absent';
  if (typeof mark === 'string') return 'present';
  return mark.status || 'present';
}

export function isMemberPresent(session: Session, memberId: string): boolean {
  const mark = session.marks[memberId];
  if (!mark) return false;
  if (typeof mark === 'string') return true;
  return mark.status === 'present' || mark.status === 'late';
}

export function countPresent(session: Session): number {
  return session.members.filter((m) => isMemberPresent(session, m.id)).length;
}

export function countLate(session: Session): number {
  return session.members.filter((m) => {
    const mark = session.marks[m.id];
    return typeof mark === 'object' && mark.status === 'late';
  }).length;
}

export function countExcused(session: Session): number {
  return session.members.filter((m) => {
    const mark = session.marks[m.id];
    return typeof mark === 'object' && mark.status === 'excused';
  }).length;
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatTimeOnly(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}
