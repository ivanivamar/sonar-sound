import { Component, input, output, inject, computed, effect, linkedSignal } from '@angular/core';
import { CoverService } from '../../../core/cover/cover.service';
import { CoverColorService } from '../../../core/cover/cover-color.service';
import { CoverColor } from '../../../core/cover/cover-color';
import { rxResource } from '@angular/core/rxjs-interop';
import { CoverPlaceholder } from './cover-placeholder';

@Component({
    imports: [CoverPlaceholder],
    selector: 'app-cover',
    styleUrl: './cover.scss',
    templateUrl: './cover.html',
})
export class Cover {
    private readonly coverService = inject(CoverService);
    private readonly coverColorService = inject(CoverColorService);

    cover = input<string | null>();
    name = input<string | null>();
    /** Also resolves the cover's dominant colour and emits it through `colorResolved`. */
    extractColor = input(false);
    colorResolved = output<CoverColor>();

    protected readonly coverResource = rxResource({
        params: () => this.cover() ?? undefined,
        stream: ({ params }) => this.coverService.getUrl(params),
    });
    private readonly colorResource = rxResource({
        params: () => (this.extractColor() ? this.cover() ?? undefined : undefined),
        stream: ({ params }) => this.coverColorService.getColor(params),
    });
    protected readonly imageUrl = computed(() =>
        this.coverResource.hasValue() ? this.coverResource.value() : null,
    );
    protected readonly initials = computed(() => {
        const name = this.name();
        if (!name) return '';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase();
    });

    // A failed image must not stick when the same instance is later given another cover.
    protected readonly failed = linkedSignal({
        source: this.imageUrl,
        computation: () => false,
    });

    constructor() {
        effect(() => {
            if (this.colorResource.hasValue()) {
                this.colorResolved.emit(this.colorResource.value());
            }
        });
    }
}
