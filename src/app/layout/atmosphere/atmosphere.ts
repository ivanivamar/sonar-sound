import { Component, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AtmosphereService } from './atmosphere.service';
import { RINGS } from './atmosphere.rings';

@Component({
    selector: 'app-atmosphere',
    styleUrl: './atmosphere.scss',
    templateUrl: './atmosphere.html',
    host: {
        'aria-hidden': 'true',
        '[style.--atmosphere-center-x]': 'state().x',
        '[style.--atmosphere-center-y]': 'state().y',
        '[style.--atmosphere-scale]': 'state().scale',
        '[style.--atmosphere-glow-offset-x]': 'state().glowDx',
        '[style.--atmosphere-glow-offset-y]': 'state().glowDy',
        '[style.--atmosphere-accent-hue]': 'state().hue',
        '[style.--atmosphere-accent-chroma]': 'state().chroma',
    },
})
export class Atmosphere {
    protected readonly state = inject(AtmosphereService).state;
    protected readonly rings = RINGS;

    /** SMIL can't be stopped from CSS, so with reduced motion the <animate> isn't rendered */
    protected readonly motion = signal(true);

    constructor() {
        const query = inject(DOCUMENT).defaultView?.matchMedia('(prefers-reduced-motion: reduce)');
        if (query) {
            this.motion.set(!query.matches);
            query.addEventListener('change', (e) => this.motion.set(!e.matches));
        }
    }
}