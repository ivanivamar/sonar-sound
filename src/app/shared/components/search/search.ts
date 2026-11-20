import { Component, OnDestroy, output, input } from '@angular/core';

@Component({
    imports: [],
    selector: 'app-search',
    styleUrl: './search.scss',
    templateUrl: './search.html',
})
export class Search implements OnDestroy {
    value = input('');
    isSmall = input(false);
    placeholder = input('Search...');

    returnSearch = output<string>();

    private readonly debounceMs = 150;
    private timeoutId?: ReturnType<typeof setTimeout>;

    onInput(value: string): void {
        clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => this.returnSearch.emit(value), this.debounceMs);
    }

    ngOnDestroy(): void {
        clearTimeout(this.timeoutId);
    }
}
