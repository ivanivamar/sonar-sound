import { adjacentEntryIndex, createQueue, moveEntry, selectEntry } from './queue.model';

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
