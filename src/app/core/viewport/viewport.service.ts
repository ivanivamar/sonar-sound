import { DestroyRef, inject, Service, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/** Keep in sync with the `max-width: 768px` media queries in the stylesheets. */
export const PHONE_MAX_WIDTH = 768;

@Service()
export class ViewportService {
    private readonly query = inject(DOCUMENT).defaultView?.matchMedia?.(`(max-width: ${PHONE_MAX_WIDTH}px)`);
    private readonly _isPhone = signal(this.query?.matches ?? false);

    readonly isPhone = this._isPhone.asReadonly();

    constructor() {
        const onChange = (event: MediaQueryListEvent) => this._isPhone.set(event.matches);
        this.query?.addEventListener('change', onChange);
        inject(DestroyRef).onDestroy(() => this.query?.removeEventListener('change', onChange));
    }
}
