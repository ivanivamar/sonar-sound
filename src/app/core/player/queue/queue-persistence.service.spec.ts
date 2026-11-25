import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../auth/auth.service';
import { LibraryService } from '../../library/library.service';
import { PlayerService, RepeatMode } from '../player.service';
import { QueuePersistence } from './queue-persistence.service';
import {
    QUEUE_POSITION_STORAGE_KEY,
    QUEUE_STORAGE_KEY,
    QueueStorage,
} from './queue-storage.service';
import { createQueue } from './queue.model';
import { QueueService } from './queue.service';

describe('QueuePersistence', () => {
    const isSignedIn = signal(true);
    const repeat = signal(RepeatMode.Off);
    const tracks = signal<{ id: string }[]>([]);
    const libraryError = signal<unknown>(undefined);
    const restoreQueue = vi.fn().mockResolvedValue(undefined);
    let queue: QueueService;
    let storage: QueueStorage;
    let persistence: QueuePersistence;
    const isPlaying = signal(false);
    const currentTrack = signal<{ id: string } | null>(null);
    const position = signal(0);
    const seekCompleted = signal(0);

    const saved = () => {
        const text = localStorage.getItem(QUEUE_STORAGE_KEY);
        return text === null ? null : JSON.parse(text);
    };

    const saveSnapshot = () =>
        storage.save(
            createQueue(
                [
                    { entryId: 'e1', trackId: 't1' },
                    { entryId: 'e2', trackId: 't2' },
                    { entryId: 'e3', trackId: 't3' },
                ],
                1,
            ),
            'all',
        );

    beforeEach(() => {
        localStorage.clear();
        isSignedIn.set(true);
        repeat.set(RepeatMode.Off);
        tracks.set([]);
        libraryError.set(undefined);
        isPlaying.set(false);
        currentTrack.set(null);
        position.set(0);
        restoreQueue.mockClear();
        seekCompleted.set(0);

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { isSignedIn } },
                {
                    provide: PlayerService,
                    useValue: {
                        repeat,
                        restoreQueue,
                        isPlaying,
                        currentTrack,
                        position,
                        seekCompleted,
                    },
                },
                {
                    provide: LibraryService,
                    useValue: { isLoading: signal(false), error: libraryError, tracks },
                },
            ],
        });
        queue = TestBed.inject(QueueService);
        storage = TestBed.inject(QueueStorage);
        persistence = TestBed.inject(QueuePersistence);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('saving', () => {
        it('does not write before writes are enabled', () => {
            queue.replace([{ entryId: 'e1', trackId: 't1' }], 0);
            TestBed.tick();

            expect(saved()).toBeNull();
        });

        it('writes the queue and repeat mode once enabled, and on each change', () => {
            persistence.enableWrites();
            queue.replace([{ entryId: 'e1', trackId: 't1' }], 0);
            TestBed.tick();
            expect(saved().entries).toEqual([{ entryId: 'e1', trackId: 't1' }]);
            expect(saved().repeat).toBe('off');

            repeat.set(RepeatMode.All);
            TestBed.tick();
            expect(saved().repeat).toBe('all');
        });

        it('clears the saved queue when the session ends', () => {
            persistence.enableWrites();
            queue.replace([{ entryId: 'e1', trackId: 't1' }], 0);
            TestBed.tick();

            isSignedIn.set(false);
            TestBed.tick();

            expect(saved()).toBeNull();
        });

        it('does not write while signed out', () => {
            persistence.enableWrites();
            isSignedIn.set(false);
            queue.replace([{ entryId: 'e1', trackId: 't1' }], 0);
            TestBed.tick();

            expect(saved()).toBeNull();
        });
    });

    describe('restoring', () => {
        it('waits for the library and keeps the saved queue meanwhile', () => {
            saveSnapshot();
            const before = localStorage.getItem(QUEUE_STORAGE_KEY);

            TestBed.tick();
            queue.replace([{ entryId: 'x', trackId: 't1' }], 0);
            TestBed.tick();

            expect(restoreQueue).not.toHaveBeenCalled();
            expect(localStorage.getItem(QUEUE_STORAGE_KEY)).toBe(before);
        });

        it('restores the saved queue once the library has loaded, then enables writes', () => {
            saveSnapshot();
            tracks.set([{ id: 't1' }, { id: 't2' }, { id: 't3' }]);

            TestBed.tick();

            expect(restoreQueue).toHaveBeenCalledTimes(1);
            const [state, mode] = restoreQueue.mock.calls[0];
            expect(state.currentIndex).toBe(1);
            expect(state.entries).toHaveLength(3);
            expect(mode).toBe(RepeatMode.All);

            queue.replace([{ entryId: 'n1', trackId: 't1' }], 0);
            TestBed.tick();
            expect(saved().entries[0].entryId).toBe('n1');
        });

        it('removes missing tracks and tells the user', () => {
            saveSnapshot();
            tracks.set([{ id: 't1' }, { id: 't3' }]);

            TestBed.tick();

            expect(restoreQueue.mock.calls[0][0].entries).toHaveLength(2);
            expect(persistence.notice()).toContain('1 saved track');
        });

        it('keeps the saved queue and reports a library load failure', () => {
            saveSnapshot();
            const before = localStorage.getItem(QUEUE_STORAGE_KEY);
            libraryError.set(new Error('offline'));

            TestBed.tick();
            queue.replace([{ entryId: 'x', trackId: 't1' }], 0);
            TestBed.tick();

            expect(restoreQueue).not.toHaveBeenCalled();
            expect(persistence.notice()).toContain('library');
            expect(localStorage.getItem(QUEUE_STORAGE_KEY)).toBe(before);
        });

        it('does not replace a queue the user already started', () => {
            saveSnapshot();
            queue.replace([{ entryId: 'x', trackId: 't1' }], 0);
            tracks.set([{ id: 't1' }, { id: 't2' }, { id: 't3' }]);

            TestBed.tick();

            expect(restoreQueue).not.toHaveBeenCalled();
            expect(saved().entries[0].entryId).toBe('x');
        });

        it('reports damaged saved data and carries on', () => {
            localStorage.setItem(QUEUE_STORAGE_KEY, '{nope');
            vi.spyOn(console, 'error').mockImplementation(() => undefined);
            tracks.set([{ id: 't1' }]);

            TestBed.tick();

            expect(restoreQueue).not.toHaveBeenCalled();
            expect(persistence.notice()).toContain('damaged');
        });

        it('reports a failed restore', async () => {
            saveSnapshot();
            restoreQueue.mockRejectedValueOnce(new Error('stream failed'));
            tracks.set([{ id: 't1' }, { id: 't2' }, { id: 't3' }]);

            TestBed.tick();
            await Promise.resolve();
            await Promise.resolve();

            expect(persistence.notice()).toBe('stream failed');
        });

        it('passes the matching saved position to restore', () => {
            saveSnapshot();
            storage.savePosition(storage.savedRevision()!, 'e2', 42);
            tracks.set([{ id: 't1' }, { id: 't2' }, { id: 't3' }]);

            TestBed.tick();

            expect(restoreQueue.mock.calls[0][2]).toBe(42);
        });
    });

    const savedPosition = (): {
        queueRevision: string;
        currentEntryId: string;
        seconds: number;
    } | null => {
        const text = localStorage.getItem(QUEUE_POSITION_STORAGE_KEY);
        return text === null ? null : JSON.parse(text);
    };

    const startSingleTrackPlayback = (): void => {
        persistence.enableWrites();
        queue.replace([{ entryId: 'e1', trackId: 't1' }], 0);
        currentTrack.set({ id: 't1' });
        TestBed.tick();

        isPlaying.set(true);
        TestBed.tick();
    };

    describe('position saving', () => {
        it('saves the latest position on a five-second interval, not on every update', () => {
            vi.useFakeTimers();
            startSingleTrackPlayback();

            position.set(12);
            TestBed.tick();
            position.set(18);
            TestBed.tick();

            expect(savedPosition()).toBeNull();

            vi.advanceTimersByTime(4_999);
            expect(savedPosition()).toBeNull();

            vi.advanceTimersByTime(1);

            expect(savedPosition()?.seconds).toBe(18);
            expect(savedPosition()?.currentEntryId).toBe('e1');
            expect(savedPosition()?.queueRevision).toBe(storage.savedRevision());
        });

        it('saves immediately when playback pauses', () => {
            vi.useFakeTimers();
            startSingleTrackPlayback();

            position.set(37);
            isPlaying.set(false);
            TestBed.tick();

            expect(savedPosition()?.seconds).toBe(37);
            expect(savedPosition()?.currentEntryId).toBe('e1');
        });

        it('cancels the pending save when the current queue occurrence changes', () => {
            vi.useFakeTimers();
            startSingleTrackPlayback();
            vi.advanceTimersByTime(4_999);

            queue.replace([{ entryId: 'e2', trackId: 't2' }], 0);
            currentTrack.set({ id: 't2' });
            position.set(0);
            TestBed.tick();

            vi.advanceTimersByTime(1);

            expect(savedPosition()).toBeNull();
        });

        it('saves the position when a seek completes while paused', () => {
            persistence.enableWrites();
            queue.replace([{ entryId: 'e1', trackId: 't1' }], 0);
            currentTrack.set({ id: 't1' });
            TestBed.tick();

            position.set(41);
            seekCompleted.update((count) => count + 1);
            TestBed.tick();

            expect(savedPosition()?.seconds).toBe(41);
            expect(savedPosition()?.currentEntryId).toBe('e1');
        });
    });
});
