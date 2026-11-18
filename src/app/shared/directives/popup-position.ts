import { DOCUMENT } from '@angular/common';
import { afterRenderEffect, Directive, ElementRef, inject, input } from '@angular/core';

@Directive({
    selector: '[appPopupPosition]',
})
export class PopupPosition {
    readonly appPopupPosition = input.required<HTMLElement>();
    readonly appPopupPositionOpen = input(false);

    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly document = inject(DOCUMENT);

    constructor() {
        afterRenderEffect((onCleanup) => {
            if (!this.appPopupPositionOpen()) {
                return;
            }

            this.updatePosition();

            const view = this.document.defaultView;
            if (!view) {
                return;
            }

            const updatePosition = () => this.updatePosition();
            view.addEventListener('resize', updatePosition);
            view.addEventListener('scroll', updatePosition, true);
            onCleanup(() => {
                view.removeEventListener('resize', updatePosition);
                view.removeEventListener('scroll', updatePosition, true);
            });
        });
    }

    private updatePosition(): void {
        const view = this.document.defaultView;
        if (!view || !this.appPopupPositionOpen()) {
            return;
        }

        const margin = 8;
        const anchorBounds = this.appPopupPosition().getBoundingClientRect();
        const spaceAbove = Math.max(0, anchorBounds.top - margin);
        const spaceBelow = Math.max(0, view.innerHeight - anchorBounds.bottom - margin);
        const opensAbove = spaceAbove > spaceBelow;
        const availableHeight = opensAbove ? spaceAbove : spaceBelow;

        this.element.style.maxHeight = `${availableHeight}px`;
        const popupHeight = this.element.offsetHeight;
        const popupWidth = this.element.offsetWidth;
        const desiredTop = opensAbove
            ? anchorBounds.top - popupHeight - margin
            : anchorBounds.bottom + margin;
        const maxTop = Math.max(margin, view.innerHeight - popupHeight - margin);
        const top = Math.min(Math.max(margin, desiredTop), maxTop);
        const maxLeft = Math.max(margin, view.innerWidth - popupWidth - margin);
        const left = Math.min(Math.max(anchorBounds.left, margin), maxLeft);

        this.element.style.top = `${top}px`;
        this.element.style.left = `${left}px`;
        this.element.style.setProperty('--mn-origin', opensAbove ? 'bottom left' : 'top left');
    }
}
