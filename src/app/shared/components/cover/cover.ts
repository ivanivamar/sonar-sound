import { Component, input, signal } from '@angular/core';

@Component({
    imports: [],
    selector: 'app-cover',
    styleUrl: './cover.scss',
    templateUrl: './cover.html',
})
export class Cover {
    cover = input<string | null>();

    failed = signal(false);
}
