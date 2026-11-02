import React, { useState } from 'react';
import {
  Settings,
  Palette,
  Moon,
  Sun,
  Monitor,
  Type,
  MessageCircle,
  Phone,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { AppSettings, AppState, ThemeColor, AppFont } from '../types';
import { exportDatabaseBackup } from '../utils/exportUtils';
import { getInitialSeedData } from '../data/seedData';
import { requestPersistentStorage } from '../utils/storage';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  state: AppState;
  onRestoreState: (newState: AppState) => void;
  storagePersisted: boolean;
  setStoragePersisted: (val: boolean) => void;
}

const THEME_OPTIONS: { id: ThemeColor; name: string; hex: string; bgClass: string }[] = [
  { id: 'green', name: 'Forest Green (Default)', hex: '#116b52', bgClass: 'bg-[#116b52]' },
  { id: 'blue', name: 'Ocean Blue', hex: '#2563eb', bgClass: 'bg-blue-600' },
  { id: 'purple', name: 'Royal Purple', hex: '#7c3aed', bgClass: 'bg-purple-600' },
  { id: 'rose', name: 'Crimson Rose', hex: '#e11d48', bgClass: 'bg-rose-600' },
  { id: 'amber', name: 'Warm Amber', hex: '#d97706', bgClass: 'bg-amber-600' },
  { id: 'slate', name: 'Tech Slate', hex: '#475569', bgClass: 'bg-slate-600' },
];

