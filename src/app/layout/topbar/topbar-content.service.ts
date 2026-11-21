import { Injectable, Signal, TemplateRef, computed, signal } from '@angular/core';

export type TopbarContentWhen = 'always' | 'scrolled';

@Injectable({ providedIn: 'root' })
export class TopbarContentService {
    private readonly templates = signal<
        { template: TemplateRef<unknown>; when: Signal<TopbarContentWhen> }[]
    >([]);
    readonly left = computed(
        () => this.templates().filter(entry => entry.when() === 'always').at(-1)?.template ?? null,
    );
    readonly scrolledLeft = computed(
        () => this.templates().filter(entry => entry.when() === 'scrolled').at(-1)?.template ?? null,
    );

    registerLeft(template: TemplateRef<unknown>, when: Signal<TopbarContentWhen>): () => void {
        const entry = { template, when };
        this.templates.update((templates) => [...templates, entry]);

        return () => {
            this.templates.update((templates) => templates.filter((item) => item !== entry));
        };
    }
}
