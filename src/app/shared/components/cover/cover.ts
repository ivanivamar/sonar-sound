import { Component, input, signal, inject } from '@angular/core';
import { CoverService } from '../../../core/cover/cover.service';
import { rxResource } from '@angular/core/rxjs-interop';

@Component({
    imports: [],
    selector: 'app-cover',
    styleUrl: './cover.scss',
    templateUrl: './cover.html',
})
export class Cover {
    private readonly coverService = inject(CoverService);
    cover = input<string | null>();
    protected readonly coverResource = rxResource({
        params: () => this.cover() ?? undefined,
        stream: ({ params }) => this.coverService.getUrl(params),
    });

    failed = signal(false);
}
