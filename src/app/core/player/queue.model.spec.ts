import {
    adjacentEntryIndex,
    createQueue,
    moveEntry,
    selectEntry,
    toggleShuffle,
} from './queue.model';

describe('createQueue', () => {
    it('creates an empty queue', () => {
        expect(createQueue([], -1)).toEqual({
            entries: [],
            currentIndex: -1,
            shuffle: false,
            originalOrder: null,
        });
    });

    it('allows the same track twice as separate entries', () => {
        const entries = [
            { entryId: 'first', trackId: 'song-a' },
            { entryId: 'second', trackId: 'song-a' },
        ];

        const queue = createQueue(entries, 1);

        expect(queue.entries).toEqual(entries);
        expect(queue.entries).not.toBe(entries);
        expect(queue.currentIndex).toBe(1);
    });

    it('rejects invalid indices and duplicate entry IDs', () => {
        const entry = { entryId: 'first', trackId: 'song-a' };

        expect(() => createQueue([], 0)).toThrow();
        expect(() => createQueue([entry], 1)).toThrow();
        expect(() => createQueue([entry, entry], 0)).toThrow();
    });
});

describe('selectEntry', () => {
    it('selects the requested occurrence without changing the original state', () => {
        const queue = createQueue(
            [
                { entryId: 'first', trackId: 'song-a' },
                { entryId: 'second', trackId: 'song-a' },
            ],
            0,
        );

        const selected = selectEntry(queue, 'second');

        expect(selected.currentIndex).toBe(1);
        expect(queue.currentIndex).toBe(0);
        expect(selected.entries).toEqual(queue.entries);
    });

    it('rejects an entry that is not in the queue', () => {
        const queue = createQueue([], -1);

        expect(() => selectEntry(queue, 'missing')).toThrow('Queue entry not found.');
    });
});

describe('moveEntry', () => {
    it('keeps the current occurrence when another entry crosses it', () => {
        const queue = createQueue(
            [
                { entryId: 'first', trackId: 'song-a' },
                { entryId: 'second', trackId: 'song-a' },
                { entryId: 'third', trackId: 'song-b' },
            ],
            1,
        );

        const moved = moveEntry(queue, 0, 2);

        expect(moved.entries.map((entry) => entry.entryId)).toEqual(['second', 'third', 'first']);
        expect(moved.currentIndex).toBe(0);
        expect(queue.entries.map((entry) => entry.entryId)).toEqual(['first', 'second', 'third']);
        expect(queue.currentIndex).toBe(1);
    });

    it('keeps the current entry selected when it is moved', () => {
        const queue = createQueue(
            [
                { entryId: 'a', trackId: 'song-a' },
                { entryId: 'b', trackId: 'song-b' },
            ],
            0,
        );

        const moved = moveEntry(queue, 0, 1);

        expect(moved.entries[moved.currentIndex].entryId).toBe('a');
        expect(moved.currentIndex).toBe(1);
    });

    it('rejects invalid indices', () => {
        const queue = createQueue([{ entryId: 'a', trackId: 'song-a' }], 0);

        expect(() => moveEntry(queue, -1, 0)).toThrow();
        expect(() => moveEntry(queue, 0, 1)).toThrow();
    });
});

describe('adjacentEntryIndex', () => {
    const queue = createQueue(
        [
            { entryId: 'a', trackId: 'song-a' },
            { entryId: 'b', trackId: 'song-b' },
            { entryId: 'c', trackId: 'song-c' },
        ],
        1,
    );

    it('finds the next and previous entries', () => {
        expect(adjacentEntryIndex(queue, 'next', false)).toBe(2);
        expect(adjacentEntryIndex(queue, 'previous', false)).toBe(0);
    });

    it('stops at the boundaries unless wrapping is enabled', () => {
        const first = selectEntry(queue, 'a');
        const last = selectEntry(queue, 'c');

        expect(adjacentEntryIndex(first, 'previous', false)).toBeNull();
        expect(adjacentEntryIndex(last, 'next', false)).toBeNull();
        expect(adjacentEntryIndex(first, 'previous', true)).toBe(2);
        expect(adjacentEntryIndex(last, 'next', true)).toBe(0);
    });

    it('has no adjacent entry in an empty queue', () => {
        expect(adjacentEntryIndex(createQueue([], -1), 'next', true)).toBeNull();
    });
});

describe('toggleShuffle', () => {
    it('shuffles only upcoming entries and preserves every queue occurrence', () => {
        const queue = createQueue(
            [
                { entryId: 'a', trackId: 'song-a' },
                { entryId: 'b', trackId: 'song-a' },
                { entryId: 'c', trackId: 'song-c' },
                { entryId: 'd', trackId: 'song-d' },
                { entryId: 'e', trackId: 'song-e' },
            ],
            1,
        );
        const originalIds = queue.entries.map((entry) => entry.entryId);

        const shuffled = toggleShuffle(queue, () => 0);
        const shuffledIds = shuffled.entries.map((entry) => entry.entryId);

        expect(shuffled.shuffle).toBe(true);
        expect(shuffled.originalOrder).toEqual(originalIds);
        expect(shuffled.entries[shuffled.currentIndex].entryId).toBe('b');
        expect(shuffledIds.slice(0, 2)).toEqual(originalIds.slice(0, 2));
        expect([...shuffledIds].sort()).toEqual([...originalIds].sort());
        expect(shuffled.entries[0].trackId).toBe(shuffled.entries[1].trackId);
        expect(new Set(shuffledIds).size).toBe(originalIds.length);
    });

    it('restores original order and keeps the selected occurrence current', () => {
        const queue = createQueue(
            [
                { entryId: 'a', trackId: 'song-a' },
                { entryId: 'b', trackId: 'song-b' },
                { entryId: 'c', trackId: 'song-c' },
                { entryId: 'd', trackId: 'song-d' },
            ],
            0,
        );
        const originalIds = queue.entries.map((entry) => entry.entryId);
        const shuffled = toggleShuffle(queue, () => 0);
        const selectedId = shuffled.entries[2].entryId;

        const restored = toggleShuffle(selectEntry(shuffled, selectedId));

        expect(restored.shuffle).toBe(false);
        expect(restored.originalOrder).toBeNull();
        expect(restored.entries.map((entry) => entry.entryId)).toEqual(originalIds);
        expect(restored.entries[restored.currentIndex].entryId).toBe(selectedId);
    });

    it('handles empty and one-entry queues', () => {
        const empty = createQueue([], -1);
        expect(toggleShuffle(empty)).toBe(empty);

        const oneEntry = createQueue([{ entryId: 'only', trackId: 'song-a' }], 0);
        const shuffled = toggleShuffle(oneEntry, () => 0);

        expect(shuffled.shuffle).toBe(true);
        expect(shuffled.entries.map((entry) => entry.entryId)).toEqual(['only']);
        expect(toggleShuffle(shuffled).shuffle).toBe(false);
    });

    it('rejects invalid random values', () => {
        const queue = createQueue(
            [
                { entryId: 'a', trackId: 'song-a' },
                { entryId: 'b', trackId: 'song-b' },
                { entryId: 'c', trackId: 'song-c' },
            ],
            0,
        );

        expect(() => toggleShuffle(queue, () => 1)).toThrow(
            'Random value must be between 0 and 1.',
        );
    });
});
