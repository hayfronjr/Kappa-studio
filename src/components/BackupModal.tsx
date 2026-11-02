import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Database,
  ShieldCheck,
  FileCode,
} from 'lucide-react';
import { AppState } from '../types';
import { exportDatabaseBackup } from '../utils/exportUtils';
import { getInitialSeedData } from '../data/seedData';
import { requestPersistentStorage } from '../utils/storage';

interface BackupModalProps {
  state: AppState;
  onRestoreState: (newState: AppState) => void;
  storagePersisted: boolean;
  setStoragePersisted: (val: boolean) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  state,
  onRestoreState,
  storagePersisted,
  setStoragePersisted,
}) => {
  const [notification, setNotification] = useState<string | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(
    null
  );
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        if (est.usage !== undefined && est.quota !== undefined) {
          setStorageEstimate({ usage: est.usage, quota: est.quota });
        }
      });
    }
  }, []);

  const handleDownloadBackup = async () => {
    const ok = await exportDatabaseBackup(state);
    if (ok) {
      setNotification('Backup JSON file downloaded to your device!');
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.rolls) && Array.isArray(parsed.sessions)) {
          // Merge rolls and sessions without duplicate IDs
          const existingRollIds = new Set(state.rolls.map((r) => r.id));
          const existingSessionIds = new Set(state.sessions.map((s) => s.id));

          const mergedRolls = [...state.rolls];
          (parsed.rolls as typeof state.rolls).forEach((r) => {
            if (!existingRollIds.has(r.id)) mergedRolls.push(r);
          });

          const mergedSessions = [...state.sessions];
          (parsed.sessions as typeof state.sessions).forEach((s) => {
            if (!existingSessionIds.has(s.id)) mergedSessions.push(s);
          });

          const newState: AppState = {
            rolls: mergedRolls,
            sessions: mergedSessions,
          };

          onRestoreState(newState);
          setNotification('Backup successfully restored and merged!');
          setTimeout(() => setNotification(null), 3500);
        } else {
          alert('Invalid backup file structure.');
        }
      } catch (err) {
        alert('Could not parse the backup file. Ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleEnablePersistence = async () => {
    const success = await requestPersistentStorage();
    setStoragePersisted(success);
    if (success) {
      setNotification('Persistent local storage granted by browser!');
    } else {
      setNotification('Storage persistence is already managed by your browser.');
    }
    setTimeout(() => setNotification(null), 3500);
  };

  const handleResetToSeed = () => {
    const seed = getInitialSeedData();
    onRestoreState(seed);
    setConfirmReset(false);
    setNotification('Restored to reference roster & 31 Oct session!');
    setTimeout(() => setNotification(null), 3500);
  };

  const totalMembers = state.rolls.reduce((acc, r) => acc + r.members.length, 0);

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <div className="mb-6 rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3f3ec] text-[#116b52] dark:bg-[#1e3a2f] dark:text-[#3fbf95]">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-[#1d2b25] dark:text-[#e8efe9]">
              Offline Data Backup &amp; Storage
            </h1>
            <p className="text-xs text-[#6b7770] dark:text-[#92a199]">
              Your attendance registers and rolls are stored locally on this device.
            </p>
          </div>
        </div>

        {notification && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Current Database Summary */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3 text-center dark:border-[#2b3731] dark:bg-[#121816]">
            <div className="text-xs text-[#6b7770] dark:text-[#92a199]">Roll Rosters</div>
            <div className="mt-1 font-bold text-xl text-[#1d2b25] dark:text-[#e8efe9]">
              {state.rolls.length}
            </div>
          </div>

          <div className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3 text-center dark:border-[#2b3731] dark:bg-[#121816]">
            <div className="text-xs text-[#6b7770] dark:text-[#92a199]">Total People</div>
            <div className="mt-1 font-bold text-xl text-[#1d2b25] dark:text-[#e8efe9]">
              {totalMembers}
            </div>
          </div>

          <div className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3 text-center dark:border-[#2b3731] dark:bg-[#121816]">
            <div className="text-xs text-[#6b7770] dark:text-[#92a199]">Registers Taken</div>
            <div className="mt-1 font-bold text-xl text-[#1d2b25] dark:text-[#e8efe9]">
              {state.sessions.length}
            </div>
          </div>

          <div className="rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] p-3 text-center dark:border-[#2b3731] dark:bg-[#121816]">
            <div className="text-xs text-[#6b7770] dark:text-[#92a199]">Storage Type</div>
            <div className="mt-1 font-bold text-sm text-[#116b52] dark:text-[#3fbf95]">
              {storagePersisted ? 'Persistent' : 'Device Storage'}
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Restore Controls */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Download Backup */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
          <div>
            <div className="flex items-center gap-2 text-[#116b52] dark:text-[#3fbf95]">
              <Download className="h-5 w-5" />
              <h2 className="font-bold text-base">Download Full Backup</h2>
            </div>
            <p className="mt-2 text-xs text-[#6b7770] dark:text-[#92a199]">
              Exports a complete JSON file containing all rolls, member directories, and past attendance sessions with timestamps.
            </p>
          </div>
          <button
            onClick={handleDownloadBackup}
            className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#116b52] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0e5742] active:scale-95 dark:bg-[#3fbf95] dark:text-[#0b1410]"
          >
            <Download className="h-4 w-4" />
            <span>Download Backup (.json)</span>
          </button>
        </div>

        {/* Restore Backup */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Upload className="h-5 w-5" />
              <h2 className="font-bold text-base">Restore Backup File</h2>
            </div>
            <p className="mt-2 text-xs text-[#6b7770] dark:text-[#92a199]">
              Load a previously exported RollCall backup file from your Windows desktop or Android storage. Missing rolls and sessions will be safely merged.
            </p>
          </div>

          <label className="mt-6 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] py-2.5 text-xs font-semibold text-[#1d2b25] shadow-xs hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]">
            <Upload className="h-4 w-4 text-blue-600" />
            <span>Select Backup File (.json)</span>
            <input type="file" accept=".json,application/json" onChange={handleRestoreFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* Persistence & Diagnostics */}
      <div className="mt-6 rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-sm dark:border-[#2b3731] dark:bg-[#1b2420]">
        <h2 className="font-bold text-sm text-[#1d2b25] dark:text-[#e8efe9]">
          Storage Protection &amp; Diagnostics
        </h2>
        <p className="mt-0.5 text-xs text-[#6b7770] dark:text-[#92a199]">
          Prevent Android or Windows browsers from automatically clearing cached roll call registers under low disk space.
        </p>

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
              onClick={handleEnablePersistence}
              className="rounded-lg bg-[#116b52] px-3 py-1 text-[11px] font-semibold text-white dark:bg-[#3fbf95] dark:text-[#0b1410]"
            >
              Request Persistence
            </button>
          )}
        </div>

        {/* Reset / Sample seed button */}
        <div className="mt-4 flex items-center justify-between border-t border-[#e3e1d8] pt-4 dark:border-[#2b3731]">
          <div className="text-xs text-[#6b7770] dark:text-[#92a199]">
            Reset or restore sample demonstration data (98 reference members).
          </div>
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetToSeed}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
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
              className="flex items-center gap-1 rounded-lg border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-1.5 text-xs font-medium text-[#6b7770] hover:bg-rose-50 hover:text-rose-600 dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#92a199]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset to Seed Data</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
