import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';

const DRAG_THRESHOLD = 6;
const REST_RATIO = 0.66;
const FLICK_SPEED = 0.5; // px per ms

@Component({
    imports: [],
    selector: 'app-bottom-sheet',
    styleUrl: './bottom-sheet.scss',
    templateUrl: './bottom-sheet.html',
})
export class BottomSheet {
    readonly label = input.required<string>();
    readonly closed = output<void>();

    private readonly sheet = viewChild.required<ElementRef<HTMLDialogElement>>('sheet');
    protected readonly expanded = signal(false);
    protected readonly dragHeight = signal<number | null>(null);
    protected readonly closing = signal(false);

    private pressY = 0;
    private pressHeight = 0;
    private lastY = 0;
    private lastTime = 0;
    private velocity = 0; // positive = moving up
    private pressing = false;

    get isOpen(): boolean {
        return this.sheet().nativeElement.open;
    }

    show(): void {
        this.closing.set(false);
        this.dragHeight.set(null);
        this.expanded.set(false);
        this.sheet().nativeElement.showModal();
    }

    hide(): void {
        if (!this.isOpen || this.closing()) return;
        this.closing.set(true);
    }

    dismiss(): void {
        if (!this.isOpen) return;
        this.sheet().nativeElement.close();
        this.closing.set(false);
        this.dragHeight.set(null);
    }

    protected onAnimationEnd(event: AnimationEvent): void {
        if (!this.closing() || event.target !== event.currentTarget) return;
        this.dismiss();
    }

    protected onPointerDown(event: PointerEvent): void {
        if ((event.target as HTMLElement).closest('button')) return;
        this.pressing = true;
        this.pressY = this.lastY = event.clientY;
        this.lastTime = event.timeStamp;
        this.velocity = 0;
        this.pressHeight = this.sheet().nativeElement.offsetHeight;
    }

    protected onPointerMove(event: PointerEvent): void {
        if (!this.pressing) return;
        const delta = this.pressY - event.clientY;

        if (this.dragHeight() === null) {
            if (Math.abs(delta) < DRAG_THRESHOLD) return;
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        }

        const dt = event.timeStamp - this.lastTime;
        if (dt > 0) this.velocity = (this.lastY - event.clientY) / dt;
        this.lastY = event.clientY;
        this.lastTime = event.timeStamp;

        this.dragHeight.set(Math.min(Math.max(this.pressHeight + delta, 0), window.innerHeight));
    }

    protected onPointerUp(): void {
        const height = this.dragHeight();
        this.pressing = false;
        if (height === null) return;

        const full = window.innerHeight;
        const rest = full * REST_RATIO;

        if (this.velocity > FLICK_SPEED) {
            this.expanded.set(true);
        } else if (this.velocity < -FLICK_SPEED) {
            this.hide();
        } else if (height < rest * 0.6) {
            this.hide();
        } else {
            this.expanded.set(height > (rest + full) / 2);
        }

        if (!this.closing()) this.dragHeight.set(null);
    }
}
