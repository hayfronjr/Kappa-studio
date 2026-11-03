import { AppState, Session, Roll, Member, MarkValue, RollField, AppSettings, MemberTag } from '../types';
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
  const rawFields: RollField[] = roll.fields && roll.fields.length > 0
    ? roll.fields
    : [
        { id: 'unit', name: 'Affiliated Group / Unit', type: 'text', required: true },
        { id: 'phone', name: 'Phone', type: 'phone', required: false, isPhoneField: true, isWhatsappActive: true },
        { id: 'tag', name: 'Pair #', type: 'label', required: false, isGroupField: true },
      ];

  const defaultFields: RollField[] = rawFields.map((f) => {
    let t = f.type;
    if ((t as string) === 'tag') t = 'label';
    if ((t as string) === 'select') t = 'choice';
    const isPhone = f.isPhoneField || t === 'phone';
    return {
      ...f,
      type: t,
      isPhoneField: isPhone,
      isWhatsappActive: isPhone ? (f.isWhatsappActive !== false) : false,
    };
  });

  const members = (roll.members || []).map((m) => {
    const data = { ...(m.data || {}) };
    if (m.unit && !data['unit']) data['unit'] = m.unit;
    if (m.phone && !data['phone']) data['phone'] = m.phone;
    if (m.tag && !data['tag']) data['tag'] = m.tag;
    return {
      ...m,
      data,
      memberTag: m.memberTag,
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
  const rawFields = session.fields && session.fields.length > 0
    ? session.fields
    : matchingRoll?.fields || [
        { id: 'unit', name: 'Affiliated Group / Unit', type: 'text', required: true },
        { id: 'phone', name: 'Phone', type: 'phone', required: false, isPhoneField: true, isWhatsappActive: true },
        { id: 'tag', name: 'Pair #', type: 'label', required: false, isGroupField: true },
      ];

  const fields: RollField[] = rawFields.map((f) => {
    let t = f.type;
    if ((t as string) === 'tag') t = 'label';
    if ((t as string) === 'select') t = 'choice';
    const isPhone = f.isPhoneField || t === 'phone';
    return {
      ...f,
      type: t,
      isPhoneField: isPhone,
      isWhatsappActive: isPhone ? (f.isWhatsappActive !== false) : false,
    };
  });

  const members = (session.members || []).map((m) => {
    const data = { ...(m.data || {}) };
    if (m.unit && !data['unit']) data['unit'] = m.unit;
    if (m.phone && !data['phone']) data['phone'] = m.phone;
    if (m.tag && !data['tag']) data['tag'] = m.tag;
    return {
      ...m,
      data,
      memberTag: m.memberTag,
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
 * Formats a group value based on the field's groupLabelType:
 * - 'numbers': if "1", returns "Group 1" (or "Pair 1"). If "1 - Media", returns "Group 1: Media".
 * - 'letters': if "A", returns "Group A". If "A - Media", returns "Group A: Media".
 * - 'text': returns raw name e.g. "Editorial".
 * Preserves group labels and group names together unless text was chosen.
 */
export function formatGroupDisplay(
  rawVal: string,
  fieldOrFields?: RollField | RollField[]
): string {
  if (!rawVal || !rawVal.trim()) return 'Unassigned';
  const clean = rawVal.trim();

  let field: RollField | undefined;
  if (Array.isArray(fieldOrFields)) {
    field = fieldOrFields.find((f) => f.isGroupField);
  } else {
    field = fieldOrFields;
  }

  if (!field) return clean;

  const labelType = field.groupLabelType || (field.type === 'number' ? 'numbers' : 'text');
  const prefix = /pair/i.test(field.name) ? 'Pair' : 'Group';

  if (labelType === 'numbers') {
    if (/^\d+$/.test(clean)) {
      return `${prefix} ${clean}`;
    }
    const match = clean.match(/^(\d+)[\s\-:]+(.+)$/);
    if (match) {
      return `${prefix} ${match[1]}: ${match[2]}`;
    }
  } else if (labelType === 'letters') {
    if (/^[A-Za-z]$/.test(clean)) {
      return `Group ${clean.toUpperCase()}`;
    }
    const match = clean.match(/^([A-Za-z])[\s\-:]+(.+)$/);
    if (match) {
      return `Group ${match[1].toUpperCase()}: ${match[2]}`;
    }
  }

  return clean;
}

/**
 * Returns formatted parameter values to display under a member's name in roster and session views.
 * Only values are returned (no parameter names), sorted by field order, separated by centered dots.
 */
export function getMemberDisplayValues(member: Member, fields?: RollField[]): string[] {
  if (!fields || fields.length === 0) {
    const fallback: string[] = [];
    if (member.unit && member.unit.trim()) fallback.push(member.unit.trim());
    if (member.tag && member.tag.trim()) fallback.push(member.tag.trim());
    if (member.phone && member.phone.trim()) fallback.push(member.phone.trim());
    return fallback;
  }

  return [...fields]
    .filter((f) => f.showInRoster !== false)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .map((f) => {
      const val = getMemberValue(member, f.id);
      if (!val || !val.trim()) return null;
      return f.type === 'label' ? formatGroupDisplay(val, f) : val.trim();
    })
    .filter((v): v is string => Boolean(v));
}

/**
 * Checks whether a member's tag is currently active based on configured display times
 */
export function isMemberTagActive(tag?: MemberTag): boolean {
  if (!tag || !tag.text || !tag.text.trim()) return false;

  const now = new Date();

  // If multi-parameter timing is configured:
  if (tag.timing) {
    const {
      untilEnabled,
      untilDateTime,
      forEnabled,
      forDurationMinutes,
      everyEnabled,
      everyDays,
      everyStartTime,
      everyEndTime,
    } = tag.timing;

    // If no timing parameter is enabled, it is permanent (active until manually removed)
    if (!untilEnabled && !forEnabled && !everyEnabled) {
      return true;
    }

    if (untilEnabled && untilDateTime) {
      const until = new Date(untilDateTime);
      if (!isNaN(until.getTime()) && now > until) {
        return false;
      }
    }

    if (forEnabled && forDurationMinutes && tag.createdAt) {
      const created = new Date(tag.createdAt);
      if (!isNaN(created.getTime())) {
        const expiresAt = new Date(created.getTime() + forDurationMinutes * 60 * 1000);
        if (now > expiresAt) {
          return false;
        }
      }
    }

    if (everyEnabled) {
      if (Array.isArray(everyDays) && everyDays.length > 0) {
        if (!everyDays.includes(now.getDay())) {
          return false;
        }
      }
      if (everyStartTime && everyEndTime) {
        const curMinutes = now.getHours() * 60 + now.getMinutes();
        const [sh, sm] = everyStartTime.split(':').map(Number);
        const [eh, em] = everyEndTime.split(':').map(Number);
        const startMin = sh * 60 + (sm || 0);
        const endMin = eh * 60 + (em || 0);
        const inWindow =
          startMin <= endMin
            ? curMinutes >= startMin && curMinutes <= endMin
            : curMinutes >= startMin || curMinutes <= endMin;
        if (!inWindow) {
          return false;
        }
      }
    }

    return true;
  }

  // Fallback for single timingType
  const timing = tag.timingType || 'permanent';

  if (timing === 'permanent') {
    return true;
  }

  if (timing === 'until') {
    if (!tag.untilDateTime) return true;
    const until = new Date(tag.untilDateTime);
    return !isNaN(until.getTime()) && now <= until;
  }

  if (timing === 'for') {
    if (!tag.forDurationMinutes || !tag.createdAt) return true;
    const created = new Date(tag.createdAt);
    if (isNaN(created.getTime())) return true;
    const expiresAt = new Date(created.getTime() + tag.forDurationMinutes * 60 * 1000);
    return now <= expiresAt;
  }

  if (timing === 'every') {
    if (Array.isArray(tag.everyDays) && tag.everyDays.length > 0) {
      if (!tag.everyDays.includes(now.getDay())) {
        return false;
      }
    }
    if (tag.everyStartTime && tag.everyEndTime) {
      const curMinutes = now.getHours() * 60 + now.getMinutes();
      const [sh, sm] = tag.everyStartTime.split(':').map(Number);
      const [eh, em] = tag.everyEndTime.split(':').map(Number);
      const startMin = sh * 60 + (sm || 0);
      const endMin = eh * 60 + (em || 0);

      if (startMin <= endMin) {
        return curMinutes >= startMin && curMinutes <= endMin;
      } else {
        return curMinutes >= startMin || curMinutes <= endMin;
      }
    }
    return true;
  }

  return true;
}

/**
 * Automatically assigns a label (e.g. Pair 1, Group A, Team 1-A)
 * according to label formatting configuration and member index.
 */
export function generateAutoLabel(index: number, field: RollField): string {
  const config = field.labelConfig || {
    labelType: field.groupLabelType === 'letters' ? 'letter' : 'number',
    prefix: /pair/i.test(field.name) ? 'Pair ' : /group/i.test(field.name) ? 'Group ' : '',
    startValue: 1,
    step: 1,
    itemsPerLabel: /pair/i.test(field.name) ? 2 : 1,
  };

  const itemsPerLabel = Math.max(1, config.itemsPerLabel || 1);
  const labelIndex = Math.floor(index / itemsPerLabel);
  const numVal = (config.startValue || 1) + labelIndex * (config.step || 1);

  if (config.labelType === 'letter') {
    const letter = String.fromCharCode(65 + (labelIndex % 26));
    return `${config.prefix || ''}${letter}`;
  }

  if (config.labelType === 'both') {
    const subIdx = index % itemsPerLabel;
    const subLetter = String.fromCharCode(65 + subIdx);
    return `${config.prefix || ''}${numVal}-${subLetter}`;
  }

  return `${config.prefix || ''}${numVal}`;
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
