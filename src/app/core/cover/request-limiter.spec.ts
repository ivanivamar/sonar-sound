import { RequestLimiter } from './request-limiter';

describe('RequestLimiter', () => {
    it('never runs more than the limit at once and keeps submission order', async () => {
        const limiter = new RequestLimiter(2);
        const started: number[] = [];
        let active = 0;
        let peak = 0;

        const task = (id: number) => limiter.run(async () => {
            started.push(id);
            peak = Math.max(peak, ++active);
            await new Promise(resolve => setTimeout(resolve, 5));
            active--;
            return id;
        });

        const results = await Promise.all([1, 2, 3, 4, 5].map(task));

        expect(results).toEqual([1, 2, 3, 4, 5]);
        expect(started).toEqual([1, 2, 3, 4, 5]);
        expect(peak).toBe(2);
    });

    it('frees the slot when a task fails', async () => {
        const limiter = new RequestLimiter(1);

        await expect(limiter.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
        await expect(limiter.run(async () => 'ok')).resolves.toBe('ok');
    });
});
