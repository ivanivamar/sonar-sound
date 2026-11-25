import { heardBetween, PlaybackProgress, playThreshold, PlayTracker } from './play-tracker';

describe('playThreshold', () => {
    it('uses 30 seconds for a long track', () => {
        expect(playThreshold(120)).toBe(30);
    });

    it('uses half the duration for a short track', () => {
        expect(playThreshold(40)).toBe(20);
    });

    it('uses 30 seconds when duration is unknown', () => {
        expect(playThreshold(NaN)).toBe(30);
        expect(playThreshold(0)).toBe(30);
        expect(playThreshold(Infinity)).toBe(30);
    });
});

describe('PlayTracker', () => {
    it('counts once after enough time is heard', () => {
        const tracker = new PlayTracker();
        tracker.setDuration(120);

        expect(tracker.addHeard(10)).toBe(false);
        expect(tracker.addHeard(20)).toBe(true);
        expect(tracker.addHeard(30)).toBe(false);
    });

    it('counts when a newly known duration lowers the threshold', () => {
        const tracker = new PlayTracker();

        expect(tracker.addHeard(20)).toBe(false);
        expect(tracker.setDuration(40)).toBe(true);
        expect(tracker.setDuration(40)).toBe(false);
    });
});

describe('heardBetween', () => {
    it('counts normal playback progress', () => {
        expect(heardBetween(10, 11, 1, 1)).toBe(1);
    });

    it('does not count large forward or backward jumps', () => {
        expect(heardBetween(10, 50, 1, 1)).toBe(0);
        expect(heardBetween(50, 10, 1, 1)).toBe(0);
    });

    it('accounts for playback speed and caps timing jitter', () => {
        expect(heardBetween(0, 2, 1, 2)).toBe(2);
        expect(heardBetween(0, 1.1, 1, 1)).toBe(1);
    });
});

describe('PlaybackProgress', () => {
    it('does not count time while stopped', () => {
        const progress = new PlaybackProgress();

        progress.start(0, 1000, 1);
        expect(progress.sample(5, 6000, 1)).toBe(5);

        progress.stop();
        expect(progress.sample(5, 66000, 1)).toBe(0);

        progress.start(5, 66000, 1);
        expect(progress.sample(10, 71000, 1)).toBe(5);
    });

    it('starts a new baseline after a seek', () => {
        const progress = new PlaybackProgress();

        progress.start(0, 0, 1);
        expect(progress.sample(5, 5000, 1)).toBe(5);

        progress.stop();
        progress.start(100, 6000, 1);
        expect(progress.sample(102, 8000, 1)).toBe(2);
    });
});
