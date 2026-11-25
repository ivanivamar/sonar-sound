import { effect, inject, Service, signal, untracked } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { LibraryService } from '../../library/library.service';
import { PlayerService, RepeatMode } from '../player.service';
import { resolveSnapshot } from './queue-restore';
import { SnapshotRepeat } from './queue-snapshot';
import { QueueStorage } from './queue-storage.service';
import { QueueService } from './queue.service';

const REPEAT_TO_SNAPSHOT: Record<RepeatMode, SnapshotRepeat> = {
    [RepeatMode.Off]: 'off',
    [RepeatMode.One]: 'one',
    [RepeatMode.All]: 'all',
};

export function repeatFromSnapshot(repeat: SnapshotRepeat): RepeatMode {
    return { off: RepeatMode.Off, one: RepeatMode.One, all: RepeatMode.All }[repeat];
}

@Service()
export class QueuePersistence {
    private readonly auth = inject(AuthService);
    private readonly library = inject(LibraryService);
    private readonly player = inject(PlayerService);
    private readonly queue = inject(QueueService);
    private readonly storage = inject(QueueStorage);

    // Stays false until restore has read the saved queue, so the empty startup
    // queue can never overwrite it.
    private readonly writesEnabled = signal(false);
    private restored = false;

    private readonly _notice = signal<string | null>(null);
    /** Something the user should know about the saved queue, or null. */
    readonly notice = this._notice.asReadonly();

    private positionTimer: ReturnType<typeof setInterval> | null = null;
    private positionEntryId: string | null = null;
    private wasPlaying = false;

    constructor() {
        effect(() => {
            const state = this.queue.state();
            const repeat = this.player.repeat();
            if (!this.writesEnabled() || !this.auth.isSignedIn()) return;

            untracked(() => this.storage.save(state, REPEAT_TO_SNAPSHOT[repeat]));
        });

        effect(() => {
            if (this.auth.isSignedIn()) return;

            untracked(() => {
                this.restored = false;
                this.storage.clear();
            });
        });

        effect(() => {
            if (!this.auth.isSignedIn() || this.restored) return;

            const failed = this.library.error() !== undefined && this.library.error() !== null;
            const ready = !this.library.isLoading() && !failed && this.library.tracks().length > 0;

            untracked(() => {
                if (failed) {
                    this._notice.set(
                        'Could not load the library, so the saved queue was not restored.',
                    );
                } else if (ready) {
                    this.restored = true;
                    this.restore();
                }
            });
        });

        effect(() => {
            const signedIn = this.auth.isSignedIn();
            const enabled = this.writesEnabled();
            const playing = this.player.isPlaying();
            const state = this.queue.state();
            const entry = state.entries[state.currentIndex];
            const track = this.player.currentTrack();
            const entryId = entry && track?.id === entry.trackId ? entry.entryId : null;

            if (!signedIn || !enabled || !entryId) {
                this.stopPositionTimer();
                this.positionEntryId = null;
                this.wasPlaying = playing;
                return;
            }

            if (entryId !== this.positionEntryId) {
                this.stopPositionTimer();
                this.positionEntryId = entryId;
                this.wasPlaying = false;
                return;
            }

            if (playing && this.positionTimer === null) {
                this.positionTimer = setInterval(() => this.savePosition(entryId), 5_000);
            } else if (!playing && this.wasPlaying) {
                this.stopPositionTimer();
                untracked(() => this.savePosition(entryId));
            }

            this.wasPlaying = playing;
        });

        effect(() => {
            if (this.player.seekCompleted() === 0) return;

            untracked(() => {
                if (!this.auth.isSignedIn() || !this.writesEnabled()) return;

                const state = this.queue.state();
                const entry = state.entries[state.currentIndex];
                const track = this.player.currentTrack();

                if (entry && track?.id === entry.trackId) {
                    this.savePosition(entry.entryId);
                }
            });
        });
    }

    enableWrites(): void {
        this.writesEnabled.set(true);
    }

    private restore(): void {
        const snapshot = this.storage.load();

        if (!snapshot) {
            this._notice.set(this.storage.error());
        } else if (this.queue.state().entries.length === 0) {
            const known = new Set(this.library.tracks().map((track) => track.id));
            const result = resolveSnapshot(snapshot, (trackId) => known.has(trackId));

            if (result.missingCount > 0) {
                this._notice.set(
                    `${result.missingCount} saved track(s) are no longer in the library and were removed from the queue.`,
                );
            }

            const currentEntry = result.state.entries[result.state.currentIndex];
            const savedPosition =
                currentEntry && !result.currentChanged
                    ? this.storage.loadPosition(snapshot.revision, currentEntry.entryId)
                    : null;

            this.player
                .restoreQueue(result.state, repeatFromSnapshot(snapshot.repeat), savedPosition ?? 0)
                .catch((error: unknown) => {
                    this._notice.set(
                        error instanceof Error ? error.message : 'Could not restore the queue.',
                    );
                });
        }

        this.enableWrites();
    }

    private savePosition(entryId: string): void {
        if (!this.auth.isSignedIn() || !this.writesEnabled()) return;

        const state = this.queue.state();
        const entry = state.entries[state.currentIndex];
        const track = this.player.currentTrack();
        if (entry?.entryId !== entryId || track?.id !== entry.trackId) return;

        const revision = this.storage.savedRevision();
        if (revision) {
            this.storage.savePosition(revision, entryId, this.player.position());
        }
    }

    private stopPositionTimer(): void {
        if (this.positionTimer !== null) {
            clearInterval(this.positionTimer);
            this.positionTimer = null;
        }
    }
}
