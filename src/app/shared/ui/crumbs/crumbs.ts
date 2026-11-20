import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';

@Component({
    imports: [RouterLink],
    selector: 'app-crumbs',
    styleUrl: './crumbs.scss',
    templateUrl: './crumbs.html',
})
export class Crumbs {
    private readonly router = inject(Router);
    private readonly location = inject(Location);
    readonly crumbs = input.required<CrumbItem[]>();

    goBack() {
        const state = this.location.getState() as { navigationId?: number } | null;
        if ((state?.navigationId ?? 1) > 1) {
            this.location.back();                       // we came from somewhere in the app
        } else {
            this.router.navigate(['/library']);         // opened directly: go to the library
        }
    }
}

export interface CrumbItem {
    label: string;
    url: string;
}
