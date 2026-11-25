import { describe, expect, it } from 'vitest';
import { parseSnapshot, toSnapshot } from './queue-snapshot';
import { createQueue, toggleShuffle } from './queue.model';

const entries = [
    { entryId: 'e1', trackId: 't1' },
    { entryId: 'e2', trackId: 't2' },
    { entryId: 'e3', trackId: 't1' },
];

const valid = () => toSnapshot(createQueue(entries, 1), 'all', 'rev-1');

describe('queue snapshot', () => {
    it('round-trips through JSON, including duplicate tracks', () => {
        const snapshot = valid();

        expect(parseSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
    });

    it('round-trips a shuffled queue with its original order', () => {
        const shuffled = toggleShuffle(createQueue(entries, 0), () => 0);
        const snapshot = toSnapshot(shuffled, 'off', 'rev-2');

        expect(parseSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
    });

    it('accepts an empty queue', () => {
        const snapshot = toSnapshot(createQueue([], -1), 'off', 'rev-3');

        expect(parseSnapshot(snapshot).currentIndex).toBe(-1);
    });

    it.each([
        ['null', null],
        ['a string', 'oops'],
        ['a wrong version', { ...valid(), version: 2 }],
        ['a missing revision', { ...valid(), revision: '' }],
        ['duplicate entry ids', { ...valid(), entries: [entries[0], entries[0]], currentIndex: 0 }],
        ['an entry without a track id', { ...valid(), entries: [{ entryId: 'e1' }] }],
        ['an out-of-range current index', { ...valid(), currentIndex: 3 }],
        ['a fractional current index', { ...valid(), currentIndex: 0.5 }],
        ['a current index in an empty queue', { ...valid(), entries: [], currentIndex: 0 }],
        ['an unknown repeat mode', { ...valid(), repeat: 'sometimes' }],
        ['original order while not shuffled', { ...valid(), originalOrder: ['e1', 'e2', 'e3'] }],
        ['shuffle without an original order', { ...valid(), shuffle: true }],
        [
            'an original order with an unknown id',
            { ...valid(), shuffle: true, originalOrder: ['e1', 'e2', 'zz'] },
        ],
        [
            'an original order with repeated ids',
            { ...valid(), shuffle: true, originalOrder: ['e1', 'e1', 'e2'] },
        ],
    ])('rejects %s', (_name, raw) => {
        expect(() => parseSnapshot(raw)).toThrow();
    });
});
