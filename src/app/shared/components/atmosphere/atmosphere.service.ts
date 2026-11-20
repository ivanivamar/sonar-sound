import { computed, DestroyRef, inject, Service, Signal, signal } from '@angular/core';

export interface AtmosphereState {
  x: string;           // the shared centre, e.g. '730px' or '18%'
  y: string;
  scale: number;
  glowDx: string;      // optional glow offset from the rings' centre
  glowDy: string;
  hue: string | null;  // the page's accent; null = the playing cover (--h)
  chroma: string | null; // 0…1; null = the playing cover (--hc)
}

const DEFAULTS: AtmosphereState = {
  x: '730px', y: '130px', scale: 1, glowDx: '0px', glowDy: '0px', hue: null, chroma: null,
};


@Service()
export class AtmosphereService {
  private readonly entries = signal<{ id: symbol; cfg: Signal<Partial<AtmosphereState>> }[]>([]);

  /** defaults, overridden by every registered page in order: the newest wins */
  readonly state = computed(() => this.entries().reduce<AtmosphereState>((acc, e) => ({ ...acc, ...e.cfg() }), DEFAULTS));

  register(cfg: Signal<Partial<AtmosphereState>>): () => void {
    const id = Symbol();
    this.entries.update((list) => [...list, { id, cfg }]);
    return () => this.entries.update((list) => list.filter((e) => e.id !== id));
  }
}

/**
 * Call in a page's constructor or field initializer. Takes a plain object or a function that
 * reads signals (for values that change, like an album's colour). Cleans itself up on destroy.
 */
export function atmosphere(config: Partial<AtmosphereState> | (() => Partial<AtmosphereState>)): void {
  const cfg = typeof config === 'function' ? computed(config) : signal(config).asReadonly();
  const unregister = inject(AtmosphereService).register(cfg);
  inject(DestroyRef).onDestroy(unregister);
}