import React, { useState } from 'react';
import { Download, Monitor, Smartphone, X, CheckCircle2, Share2, HelpCircle } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, install, isIOS, isAndroid, isWindows } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  // If installable via beforeinstallprompt (Android / Windows / Chrome / Edge)
  if (isInstallable) {
    return (
      <div className="relative mx-auto mt-3 max-w-5xl px-3 sm:px-6">
        <div className="flex flex-col gap-3 rounded-xl border border-[#116b52]/30 bg-gradient-to-r from-[#e3f3ec] to-[#f0f9f5] p-3.5 shadow-sm dark:border-[#3fbf95]/30 dark:from-[#1b2b25] dark:to-[#162520] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#116b52] text-white shadow-xs dark:bg-[#3fbf95] dark:text-[#0b1410]">
              {isWindows ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#116b52] dark:text-[#3fbf95]">
                {isWindows
                  ? 'Install RollCall on Windows Desktop'
                  : isAndroid
                  ? 'Install RollCall on Android'
                  : 'Install RollCall App'}
              </h3>
              <p className="text-xs text-[#6b7770] dark:text-[#92a199]">
                Work without internet connection, launch from your desktop/home screen, and save rolls directly to device storage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={install}
              className="flex items-center gap-1.5 rounded-lg bg-[#116b52] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0e5742] active:scale-95 dark:bg-[#3fbf95] dark:text-[#0b1410] dark:hover:bg-[#35a882]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install Now</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss banner"
              className="rounded-lg p-1 text-[#6b7770] hover:bg-black/5 dark:text-[#92a199] dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <div className="relative mx-auto mt-3 max-w-5xl px-3 sm:px-6">
          <div className="flex items-center justify-between rounded-xl border border-[#e3e1d8] bg-white p-3 shadow-2xs dark:border-[#2b3731] dark:bg-[#1b2420]">
            <div className="flex items-center gap-2.5">
              <Smartphone className="h-5 w-5 text-[#116b52] dark:text-[#3fbf95]" />
              <div className="text-xs">
                <span className="font-semibold text-[#1d2b25] dark:text-[#e8efe9]">
                  Install on iPhone / iPad:
                </span>{' '}
                <span className="text-[#6b7770] dark:text-[#92a199]">
                  Tap Safari Share and select &quot;Add to Home Screen&quot;.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowIOSModal(true)}
                className="text-xs font-semibold text-[#116b52] underline dark:text-[#3fbf95]"
              >
                Guide
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 text-[#6b7770] dark:text-[#92a199]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1b2420]">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-[#1d2b25] dark:text-[#e8efe9]">
                  Add RollCall to Home Screen
                </h3>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="rounded-lg p-1 text-[#6b7770] dark:text-[#92a199]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-[#6b7770] dark:text-[#92a199]">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e3f3ec] font-bold text-[#116b52] dark:bg-[#1e3a2f] dark:text-[#3fbf95]">
                    1
                  </div>
                  <div>
                    Tap the <strong>Share</strong> button <Share2 className="inline h-3.5 w-3.5 mx-0.5 text-[#116b52]" /> in your browser toolbar (bottom on iPhone, top on iPad).
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e3f3ec] font-bold text-[#116b52] dark:bg-[#1e3a2f] dark:text-[#3fbf95]">
                    2
                  </div>
                  <div>
                    Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e3f3ec] font-bold text-[#116b52] dark:bg-[#1e3a2f] dark:text-[#3fbf95]">
                    3
                  </div>
                  <div>
                    Launch RollCall directly from your home screen for easy attendance taking!
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="mt-5 w-full rounded-xl bg-[#116b52] py-2 text-xs font-semibold text-white shadow-xs dark:bg-[#3fbf95] dark:text-[#0b1410]"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
