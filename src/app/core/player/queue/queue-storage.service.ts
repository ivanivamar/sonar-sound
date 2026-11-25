import { Service, signal } from '@angular/core';
import { parseSnapshot, QueueSnapshot, SnapshotRepeat, toSnapshot } from './queue-snapshot';
import { QueueState } from './queue.model';

export const QUEUE_STORAGE_KEY = 'queue_snapshot';

export const QUEUE_POSITION_STORAGE_KEY = 'queue_position';

interface QueuePositionRecord {
    version: 1;
    queueRevision: string;
    currentEntryId: string;
    seconds: number;
}

@Service()
export class QueueStorage {
    private readonly _error = signal<string | null>(null);
    readonly error = this._error.asReadonly();

    // Revision of the last snapshot that was really written. A position saved for
    // any other revision must be treated as stale.
    private readonly _savedRevision = signal<string | null>(null);
    readonly savedRevision = this._savedRevision.asReadonly();

    load(): QueueSnapshot | null {
        let text: string | null;
        try {
            text = localStorage.getItem(QUEUE_STORAGE_KEY);
        } catch (error: unknown) {
            this.fail('Could not read the saved queue.', error);
            return null;
        }
        if (text === null) return null;

        try {
            const snapshot = parseSnapshot(JSON.parse(text));
            this._savedRevision.set(snapshot.revision);
            return snapshot;
        } catch (error: unknown) {
            this.fail('The saved queue is damaged and was ignored.', error);
            return null;
        }
    }

    save(state: QueueState, repeat: SnapshotRepeat): boolean {
        const snapshot = toSnapshot(state, repeat, crypto.randomUUID());
        try {
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(snapshot));
        } catch (error: unknown) {
            this.fail('Could not save the queue.', error);
            return false;
        }
        this._savedRevision.set(snapshot.revision);
        this._error.set(null);
        return true;
    }

    savePosition(queueRevision: string, currentEntryId: string, seconds: number): boolean {
        // A changed or unsaved queue must never attach its position to an older snapshot.
        if (!queueRevision || queueRevision !== this._savedRevision() || !currentEntryId) {
            return false;
        }

        if (!Number.isFinite(seconds) || seconds < 0) {
            this.fail('Could not save the playback position.', new Error('Invalid position.'));
            return false;
        }

        const record: QueuePositionRecord = {
            version: 1,
            queueRevision,
            currentEntryId,
            seconds,
        };

        try {
            localStorage.setItem(QUEUE_POSITION_STORAGE_KEY, JSON.stringify(record));
        } catch (error: unknown) {
            this.fail('Could not save the playback position.', error);
            return false;
        }

        this._error.set(null);
        return true;
    }

    loadPosition(queueRevision: string, currentEntryId: string): number | null {
        let text: string | null;
        try {
            text = localStorage.getItem(QUEUE_POSITION_STORAGE_KEY);
        } catch (error: unknown) {
            this.fail('Could not read the saved playback position.', error);
            return null;
        }

        if (text === null) return null;

        try {
            const value: unknown = JSON.parse(text);
            if (
                typeof value !== 'object' ||
                value === null ||
                Array.isArray(value) ||
                !('version' in value) ||
                value.version !== 1 ||
                !('queueRevision' in value) ||
                typeof value.queueRevision !== 'string' ||
                !('currentEntryId' in value) ||
                typeof value.currentEntryId !== 'string' ||
                !('seconds' in value) ||
                typeof value.seconds !== 'number' ||
                !Number.isFinite(value.seconds) ||
                value.seconds < 0
            ) {
                throw new Error('Saved position has an invalid format.');
            }

            if (value.queueRevision !== queueRevision || value.currentEntryId !== currentEntryId) {
                return null;
            }

            return value.seconds;
        } catch (error: unknown) {
            this.fail('The saved playback position is damaged and was ignored.', error);
            return null;
        }
    }

    clear(): void {
        try {
            localStorage.removeItem(QUEUE_STORAGE_KEY);
            localStorage.removeItem(QUEUE_POSITION_STORAGE_KEY);
        } catch (error: unknown) {
            this.fail('Could not clear the saved queue.', error);
            return;
        }
        this._savedRevision.set(null);
    }

    private fail(message: string, cause: unknown): void {
        console.error(message, cause);
        this._error.set(message);
    }
}
