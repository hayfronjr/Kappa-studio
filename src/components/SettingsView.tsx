import React, { useState } from 'react';
import {
  Settings,
  Palette,
  Moon,
  Sun,
  Monitor,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  MessageCircle,
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

const THEME_OPTIONS: { id: ThemeColor; name: string; hex: string }[] = [
  { id: 'green', name: 'Forest Green', hex: '#116b52' },
  { id: 'blue', name: 'Ocean Blue', hex: '#2563eb' },
  { id: 'purple', name: 'Royal Purple', hex: '#7c3aed' },
  { id: 'rose', name: 'Crimson Rose', hex: '#e11d48' },
  { id: 'amber', name: 'Warm Amber', hex: '#d97706' },
  { id: 'slate', name: 'Tech Slate', hex: '#475569' },
];

const FONT_OPTIONS: { id: AppFont; name: string; sample: string; fontFamily: string }[] = [
  { id: 'sans', name: 'DM Sans', sample: 'Aa Bb 123', fontFamily: "'DM Sans', sans-serif" },
  { id: 'rounded', name: 'Rounded Soft', sample: 'Aa Bb 123', fontFamily: "'Quicksand', 'Nunito', sans-serif" },
  { id: 'jakarta', name: 'Plus Jakarta Sans', sample: 'Aa Bb 123', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  { id: 'outfit', name: 'Outfit', sample: 'Aa Bb 123', fontFamily: "'Outfit', sans-serif" },
  { id: 'mono', name: 'JetBrains Mono', sample: 'Aa Bb 123', fontFamily: "'JetBrains Mono', monospace" },
  { id: 'serif', name: 'Playfair Display', sample: 'Aa Bb 123', fontFamily: "'Playfair Display', serif" },
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
    setTimeout(() => setNotice(null), 3000);
  };

  const handleDownloadBackup = async () => {
    const ok = await exportDatabaseBackup(state);
    if (ok) showNotice('Full backup downloaded');
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
          showNotice('Backup restored');
        } else {
          alert('Invalid backup file structure.');
        }
      } catch (err) {
        alert('Could not parse the backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRequestPersistence = async () => {
    const ok = await requestPersistentStorage();
    setStoragePersisted(ok);
    if (ok) {
      showNotice('Storage persistence active');
    }
  };

  const handleResetToSeed = () => {
    const seed = getInitialSeedData();
    onRestoreState({
      ...seed,
      settings,
    });
    setConfirmReset(false);
    showNotice('Sample roster restored');
  };

  const handleClearAllData = () => {
    const emptyState: AppState = {
      rolls: [],
      sessions: [],
      settings,
    };
    onRestoreState(emptyState);
    setConfirmClear(false);
    showNotice('All data cleared');
  };

  return (
    <div className="mx-auto max-w-4xl pb-16">
      {/* Title Card - App and Settings Icon adapt to theme */}
      <div className="mb-6 rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--theme-primary)] text-white shadow-xs transition-colors">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-[#1d2b25] dark:text-[#e8efe9]">
              Settings
            </h1>
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
        {/* SECTION 1: Theme & Display Mode */}
        <div className="rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[var(--theme-primary)]" />
            <h2 className="font-bold text-base text-[#1d2b25] dark:text-[#e8efe9]">
              Theme &amp; Accent Color
            </h2>
          </div>

          {/* Theme Color Tiles: Swatches stay their true colors */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {THEME_OPTIONS.map((theme) => {
              const active = settings.themeColor === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => onUpdateSettings({ ...settings, themeColor: theme.id })}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] shadow-xs ring-2 ring-[var(--theme-primary)]/40'
                      : 'border-[#e3e1d8] bg-[#f6f5f0] hover:border-[var(--theme-primary)]/40 dark:border-[#2b3731] dark:bg-[#121816]'
                  }`}
                >
                  <span
                    style={{ backgroundColor: theme.hex }}
                    className={`theme-swatch-shell flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-xs transition-transform ${
                      active ? 'ring-2 ring-offset-2 ring-black/70 dark:ring-white scale-110' : 'ring-1 ring-black/20'
                    }`}
                  >
                    {active && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </span>
                  <span className="font-semibold text-xs text-[#1d2b25] dark:text-[#e8efe9]">
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Color Mode: Light / Dark / System */}
          <div className="mt-6 border-t border-[#e3e1d8] pt-4 dark:border-[#2b3731]">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#6b7770] dark:text-[#92a199] mb-3">
              Display Mode
            </h3>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {/* Light Mode */}
              <button
                onClick={() => onUpdateSettings({ ...settings, mode: 'light' })}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                  settings.mode === 'light'
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] shadow-sm ring-2 ring-[var(--theme-primary)] ring-offset-2'
                    : 'border-[#e3e1d8] bg-[#f6f5f0] hover:border-[var(--theme-primary)]/40 dark:border-[#2b3731] dark:bg-[#121816]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sun className={`h-4 w-4 ${settings.mode === 'light' ? 'text-amber-500' : 'text-[#6b7770]'}`} />
                  <span className="font-bold text-xs text-[#1d2b25] dark:text-[#e8efe9]">
                    Light Mode
                  </span>
                </div>
                {settings.mode === 'light' && (
                  <CheckCircle2 className="h-4 w-4 text-[var(--theme-primary)] shrink-0" />
                )}
              </button>

              {/* Dark Mode */}
              <button
                onClick={() => onUpdateSettings({ ...settings, mode: 'dark' })}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                  settings.mode === 'dark'
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] shadow-sm ring-2 ring-[var(--theme-primary)] ring-offset-2'
                    : 'border-[#e3e1d8] bg-[#f6f5f0] hover:border-[var(--theme-primary)]/40 dark:border-[#2b3731] dark:bg-[#121816]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Moon className={`h-4 w-4 ${settings.mode === 'dark' ? 'text-indigo-400' : 'text-[#6b7770]'}`} />
                  <span className="font-bold text-xs text-[#1d2b25] dark:text-[#e8efe9]">
                    Dark Mode
                  </span>
                </div>
                {settings.mode === 'dark' && (
                  <CheckCircle2 className="h-4 w-4 text-[var(--theme-primary)] shrink-0" />
                )}
              </button>

              {/* System */}
              <button
                onClick={() => onUpdateSettings({ ...settings, mode: 'system' })}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                  settings.mode === 'system'
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] shadow-sm ring-2 ring-[var(--theme-primary)] ring-offset-2'
                    : 'border-[#e3e1d8] bg-[#f6f5f0] hover:border-[var(--theme-primary)]/40 dark:border-[#2b3731] dark:bg-[#121816]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Monitor className={`h-4 w-4 ${settings.mode === 'system' ? 'text-purple-400' : 'text-[#6b7770]'}`} />
                  <span className="font-bold text-xs text-[#1d2b25] dark:text-[#e8efe9]">
                    System
                  </span>
                </div>
                {settings.mode === 'system' && (
                  <CheckCircle2 className="h-4 w-4 text-[var(--theme-primary)] shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* Typography / Font Style (No descriptions, just the names and preview chips) */}
          <div className="mt-6 border-t border-[#e3e1d8] pt-4 dark:border-[#2b3731]">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#6b7770] dark:text-[#92a199] mb-3">
              Font Style
            </h3>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {FONT_OPTIONS.map((f) => {
                const active = settings.font === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => onUpdateSettings({ ...settings, font: f.id })}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] shadow-xs ring-2 ring-[var(--theme-primary)]/50'
                        : 'border-[#e3e1d8] bg-[#f6f5f0] hover:border-[var(--theme-primary)]/40 dark:border-[#2b3731] dark:bg-[#121816]'
                    }`}
                  >
                    <div
                      style={{ fontFamily: f.fontFamily }}
                      className="font-bold text-xs text-[#1d2b25] dark:text-[#e8efe9]"
                    >
                      {f.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        style={{ fontFamily: f.fontFamily }}
                        className="rounded-md border border-[#e3e1d8] bg-white px-2 py-0.5 text-xs font-semibold text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
                      >
                        {f.sample}
                      </span>
                      {active && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--theme-primary)]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 2: WhatsApp & Phone */}
        <div className="rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-bold text-base text-[#1d2b25] dark:text-[#e8efe9]">
              WhatsApp &amp; Phone
            </h2>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-4 dark:border-[#2b3731] dark:bg-[#121816]">
            <label className="text-xs font-bold text-[#1d2b25] dark:text-[#e8efe9]">
              Country Calling Code
            </label>
            <div className="flex items-center gap-1.5">
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
                className="w-20 rounded-lg border border-[#e3e1d8] bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-[#1d2b25] outline-hidden focus:border-[var(--theme-primary)] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Backup & Storage */}
        <div className="rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-[var(--theme-primary)]" />
            <h2 className="font-bold text-base text-[#1d2b25] dark:text-[#e8efe9]">
              Backup &amp; Storage
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={handleDownloadBackup}
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] py-2.5 text-xs font-semibold text-white shadow-2xs hover:opacity-90 active:scale-95 transition"
            >
              <Download className="h-4 w-4" />
              <span>Download Backup (.json)</span>
            </button>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] py-2.5 text-xs font-semibold text-[#1d2b25] shadow-2xs hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]">
              <Upload className="h-4 w-4 text-blue-600" />
              <span>Restore Backup (.json)</span>
              <input type="file" accept=".json,application/json" onChange={handleRestoreFile} className="hidden" />
            </label>
          </div>

          {/* Storage Persistence */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3 text-xs dark:border-[#2b3731] dark:bg-[#121816]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                Persistent Storage:{' '}
                <strong>{storagePersisted ? 'Active' : 'Standard'}</strong>
              </span>
            </div>
            {!storagePersisted && (
              <button
                onClick={handleRequestPersistence}
                className="rounded-lg bg-[var(--theme-primary)] px-3 py-1 text-[11px] font-semibold text-white hover:opacity-90"
              >
                Request Persistence
              </button>
            )}
          </div>

          {/* Reset & Wipe Buttons */}
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[#e3e1d8] pt-4 dark:border-[#2b3731]">
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
                <span>Restore Sample Roster</span>
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
  );
};
