import { Directive, ElementRef, inject, output } from '@angular/core';

@Directive({
    selector: '[appClickOutside]',
    host: {
        '(document:click)': 'onDocumentClick($event)',
    },
})
export class ClickOutside {
    readonly clickOutside = output<void>();

    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    onDocumentClick(event: MouseEvent): void {
        if (!event.composedPath().includes(this.element)) {
            this.clickOutside.emit();
        }
    }
}
