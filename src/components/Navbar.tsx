import React from 'react';
import {
  ClipboardCheck,
  Users,
  History,
  BarChart3,
  HardDrive,
  Download,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  PlusCircle,
  Settings,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface NavbarProps {
  activeTab: 'rolls' | 'sessions' | 'analytics' | 'settings';
  setActiveTab: (tab: 'rolls' | 'sessions' | 'analytics' | 'settings') => void;
  onQuickTakeRoll: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  storagePersisted: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onQuickTakeRoll,
  darkMode,
  setDarkMode,
  storagePersisted,
}) => {
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, install, isIOS, isAndroid, isWindows } = usePWAInstall();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[var(--app-card)]/95 backdrop-blur-md transition-colors text-[var(--app-tx)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2.5 sm:px-6">
        {/* Brand & Identity */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--theme-primary)] text-white shadow-sm ring-2 ring-[var(--theme-primary)]/40 transition-colors">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-[var(--theme-primary)] sm:text-lg transition-colors">
              RollCall
            </span>
            <p className="hidden text-xs text-[#6b7770] dark:text-[#92a199] sm:block">
              Attendance &amp; Roll Registers
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2">
          {/* Offline/Online Badge */}
          <div
            title={isOnline ? 'Online (Local-First Offline Sync)' : 'Offline mode active'}
            className="flex items-center gap-1.5 rounded-full border border-[#e3e1d8] bg-white px-2 py-1 text-[11px] font-medium text-[#6b7770] shadow-2xs dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#92a199]"
          >
            {isOnline ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden xs:inline">Local Storage</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">Offline</span>
              </>
            )}
          </div>

          {/* Quick Take Roll Button */}
          <button
            onClick={onQuickTakeRoll}
            className="flex items-center gap-1.5 rounded-lg bg-[#116b52] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0e5742] active:scale-95 dark:bg-[#3fbf95] dark:text-[#0b1410] dark:hover:bg-[#35a882]"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Take Roll</span>
          </button>

          {/* PWA Install Button (Chromium / Android / Windows) */}
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="hidden items-center gap-1.5 rounded-lg border border-[#116b52] bg-[#e3f3ec] px-2.5 py-1.5 text-xs font-semibold text-[#116b52] transition hover:bg-[#d5eee2] dark:border-[#3fbf95] dark:bg-[#1e3a2f] dark:text-[#3fbf95] sm:flex"
              title="Install RollCall on this device for full offline home screen access"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isWindows ? 'Install on Windows' : isAndroid ? 'Install on Android' : 'Install App'}</span>
            </button>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle color theme"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3e1d8] bg-white text-[#1d2b25] transition hover:bg-[#f6f5f0] dark:border-[#2b3731] dark:bg-[#1b2420] dark:text-[#e8efe9] dark:hover:bg-[#25322c]"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[#6b7770]" />}
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Icons only on phone, Icon + Label on tablet/PC) */}
      <nav className="mx-auto flex max-w-5xl overflow-x-auto px-3 sm:px-6">
        <div className="flex space-x-1 py-1">
          <button
            onClick={() => setActiveTab('sessions')}
            title="Registers & Sessions"
            aria-label="Registers and Sessions"
            className={`flex items-center justify-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition sm:text-sm ${
              activeTab === 'sessions'
                ? 'border-[#116b52] text-[#116b52] dark:border-[#3fbf95] dark:text-[#3fbf95]'
                : 'border-transparent text-[#6b7770] hover:text-[#1d2b25] dark:text-[#92a199] dark:hover:text-[#e8efe9]'
            }`}
          >
            <History className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Registers &amp; Sessions</span>
          </button>

          <button
            onClick={() => setActiveTab('rolls')}
            title="Rosters / Rolls"
            aria-label="Rosters and Rolls"
            className={`flex items-center justify-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition sm:text-sm ${
              activeTab === 'rolls'
                ? 'border-[#116b52] text-[#116b52] dark:border-[#3fbf95] dark:text-[#3fbf95]'
                : 'border-transparent text-[#6b7770] hover:text-[#1d2b25] dark:text-[#92a199] dark:hover:text-[#e8efe9]'
            }`}
          >
            <Users className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Rosters / Rolls</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            title="Analytics & Matrix"
            aria-label="Analytics and Matrix"
            className={`flex items-center justify-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition sm:text-sm ${
              activeTab === 'analytics'
                ? 'border-[#116b52] text-[#116b52] dark:border-[#3fbf95] dark:text-[#3fbf95]'
                : 'border-transparent text-[#6b7770] hover:text-[#1d2b25] dark:text-[#92a199] dark:hover:text-[#e8efe9]'
            }`}
          >
            <BarChart3 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Analytics &amp; Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            title="Settings & Backup"
            aria-label="Settings and Backup"
            className={`flex items-center justify-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition sm:text-sm ${
              activeTab === 'settings'
                ? 'border-[#116b52] text-[#116b52] dark:border-[#3fbf95] dark:text-[#3fbf95]'
                : 'border-transparent text-[#6b7770] hover:text-[#1d2b25] dark:text-[#92a199] dark:hover:text-[#e8efe9]'
            }`}
          >
            <Settings className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Settings &amp; Backup</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
