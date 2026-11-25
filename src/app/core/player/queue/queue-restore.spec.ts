import { describe, expect, it } from 'vitest';
import { resolveSnapshot } from './queue-restore';
import { QueueSnapshot } from './queue-snapshot';

const snapshot = (overrides: Partial<QueueSnapshot> = {}): QueueSnapshot => ({
    version: 1,
    revision: 'rev',
    entries: [
        { entryId: 'e1', trackId: 't1' },
        { entryId: 'e2', trackId: 't2' },
        { entryId: 'e3', trackId: 't3' },
        { entryId: 'e4', trackId: 't1' },
    ],
    currentIndex: 1,
    shuffle: false,
    originalOrder: null,
    repeat: 'off',
    ...overrides,
});

const all = () => true;

describe('resolveSnapshot', () => {
    it('keeps everything when every track exists', () => {
        const result = resolveSnapshot(snapshot(), all);

        expect(result.state.entries).toHaveLength(4);
        expect(result.state.currentIndex).toBe(1);
        expect(result.missingCount).toBe(0);
        expect(result.currentChanged).toBe(false);
    });

    it('removes missing tracks, including every duplicate occurrence', () => {
        const result = resolveSnapshot(snapshot(), (id) => id !== 't1');

        expect(result.state.entries.map((e) => e.entryId)).toEqual(['e2', 'e3']);
        expect(result.missingCount).toBe(2);
    });

    it('re-finds the current entry when earlier entries are removed', () => {
        const result = resolveSnapshot(snapshot({ currentIndex: 2 }), (id) => id !== 't2');

        expect(result.state.entries[result.state.currentIndex].entryId).toBe('e3');
        expect(result.currentChanged).toBe(false);
    });

    it('falls back to the next surviving entry when the current one is missing', () => {
        const result = resolveSnapshot(snapshot(), (id) => id !== 't2');

        expect(result.state.entries[result.state.currentIndex].entryId).toBe('e3');
        expect(result.currentChanged).toBe(true);
    });

    it('falls back to the previous entry when none follow', () => {
        const result = resolveSnapshot(snapshot({ currentIndex: 3 }), (id) => id !== 't1' || false);

        expect(result.state.entries.map((e) => e.entryId)).toEqual(['e2', 'e3']);
        expect(result.state.entries[result.state.currentIndex].entryId).toBe('e3');
        expect(result.currentChanged).toBe(true);
    });

    it('returns an empty unshuffled queue when nothing survives', () => {
        const result = resolveSnapshot(
            snapshot({ shuffle: true, originalOrder: ['e1', 'e2', 'e3', 'e4'] }),
            () => false,
        );

        expect(result.state).toEqual({
            entries: [],
            currentIndex: -1,
            shuffle: false,
            originalOrder: null,
        });
        expect(result.currentChanged).toBe(true);
    });

    it('keeps shuffle and trims the original order to the survivors', () => {
        const result = resolveSnapshot(
            snapshot({
                shuffle: true,
                entries: [
                    { entryId: 'e3', trackId: 't3' },
                    { entryId: 'e1', trackId: 't1' },
                    { entryId: 'e2', trackId: 't2' },
                ],
                currentIndex: 0,
                originalOrder: ['e1', 'e2', 'e3'],
            }),
            (id) => id !== 't2',
        );

        expect(result.state.shuffle).toBe(true);
        expect(result.state.originalOrder).toEqual(['e1', 'e3']);
        expect(result.state.entries.map((e) => e.entryId)).toEqual(['e3', 'e1']);
    });
});
