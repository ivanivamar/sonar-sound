import { Component, input } from '@angular/core';

@Component({
    selector: 'app-cover-placeholder',
    template: `<div class="cover-placeholder"><span class="placeholder-initials">{{ initials() }}</span></div>`,
    styleUrl: './cover-placeholder.scss',
})
export class CoverPlaceholder {
    initials = input<string>('');
}
