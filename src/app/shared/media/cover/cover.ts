import { Component, input, signal, inject, computed } from '@angular/core';
import { CoverService } from '../../../core/cover/cover.service';
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
    cover = input<string | null>();
    resolvedUrl = input<string | null>();
    name = input<string | null>();
    protected readonly coverResource = rxResource({
        params: () =>
            this.resolvedUrl() === undefined
                ? this.cover() ?? undefined
                : undefined,
        stream: ({ params }) => this.coverService.getUrl(params),
    });
    protected readonly imageUrl = computed(() => {
        const resolvedUrl = this.resolvedUrl();

        if (resolvedUrl !== undefined) {
            return resolvedUrl;
        }

        return this.coverResource.hasValue() ? this.coverResource.value() : null;
    });
    protected readonly initials = computed(() => {
        const name = this.name();
        if (!name) return '';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase();
    });

    failed = signal(false);
}
