/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { SessionList } from './components/SessionList';
import { SessionView } from './components/SessionView';
import { SessionDetail } from './components/SessionDetail';
import { RollList } from './components/RollList';
import { RollEditor } from './components/RollEditor';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { AppState, Session, Roll, AppSettings } from './types';
import {
  loadAppState,
  saveAppState,
  saveSettings,
  uid,
  formatDateOnly,
  requestPersistentStorage,
  DEFAULT_SETTINGS,
} from './utils/storage';
import { Play, X } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<'sessions' | 'rolls' | 'analytics' | 'settings'>('sessions');
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [activeDetailSession, setActiveDetailSession] = useState<Session | null>(null);
  const [activeRoll, setActiveRoll] = useState<Roll | null>(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [selectedRollForNewSession, setSelectedRollForNewSession] = useState<string>('');
  const [newSessionTitle, setNewSessionTitle] = useState<string>('');
  const [newSessionLocation, setNewSessionLocation] = useState<string>('');
  const [storagePersisted, setStoragePersisted] = useState(false);

  const currentSettings: AppSettings = state.settings || DEFAULT_SETTINGS;

  const isEffectiveDark =
    currentSettings.mode === 'dark' ||
    (currentSettings.mode === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Apply Theme color, Font, and Display Mode (Dark/Light/System)
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', currentSettings.themeColor || 'green');
    root.setAttribute('data-font', currentSettings.font || 'sans');

    if (currentSettings.mode === 'dark') {
      root.classList.add('dark');
    } else if (currentSettings.mode === 'light') {
      root.classList.remove('dark');
    } else {
      // System automatic
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [currentSettings.themeColor, currentSettings.font, currentSettings.mode]);

  // Live listener for system dark/light changes when mode is 'system'
  useEffect(() => {
    if (currentSettings.mode !== 'system' || typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemMode = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    mediaQuery.addEventListener('change', updateSystemMode);
    return () => mediaQuery.removeEventListener('change', updateSystemMode);
  }, [currentSettings.mode]);

  // Request storage persistence once on launch
  useEffect(() => {
    requestPersistentStorage().then((persisted) => {
      setStoragePersisted(persisted);
    });
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // Handle URL shortcut query params (?action=new-session or ?action=history)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      if (action === 'new-session') {
        setShowNewSessionModal(true);
      } else if (action === 'history') {
        setActiveTab('sessions');
      }
    }
  }, []);

  const handleUpdateSettings = (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setState((prev) => ({
      ...prev,
      settings: newSettings,
    }));
    // Instant DOM synchronization so changes reflect without delay
    const root = document.documentElement;
    root.setAttribute('data-theme', newSettings.themeColor || 'green');
    root.setAttribute('data-font', newSettings.font || 'sans');
    if (newSettings.mode === 'dark') {
      root.classList.add('dark');
    } else if (newSettings.mode === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  // Handler to start a new roll call session
  const handleStartSession = (roll: Roll) => {
    const now = new Date();
    const defaultTitle = `${roll.name} – ${formatDateOnly(now.toISOString())}`;
    setSelectedRollForNewSession(roll.id);
    setNewSessionTitle(defaultTitle);
    setNewSessionLocation('');
    setShowNewSessionModal(true);
  };

  const confirmCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const roll = state.rolls.find((r) => r.id === selectedRollForNewSession) || state.rolls[0];
    if (!roll) return;

    const now = new Date().toISOString();
    const title = newSessionTitle.trim() || `${roll.name} – ${formatDateOnly(now)}`;

    const newSession: Session = {
      id: uid('sess'),
      rollId: roll.id,
      rollName: roll.name,
      title,
      start: now,
      end: null,
      status: 'open',
      fields: roll.fields || [],
      members: roll.members.map((m) => ({ ...m, data: { ...(m.data || {}) } })),
      marks: {},
      location: newSessionLocation.trim() || undefined,
    };

    const updatedSessions = [newSession, ...state.sessions];
    setState({ ...state, sessions: updatedSessions });
    setShowNewSessionModal(false);
    setActiveSession(newSession);
    setActiveDetailSession(null);
  };

  const handleUpdateSession = (updated: Session) => {
    const updatedSessions = state.sessions.map((s) => (s.id === updated.id ? updated : s));
    setState({ ...state, sessions: updatedSessions });
    setActiveSession(updated);
  };

  const handleCloseSession = (closedSession: Session) => {
    const updatedSessions = state.sessions.map((s) => (s.id === closedSession.id ? closedSession : s));
    setState({ ...state, sessions: updatedSessions });
    setActiveSession(null);
    setActiveDetailSession(closedSession);
  };

  const handleDeleteSession = (sessionId: string) => {
    const updatedSessions = state.sessions.filter((s) => s.id !== sessionId);
    setState({ ...state, sessions: updatedSessions });
    if (activeSession?.id === sessionId) setActiveSession(null);
    if (activeDetailSession?.id === sessionId) setActiveDetailSession(null);
  };

  const handleReopenSession = (session: Session) => {
    const reopened: Session = {
      ...session,
      status: 'open',
      end: null,
    };
    handleUpdateSession(reopened);
    setActiveDetailSession(null);
    setActiveSession(reopened);
  };

  // Roll management handlers
  const handleCreateRoll = (newRoll: Roll) => {
    setState({
      ...state,
      rolls: [...state.rolls, newRoll],
    });
    setActiveRoll(newRoll);
  };

  const handleUpdateRoll = (updated: Roll) => {
    const updatedRolls = state.rolls.map((r) => (r.id === updated.id ? updated : r));
    setState({ ...state, rolls: updatedRolls });
    setActiveRoll(updated);
  };

  const handleDeleteRoll = (rollId: string) => {
    setState({
      ...state,
      rolls: state.rolls.filter((r) => r.id !== rollId),
    });
    if (activeRoll?.id === rollId) setActiveRoll(null);
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-tx)] transition-colors">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setActiveSession(null);
          setActiveDetailSession(null);
          setActiveRoll(null);
        }}
        onQuickTakeRoll={() => {
          if (state.rolls.length > 0) {
            handleStartSession(state.rolls[0]);
          } else {
            setActiveTab('rolls');
          }
        }}
        darkMode={isEffectiveDark}
        setDarkMode={(val) => {
          handleUpdateSettings({
            ...currentSettings,
            mode: val ? 'dark' : 'light',
          });
        }}
        storagePersisted={storagePersisted}
      />

      {/* PWA Install Banner */}
      <PWAInstallBanner />

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
        {/* VIEW 1: Active Roll Call Taker */}
        {activeSession ? (
          <SessionView
            session={activeSession}
            onUpdateSession={handleUpdateSession}
            onCloseSession={handleCloseSession}
            onBack={() => setActiveSession(null)}
            onViewDetails={(s) => {
              setActiveSession(null);
              setActiveDetailSession(s);
            }}
          />
        ) : activeDetailSession ? (
          /* VIEW 2: Session Analysis & Export Center */
          <SessionDetail
            session={activeDetailSession}
            roll={state.rolls.find((r) => r.id === activeDetailSession.rollId)}
            allSessions={state.sessions}
            onBack={() => setActiveDetailSession(null)}
            onResume={(s) => {
              setActiveDetailSession(null);
              setActiveSession(s);
            }}
            onReopen={handleReopenSession}
            onDelete={handleDeleteSession}
          />
        ) : activeRoll ? (
          /* VIEW 3: Edit Roster / Roll (Custom Parameters & Members) */
          <RollEditor
            roll={activeRoll}
            onUpdateRoll={handleUpdateRoll}
            onDeleteRoll={handleDeleteRoll}
            onStartSession={(r) => {
              setActiveRoll(null);
              handleStartSession(r);
            }}
            onBack={() => setActiveRoll(null)}
          />
        ) : (
          /* TAB VIEWS */
          <>
            {activeTab === 'sessions' && (
              <SessionList
                sessions={state.sessions}
                rolls={state.rolls}
                onOpenSession={(s) => setActiveSession(s)}
                onViewDetails={(s) => setActiveDetailSession(s)}
                onDeleteSession={handleDeleteSession}
                onNewSessionPrompt={() => {
                  if (state.rolls.length > 0) {
                    handleStartSession(state.rolls[0]);
                  } else {
                    setActiveTab('rolls');
                  }
                }}
              />
            )}

            {activeTab === 'rolls' && (
              <RollList
                rolls={state.rolls}
                sessions={state.sessions}
                onSelectRoll={(r) => setActiveRoll(r)}
                onStartSession={handleStartSession}
                onCreateRoll={handleCreateRoll}
                onDeleteRoll={handleDeleteRoll}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsView rolls={state.rolls} sessions={state.sessions} />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                settings={currentSettings}
                onUpdateSettings={handleUpdateSettings}
                state={state}
                onRestoreState={(newState) => setState(newState)}
                storagePersisted={storagePersisted}
                setStoragePersisted={setStoragePersisted}
              />
            )}
          </>
        )}
      </main>

      {/* Start New Session Modal */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1b2420]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-[#116b52] dark:text-[#3fbf95] fill-current" />
                <h3 className="font-bold text-lg text-[#1d2b25] dark:text-[#e8efe9]">
                  Start Roll Call
                </h3>
              </div>
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="rounded-lg p-1 text-[#6b7770] hover:bg-stone-100 dark:text-[#92a199]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={confirmCreateSession} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1d2b25] dark:text-[#e8efe9] mb-1">
                  Choose Roster / Roll *
                </label>
                <select
                  value={selectedRollForNewSession}
                  onChange={(e) => {
                    setSelectedRollForNewSession(e.target.value);
                    const r = state.rolls.find((roll) => roll.id === e.target.value);
                    if (r) {
                      setNewSessionTitle(`${r.name} – ${formatDateOnly(new Date().toISOString())}`);
                    }
                  }}
                  className="w-full rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs font-semibold text-[#1d2b25] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                >
                  {state.rolls.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.members.length} members)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d2b25] dark:text-[#e8efe9] mb-1">
                  Session Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SNS Register – 02 Nov 2026"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  className="w-full rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[#116b52] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d2b25] dark:text-[#e8efe9] mb-1">
                  Location / Room (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Auditorium / Off Campus"
                  value={newSessionLocation}
                  onChange={(e) => setNewSessionLocation(e.target.value)}
                  className="w-full rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[#116b52] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-[#6b7770]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-[#116b52] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0e5742] active:scale-95 dark:bg-[#3fbf95] dark:text-[#0b1410]"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Begin Attendance</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