const FONT_OPTIONS: { id: AppFont; name: string; description: string; sample: string }[] = [
  { id: 'sans', name: 'Modern Sans', description: 'Clean system interface font', sample: 'Aa Bb 123' },
  { id: 'rounded', name: 'Rounded Soft', description: 'Friendly curved typography', sample: 'Aa Bb 123' },
  { id: 'mono', name: 'Technical Mono', description: 'Clean monospace terminal style', sample: 'Aa Bb 123' },
  { id: 'serif', name: 'Editorial Serif', description: 'Classic editorial styling', sample: 'Aa Bb 123' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  state,
  onRestoreState,
  storagePersisted,
  setStoragePersisted,
}) => {
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleDownloadBackup = async () => {
    const ok = await exportDatabaseBackup(state);
    if (ok) showNotice('Full backup JSON file downloaded!');
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.rolls) && Array.isArray(parsed.sessions)) {
          onRestoreState({
            rolls: parsed.rolls,
            sessions: parsed.sessions,
            settings: parsed.settings || settings,
          });
          showNotice('Backup restored successfully!');
        } else {
          alert('Invalid backup file structure.');
        }
      } catch (err) {
        alert('Could not parse the backup file. Please ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRequestPersistence = async () => {
    const ok = await requestPersistentStorage();
    setStoragePersisted(ok);
    if (ok) {
      showNotice('Persistent storage granted by browser!');
    } else {
      showNotice('Storage persistence already active.');
    }
  };

  const handleResetToSeed = () => {
    const seed = getInitialSeedData();
    onRestoreState({
      ...seed,
      settings,
    });
    setConfirmReset(false);
    showNotice('Restored sample SNS 98-person roster and completed register!');
  };

  const handleClearAllData = () => {
    const emptyState: AppState = {
      rolls: [],
      sessions: [],
      settings,
    };
    onRestoreState(emptyState);
    setConfirmClear(false);
    showNotice('All rolls and registers cleared. You now have a clean slate.');
  };

  return (
    <div className="mx-auto max-w-4xl pb-16">
      {/* Title Card */}
      <div className="mb-6 rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#116b52] text-white shadow-xs dark:bg-[#3fbf95] dark:text-[#0b1410]">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-[#1d2b25] dark:text-[#e8efe9]">
              Settings &amp; Preferences
            </h1>
            <p className="text-xs text-[#6b7770] dark:text-[#92a199]">
              Customize app theme colors, appearance, WhatsApp integration, and data management.
            </p>
          </div>
        </div>

        {notice && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{notice}</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* SECTION 1: UI Theme & Color Customization */}
        <div className="rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[#116b52] dark:text-[#3fbf95]" />
            <h2 className="font-bold text-base text-[#1d2b25] dark:text-[#e8efe9]">
              Theme &amp; Accent Color
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[#6b7770] dark:text-[#92a199]">
            Choose your preferred color theme for buttons, active tabs, and highlights.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {THEME_OPTIONS.map((theme) => {
              const active = settings.themeColor === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => onUpdateSettings({ ...settings, themeColor: theme.id })}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-[#116b52] bg-[#e3f3ec]/50 shadow-xs dark:border-[#3fbf95] dark:bg-[#1e3a2f]/40'
                      : 'border-[#e3e1d8] bg-[#f6f5f0] hover:border-[#116b52]/40 dark:border-[#2b3731] dark:bg-[#121816]'
                  }`}
                >
                  <span
                    className={`h-5 w-5 shrink-0 rounded-full ${theme.bgClass} shadow-xs ring-2 ${
                      active ? 'ring-offset-2 ring-black/40 dark:ring-white/60' : 'ring-transparent'
                    }`}
                  />
                  <span className="font-semibold text-xs text-[#1d2b25] dark:text-[#e8efe9]">
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Color Mode: Light / Dark / System */}
          <div className="mt-5 border-t border-[#e3e1d8] pt-4 dark:border-[#2b3731]">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#6b7770] dark:text-[#92a199]">
              Display Mode
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                onClick={() => onUpdateSettings({ ...settings, mode: 'light' })}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                  settings.mode === 'light'
                    ? 'border-[#116b52] bg-[#116b52] text-white dark:bg-[#3fbf95] dark:text-[#0b1410]'
                    : 'border-[#e3e1d8] bg-[#f6f5f0] text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]'
                }`}
              >
                <Sun className="h-4 w-4" />
                <span>Light Mode</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ ...settings, mode: 'dark' })}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                  settings.mode === 'dark'
                    ? 'border-[#116b52] bg-[#116b52] text-white dark:bg-[#3fbf95] dark:text-[#0b1410]'
                    : 'border-[#e3e1d8] bg-[#f6f5f0] text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]'
                }`}
              >
                <Moon className="h-4 w-4" />
                <span>Dark Mode</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ ...settings, mode: 'system' })}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                  settings.mode === 'system'
                    ? 'border-[#116b52] bg-[#116b52] text-white dark:bg-[#3fbf95] dark:text-[#0b1410]'
                    : 'border-[#e3e1d8] bg-[#f6f5f0] text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]'
                }`}
              >
                <Monitor className="h-4 w-4" />
                <span>System Automatic</span>
              </button>
            </div>
          </div>

          {/* Typography / Font Style */}
          <div className="mt-5 border-t border-[#e3e1d8] pt-4 dark:border-[#2b3731]">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#6b7770] dark:text-[#92a199]">
              Font Style
            </h3>
            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {FONT_OPTIONS.map((f) => {
                const active = settings.font === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => onUpdateSettings({ ...settings, font: f.id })}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-[#116b52] bg-[#e3f3ec]/50 shadow-xs dark:border-[#3fbf95] dark:bg-[#1e3a2f]/40'
                        : 'border-[#e3e1d8] bg-[#f6f5f0] dark:border-[#2b3731] dark:bg-[#121816]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-[#1d2b25] dark:text-[#e8efe9]">
                        {f.name}
                      </div>
                      <div className="text-[11px] text-[#6b7770] dark:text-[#92a199]">
                        {f.description}
                      </div>
                    </div>
                    <span className="font-mono text-xs opacity-60">{f.sample}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 2: Communication & WhatsApp Settings */}
        <div className="rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-bold text-base text-[#1d2b25] dark:text-[#e8efe9]">
              WhatsApp &amp; Phone Contact Integration
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[#6b7770] dark:text-[#92a199]">
            Configure one-click WhatsApp chat and dialer links for roll call attendees.
          </p>

          <div className="mt-4 rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-4 dark:border-[#2b3731] dark:bg-[#121816]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <label className="block text-xs font-bold text-[#1d2b25] dark:text-[#e8efe9]">
                  Default International Country Calling Code
                </label>
                <p className="text-[11px] text-[#6b7770] dark:text-[#92a199]">
                  Prepended to national numbers (e.g. <code>233</code> for Ghana, <code>1</code> for USA, <code>44</code> for UK).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#6b7770]">+</span>
                <input
                  type="text"
                  placeholder="233"
                  value={settings.whatsappCountryCode}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      whatsappCountryCode: e.target.value.replace(/[^\d]/g, ''),
                    })
                  }
                  className="w-24 rounded-lg border border-[#e3e1d8] bg-white px-3 py-1.5 text-xs font-mono font-bold text-[#1d2b25] outline-hidden focus:border-[#116b52] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
                />
              </div>
            </div>

            <div className="mt-3 text-[11px] text-[#6b7770] dark:text-[#92a199] border-t border-[#e3e1d8] pt-2.5 dark:border-[#2b3731]">
              <strong>How it works:</strong> Clicking the WhatsApp icon on any member with phone number <code>0555233330</code> automatically routes to <code>https://wa.me/233555233330</code>, opening your WhatsApp mobile app or WhatsApp Web desktop without needing to save them to your address book first.
            </div>
          </div>
        </div>

        {/* SECTION 3: Data Management & Backup */}
        <div className="rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-[#116b52] dark:text-[#3fbf95]" />
            <h2 className="font-bold text-base text-[#1d2b25] dark:text-[#e8efe9]">
              Data Backup &amp; Storage Management
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[#6b7770] dark:text-[#92a199]">
            Save full JSON database backups, restore previous copies, or start fresh on new devices.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={handleDownloadBackup}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#116b52] py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#0e5742] active:scale-95 dark:bg-[#3fbf95] dark:text-[#0b1410]"
            >
              <Download className="h-4 w-4" />
              <span>Download Full Backup (.json)</span>
            </button>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] py-2.5 text-xs font-semibold text-[#1d2b25] shadow-2xs hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]">
              <Upload className="h-4 w-4 text-blue-600" />
              <span>Restore Backup File (.json)</span>
              <input type="file" accept=".json,application/json" onChange={handleRestoreFile} className="hidden" />
            </label>
          </div>

          {/* Storage Persistence */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3 text-xs dark:border-[#2b3731] dark:bg-[#121816]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                Persistent Storage Status:{' '}
                <strong>{storagePersisted ? 'Active (Protected)' : 'Standard'}</strong>
              </span>
            </div>
            {!storagePersisted && (
              <button
                onClick={handleRequestPersistence}
                className="rounded-lg bg-[#116b52] px-3 py-1 text-[11px] font-semibold text-white dark:bg-[#3fbf95] dark:text-[#0b1410]"
              >
                Request Persistence
              </button>
            )}
          </div>

          {/* Reset to Seed & Clear All Data */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e1d8] pt-4 dark:border-[#2b3731]">
            <div>
              <span className="text-xs font-bold text-[#1d2b25] dark:text-[#e8efe9]">
                Roster Initialization &amp; Clean Slate
              </span>
              <p className="text-[11px] text-[#6b7770] dark:text-[#92a199]">
                Reset to reference demonstration data or wipe clean for a fresh device deployment.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {confirmReset ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleResetToSeed}
                    className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-bold text-white shadow-xs"
                  >
                    Confirm Reset?
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="text-xs text-[#6b7770]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="flex items-center gap-1 rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-1.5 text-xs font-medium text-[#1d2b25] hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Restore Sample SNS Roster</span>
                </button>
              )}

              {confirmClear ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleClearAllData}
                    className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-xs"
                  >
                    Confirm Wipe?
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-xs text-[#6b7770]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear All Data</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
