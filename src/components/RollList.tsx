import React, { useState } from 'react';
import { Plus, Users, Play, Edit3, Trash2, Calendar, CheckSquare } from 'lucide-react';
import { Roll, Session } from '../types';
import { uid } from '../utils/storage';

interface RollListProps {
  rolls: Roll[];
  sessions: Session[];
  onSelectRoll: (roll: Roll) => void;
  onStartSession: (roll: Roll) => void;
  onCreateRoll: (newRoll: Roll) => void;
  onDeleteRoll: (rollId: string) => void;
}

export const RollList: React.FC<RollListProps> = ({
  rolls,
  sessions,
  onSelectRoll,
  onStartSession,
  onCreateRoll,
  onDeleteRoll,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rollName, setRollName] = useState('');
  const [rollDesc, setRollDesc] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollName.trim()) return;

    const newRoll: Roll = {
      id: uid('roll'),
      name: rollName.trim(),
      description: rollDesc.trim(),
      createdAt: new Date().toISOString(),
      fields: [
        { id: 'unit', name: 'Affiliated Group / Unit', type: 'text', required: true },
        { id: 'phone', name: 'Phone', type: 'phone', required: false, isPhoneField: true },
        { id: 'tag', name: 'Pair / Group #', type: 'tag', required: false, isGroupField: true },
      ],
      groupFieldId: 'tag',
      members: [],
    };

    onCreateRoll(newRoll);
    setRollName('');
    setRollDesc('');
    setShowCreateModal(false);
  };

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-xl sm:text-2xl text-[#1d2b25] dark:text-[#e8efe9]">
            Rosters &amp; Rolls
          </h1>
          <p className="mt-0.5 text-xs text-[#6b7770] dark:text-[#92a199]">
            Manage attendee rolls for different teams, classes, wings, or events.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#116b52] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0e5742] active:scale-95 dark:bg-[#3fbf95] dark:text-[#0b1410]"
        >
          <Plus className="h-4 w-4" />
          <span>New Roster</span>
        </button>
      </div>

      {/* Rolls Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rolls.map((roll) => {
          const rollSessions = sessions.filter((s) => s.rollId === roll.id);

          return (
            <div
              key={roll.id}
              className="flex flex-col justify-between rounded-2xl border border-[#e3e1d8] bg-white p-5 shadow-xs transition hover:border-[#116b52]/50 hover:shadow-md dark:border-[#2b3731] dark:bg-[#1b2420]"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3f3ec] text-[#116b52] dark:bg-[#1e3a2f] dark:text-[#3fbf95]">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base text-[#1d2b25] dark:text-[#e8efe9]">
                        {roll.name}
                      </h2>
                      <div className="text-xs font-semibold text-[#116b52] dark:text-[#3fbf95]">
                        {roll.members.length} People Registered
                      </div>
                    </div>
                  </div>

                  {confirmDeleteId === roll.id ? (
                    <button
                      onClick={() => onDeleteRoll(roll.id)}
                      className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs"
                    >
                      Delete?
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(roll.id)}
                      title="Delete roll"
                      className="rounded-lg p-1.5 text-[#6b7770] hover:bg-rose-50 hover:text-rose-600 dark:text-[#92a199]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {roll.description && (
                  <p className="mt-3 text-xs text-[#6b7770] dark:text-[#92a199] line-clamp-2">
                    {roll.description}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-3 text-xs text-[#6b7770] dark:text-[#92a199]">
                  <span className="flex items-center gap-1">
                    <CheckSquare className="h-3.5 w-3.5" />
                    {rollSessions.length} Registers Taken
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center gap-2 border-t border-[#e3e1d8] pt-3 dark:border-[#2b3731]">
                <button
                  onClick={() => onStartSession(roll)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#116b52] py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#0e5742] active:scale-95 dark:bg-[#3fbf95] dark:text-[#0b1410]"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Take Register</span>
                </button>

                <button
                  onClick={() => onSelectRoll(roll)}
                  className="flex items-center gap-1.5 rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3.5 py-2 text-xs font-semibold text-[#1d2b25] hover:bg-[#eae8df] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Roster</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Roll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1b2420]">
            <h3 className="font-bold text-lg text-[#1d2b25] dark:text-[#e8efe9]">
              Create New Roll Roster
            </h3>
            <p className="mt-1 text-xs text-[#6b7770] dark:text-[#92a199]">
              Create a group of attendees (e.g., Youth Class, Sunday Service, Staff Roster).
            </p>

            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1d2b25] dark:text-[#e8efe9] mb-1">
                  Roster Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sunday Service Register"
                  value={rollName}
                  onChange={(e) => setRollName(e.target.value)}
                  className="w-full rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[#116b52] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d2b25] dark:text-[#e8efe9] mb-1">
                  Description / Purpose
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Committee members and department reps"
                  value={rollDesc}
                  onChange={(e) => setRollDesc(e.target.value)}
                  className="w-full rounded-xl border border-[#e3e1d8] bg-[#f6f5f0] px-3 py-2 text-xs text-[#1d2b25] outline-hidden focus:border-[#116b52] dark:border-[#2b3731] dark:bg-[#121816] dark:text-[#e8efe9]"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-[#6b7770]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#116b52] px-4 py-2 text-xs font-semibold text-white shadow-xs dark:bg-[#3fbf95] dark:text-[#0b1410]"
                >
                  Create &amp; Add People
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
