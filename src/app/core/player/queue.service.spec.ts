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
});
