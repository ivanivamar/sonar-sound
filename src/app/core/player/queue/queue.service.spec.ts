import { TestBed } from '@angular/core/testing';
import { QueueService } from './queue.service';

describe('QueueService', () => {
    it('updates queue state through its commands', () => {
        const queue = TestBed.inject(QueueService);

        queue.replace(
            [
                { entryId: 'a', trackId: 'song-a' },
                { entryId: 'b', trackId: 'song-b' },
            ],
            0,
        );

        queue.select('b');
        queue.move(1, 0);

        expect(queue.state().entries.map((entry) => entry.entryId)).toEqual(['b', 'a']);
        expect(queue.state().currentIndex).toBe(0);
    });

    it('toggles shuffle while keeping the current occurrence selected', () => {
        const queue = TestBed.inject(QueueService);

        queue.replace(
            [
                { entryId: 'a', trackId: 'song-a' },
                { entryId: 'b', trackId: 'song-b' },
                { entryId: 'c', trackId: 'song-c' },
            ],
            1,
        );

        queue.toggleShuffle();

        expect(queue.state().shuffle).toBe(true);
        expect(queue.state().currentIndex).toBe(0);
        expect(queue.state().entries[queue.state().currentIndex].entryId).toBe('b');

        queue.toggleShuffle();

        expect(queue.state().shuffle).toBe(false);
        expect(queue.state().entries.map((entry) => entry.entryId)).toEqual(['a', 'b', 'c']);
        expect(queue.state().entries[queue.state().currentIndex].entryId).toBe('b');
    });

    it('uses a fresh original order when replacing a shuffled queue', () => {
        const queue = TestBed.inject(QueueService);

        queue.replace(
            [
                { entryId: 'old-a', trackId: 'song-a' },
                { entryId: 'old-b', trackId: 'song-b' },
            ],
            0,
        );
        queue.toggleShuffle();

        const newEntries = [
            { entryId: 'new-a', trackId: 'song-a' },
            { entryId: 'new-b', trackId: 'song-b' },
            { entryId: 'new-c', trackId: 'song-c' },
        ];
        queue.replace(newEntries, 1);

        const state = queue.state();
        const ids = state.entries.map((entry) => entry.entryId);

        expect(state.shuffle).toBe(true);
        expect(state.originalOrder).toEqual(['new-a', 'new-b', 'new-c']);
        expect(state.currentIndex).toBe(0);
        expect(state.entries[state.currentIndex].entryId).toBe('new-b');
        expect(ids).toHaveLength(3);
        expect(new Set(ids)).toEqual(new Set(['new-a', 'new-b', 'new-c']));
        expect(ids).not.toContain('old-a');
        expect(ids).not.toContain('old-b');
    });

    it('clears shuffle when replacing the queue with an empty queue', () => {
        const queue = TestBed.inject(QueueService);

        queue.replace([{ entryId: 'a', trackId: 'song-a' }], 0);
        queue.toggleShuffle();
        queue.replace([], -1);

        expect(queue.state().shuffle).toBe(false);
        expect(queue.state().originalOrder).toBeNull();
    });

    it('restores a prepared state without changing entry IDs or shuffle', () => {
        const state = {
            entries: [
                { entryId: 'e1', trackId: 't1' },
                { entryId: 'e2', trackId: 't2' },
            ],
            currentIndex: 1,
            shuffle: true,
            originalOrder: ['e2', 'e1'],
        };

        const service = TestBed.inject(QueueService);

        service.restore(state);

        expect(service.state()).toEqual(state);
    });
});
