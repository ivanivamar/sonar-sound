import { QueueEntry, QueueState } from './queue.model';

export const SNAPSHOT_VERSION = 1;
export type SnapshotRepeat = 'off' | 'one' | 'all';
const REPEATS: readonly SnapshotRepeat[] = ['off', 'one', 'all'];

export interface QueueSnapshot {
    version: typeof SNAPSHOT_VERSION;
    revision: string; // changes every time the snapshot is written
    entries: readonly QueueEntry[];
    currentIndex: number;
    shuffle: boolean;
    originalOrder: readonly string[] | null;
    repeat: SnapshotRepeat;
}

export function toSnapshot(
    state: QueueState,
    repeat: SnapshotRepeat,
    revision: string,
): QueueSnapshot {
    return {
        version: SNAPSHOT_VERSION,
        revision,
        entries: state.entries.map(({ entryId, trackId }) => ({ entryId, trackId })),
        currentIndex: state.currentIndex,
        shuffle: state.shuffle,
        originalOrder: state.originalOrder ? [...state.originalOrder] : null,
        repeat,
    };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

// Throws a descriptive Error for anything that is not a coherent snapshot.
export function parseSnapshot(raw: unknown): QueueSnapshot {
    if (!isRecord(raw)) throw new Error('Snapshot is not an object.');
    if (raw['version'] !== SNAPSHOT_VERSION) throw new Error('Unsupported snapshot version.');
    if (!isId(raw['revision'])) throw new Error('Snapshot revision is invalid.');

    const rawEntries = raw['entries'];
    if (!Array.isArray(rawEntries)) throw new Error('Snapshot entries are invalid.');

    const entries: QueueEntry[] = rawEntries.map((item: unknown) => {
        if (!isRecord(item) || !isId(item['entryId']) || !isId(item['trackId'])) {
            throw new Error('Snapshot entry is invalid.');
        }
        return { entryId: item['entryId'], trackId: item['trackId'] };
    });

    const ids = new Set(entries.map((entry) => entry.entryId));
    if (ids.size !== entries.length) throw new Error('Snapshot entry IDs are not unique.');

    const currentIndex = raw['currentIndex'];
    const validIndex =
        typeof currentIndex === 'number' &&
        Number.isInteger(currentIndex) &&
        (entries.length === 0
            ? currentIndex === -1
            : currentIndex >= 0 && currentIndex < entries.length);
    if (!validIndex) throw new Error('Snapshot current index is invalid.');

    const shuffle = raw['shuffle'];
    if (typeof shuffle !== 'boolean') throw new Error('Snapshot shuffle is invalid.');

    const rawOrder = raw['originalOrder'];
    let originalOrder: string[] | null = null;
    if (shuffle) {
        if (!Array.isArray(rawOrder) || rawOrder.length !== entries.length) {
            throw new Error('Snapshot original order is invalid.');
        }
        const order = new Set<string>();
        for (const id of rawOrder) {
            if (!isId(id) || !ids.has(id)) throw new Error('Snapshot original order is invalid.');
            order.add(id);
        }
        if (order.size !== entries.length) throw new Error('Snapshot original order is invalid.');
        originalOrder = [...order];
    } else if (rawOrder !== null) {
        throw new Error('Snapshot original order is invalid.');
    }

    const repeat = raw['repeat'];
    if (!REPEATS.includes(repeat as SnapshotRepeat)) {
        throw new Error('Snapshot repeat mode is invalid.');
    }

    return {
        version: SNAPSHOT_VERSION,
        revision: raw['revision'],
        entries,
        currentIndex,
        shuffle,
        originalOrder,
        repeat: repeat as SnapshotRepeat,
    };
}
