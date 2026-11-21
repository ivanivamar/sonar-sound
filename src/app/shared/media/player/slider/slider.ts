import { Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';
import { DurationPipe } from '../../../pipes/duration-pipe';

const KEY_STEP = 5;

@Component({
    imports: [DurationPipe],
    selector: 'app-slider',
    styleUrl: './slider.scss',
    templateUrl: './slider.html',
    host: {
        '[class.dragging]': 'dragging()',
    },
})
export class Slider {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    value = input(0);
    max = input(0);
    label = input('Seek');
    valueChange = output<number>();

    protected readonly hovering = signal(false);
    protected readonly hoverRatio = signal(0);
    protected readonly dragging = signal(false);
    protected readonly dragRatio = signal(0);

    protected readonly ratio = computed(() => {
        if (this.dragging()) return this.dragRatio();
        const max = this.max();
        return max > 0 ? Math.min(Math.max(this.value() / max, 0), 1) : 0;
    });
    protected readonly percent = computed(() => this.ratio() * 100);
    protected readonly hoverPercent = computed(() => this.hoverRatio() * 100);
    protected readonly hoverTime = computed(() => this.hoverRatio() * this.max());
    protected readonly disabled = computed(() => this.max() <= 0);
    protected readonly showTooltip = computed(
        () => !this.disabled() && (this.hovering() || this.dragging()),
    );

    protected onPointerEnter(event: PointerEvent) {
        this.hovering.set(true);
        this.updateHover(event);
    }

    protected onPointerLeave() {
        this.hovering.set(false);
    }

    protected onPointerMove(event: PointerEvent) {
        this.updateHover(event);
        if (this.dragging()) this.dragRatio.set(this.hoverRatio());
    }

    protected onPointerDown(event: PointerEvent) {
        if (this.disabled() || event.button !== 0) return;
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        this.updateHover(event);
        this.dragRatio.set(this.hoverRatio());
        this.dragging.set(true);
    }

    protected onPointerUp(event: PointerEvent) {
        if (!this.dragging()) return;
        this.updateHover(event);
        this.dragging.set(false);
        this.valueChange.emit(this.hoverRatio() * this.max());
    }

    protected onPointerCancel() {
        this.dragging.set(false);
    }

    protected onKeydown(event: KeyboardEvent) {
        if (this.disabled()) return;
        const max = this.max();
        const current = this.value();
        let next: number;
        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowUp':
                next = current + KEY_STEP;
                break;
            case 'ArrowLeft':
            case 'ArrowDown':
                next = current - KEY_STEP;
                break;
            case 'PageUp':
                next = current + KEY_STEP * 2;
                break;
            case 'PageDown':
                next = current - KEY_STEP * 2;
                break;
            case 'Home':
                next = 0;
                break;
            case 'End':
                next = max;
                break;
            default:
                return;
        }
        event.preventDefault();
        this.valueChange.emit(Math.min(Math.max(next, 0), max));
    }

    private updateHover(event: PointerEvent) {
        const rect = this.host.nativeElement.getBoundingClientRect();
        if (rect.width <= 0) return;
        const ratio = (event.clientX - rect.left) / rect.width;
        this.hoverRatio.set(Math.min(Math.max(ratio, 0), 1));
    }
}
