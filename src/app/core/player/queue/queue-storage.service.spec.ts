import {
    QUEUE_POSITION_STORAGE_KEY,
    QUEUE_STORAGE_KEY,
    QueueStorage,
} from './queue-storage.service';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueue } from './queue.model';

const state = createQueue(
    [
        { entryId: 'e1', trackId: 't1' },
        { entryId: 'e2', trackId: 't2' },
    ],
    1,
);

describe('QueueStorage', () => {
    let storage: QueueStorage;

    beforeEach(() => {
        localStorage.clear();
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        storage = TestBed.inject(QueueStorage);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it('returns null when nothing is saved', () => {
        expect(storage.load()).toBeNull();
        expect(storage.error()).toBeNull();
    });

    it('saves a snapshot and loads it back with the same revision', () => {
        expect(storage.save(state, 'all')).toBe(true);

        const loaded = storage.load();

        expect(loaded?.currentIndex).toBe(1);
        expect(loaded?.repeat).toBe('all');
        expect(loaded?.revision).toBe(storage.savedRevision());
    });

    it('uses a new revision for each save', () => {
        storage.save(state, 'off');
        const first = storage.savedRevision();
        storage.save(state, 'off');

        expect(storage.savedRevision()).not.toBe(first);
    });

    it('reports damaged data and returns null instead of throwing', () => {
        localStorage.setItem(QUEUE_STORAGE_KEY, '{not json');

        expect(storage.load()).toBeNull();
        expect(storage.error()).toContain('damaged');
    });

    it('reports invalid data that parses as JSON', () => {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({ version: 99 }));

        expect(storage.load()).toBeNull();
        expect(storage.error()).not.toBeNull();
    });

    it('keeps the previous revision when a write fails', () => {
        storage.save(state, 'off');
        const saved = storage.savedRevision();
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('full', 'QuotaExceededError');
        });

        expect(storage.save(state, 'one')).toBe(false);
        expect(storage.error()).toBe('Could not save the queue.');
        expect(storage.savedRevision()).toBe(saved);
    });

    it('clears the saved queue and its revision', () => {
        storage.save(state, 'off');
        storage.clear();

        expect(localStorage.getItem(QUEUE_STORAGE_KEY)).toBeNull();
        expect(storage.savedRevision()).toBeNull();
    });

    it('saves and loads a position for the matching queue occurrence', () => {
        storage.save(state, 'off');
        const revision = storage.savedRevision()!;

        expect(storage.savePosition(revision, 'e2', 42)).toBe(true);
        expect(storage.loadPosition(revision, 'e2')).toBe(42);
    });

    it('ignores a position for a different revision or occurrence', () => {
        storage.save(state, 'off');
        const revision = storage.savedRevision()!;
        storage.savePosition(revision, 'e2', 42);

        expect(storage.loadPosition('different-revision', 'e2')).toBeNull();
        expect(storage.loadPosition(revision, 'e1')).toBeNull();
    });

    it('does not save a position against an unsaved queue revision', () => {
        storage.save(state, 'off');

        expect(storage.savePosition('stale-revision', 'e2', 42)).toBe(false);
    });

    it('clears the position with the queue', () => {
        storage.save(state, 'off');
        const revision = storage.savedRevision()!;
        storage.savePosition(revision, 'e2', 42);

        storage.clear();

        expect(localStorage.getItem(QUEUE_POSITION_STORAGE_KEY)).toBeNull();
    });
});
