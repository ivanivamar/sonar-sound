import { Component, OnDestroy, output } from '@angular/core';

@Component({
    imports: [],
    selector: 'app-search',
    styleUrl: './search.scss',
    templateUrl: './search.html',
})
export class Search implements OnDestroy {
    returnSearch = output<string>();

    private readonly debounceMs = 300;
    private timeoutId?: ReturnType<typeof setTimeout>;

    onInput(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => this.returnSearch.emit(value), this.debounceMs);
    }

    ngOnDestroy(): void {
        clearTimeout(this.timeoutId);
    }
}
