import { Component, inject, input } from '@angular/core';
import { Search } from '../../shared/ui/search/search';
import { Router } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { TopbarContentService } from './topbar-content.service';

@Component({
    imports: [Search, NgTemplateOutlet],
    selector: 'app-topbar',
    styleUrl: './topbar.scss',
    templateUrl: './topbar.html',
})
export class Topbar {
    private readonly router = inject(Router);
    protected readonly content = inject(TopbarContentService);
    readonly q = input('', { transform: (v: string | undefined) => v ?? '' });

    onSearch(value: string) {
        this.router.navigate([], {
            queryParams: { q: value || null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }
}
