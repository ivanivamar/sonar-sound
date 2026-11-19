import { Injectable, TemplateRef, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TopbarContentService {
    private readonly templates = signal<TemplateRef<unknown>[]>([]);
    readonly left = computed(() => this.templates().at(-1) ?? null);

    registerLeft(template: TemplateRef<unknown>): () => void {
        this.templates.update((templates) => [...templates, template]);

        return () => {
            this.templates.update((templates) => templates.filter((item) => item !== template));
        };
    }
}
