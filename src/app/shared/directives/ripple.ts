import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, OnDestroy, inject } from '@angular/core';

@Directive({
    selector: '[appRipple]',
    host: {
        '(pointerdown)': 'onPointerDown($event)',
    },
})
export class Ripple implements OnDestroy {
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly document = inject(DOCUMENT);
    private readonly cleanups = new Set<() => void>();

    onPointerDown(event: PointerEvent): void {
        const view = this.document.defaultView;
        if (
            !view ||
            event.button !== 0 ||
            this.element.matches(':disabled, [disabled], [aria-disabled="true"]') ||
            view.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        const bounds = this.element.getBoundingClientRect();
        if (!bounds.width || !bounds.height) {
            return;
        }

        const style = view.getComputedStyle(this.element);
        const layer = this.document.createElement('span');
        const ripple = this.document.createElement('span');
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const radius = Math.hypot(Math.max(x, bounds.width - x), Math.max(y, bounds.height - y));

        layer.className = 'app-ripple-layer';
        layer.setAttribute('aria-hidden', 'true');
        layer.style.borderRadius = style.borderRadius;
        layer.style.color = style.color;
        layer.style.setProperty('--app-ripple-color', style.getPropertyValue('--ripple-color').trim() || 'currentColor');
        ripple.className = 'app-ripple-wave';
        ripple.style.width = `${radius * 2}px`;
        ripple.style.height = `${radius * 2}px`;
        ripple.style.left = `${x - radius}px`;
        ripple.style.top = `${y - radius}px`;
        layer.appendChild(ripple);

        const updatePosition = () => {
            const rect = this.element.getBoundingClientRect();
            layer.style.left = `${rect.left}px`;
            layer.style.top = `${rect.top}px`;
            layer.style.width = `${rect.width}px`;
            layer.style.height = `${rect.height}px`;
        };
        const cleanup = () => {
            view.removeEventListener('scroll', updatePosition, true);
            view.removeEventListener('resize', updatePosition);
            layer.remove();
            this.cleanups.delete(cleanup);
        };

        updatePosition();
        this.cleanups.add(cleanup);
        ripple.addEventListener('animationend', cleanup, { once: true });
        ripple.addEventListener('animationcancel', cleanup, { once: true });
        view.addEventListener('scroll', updatePosition, true);
        view.addEventListener('resize', updatePosition);
        (this.element.closest('dialog:modal') ?? this.document.body).appendChild(layer);
    }

    ngOnDestroy(): void {
        for (const cleanup of this.cleanups) {
            cleanup();
        }
    }
}
