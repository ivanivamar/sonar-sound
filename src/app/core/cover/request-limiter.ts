/** Runs async tasks in submission order with at most `limit` of them in flight. */
export class RequestLimiter {
    private active = 0;
    private readonly queue: (() => void)[] = [];

    constructor(private readonly limit: number) {}

    run<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const start = () => {
                this.active++;
                task()
                    .then(resolve, reject)
                    .finally(() => {
                        this.active--;
                        this.queue.shift()?.();
                    });
            };

            if (this.active < this.limit) {
                start();
            } else {
                this.queue.push(start);
            }
        });
    }
}
