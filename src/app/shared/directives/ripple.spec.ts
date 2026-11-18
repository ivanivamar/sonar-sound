import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Ripple } from './ripple';

@Component({
    imports: [Ripple],
    template: '<button appRipple>Press</button><input appRipple />',
})
class TestHost {}

describe('Ripple', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('starts at the press position, including on void elements, and cleans up', () => {
        const fixture = TestBed.createComponent(TestHost);
        fixture.detectChanges();
        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({
            left: 10, top: 20, width: 100, height: 40,
            right: 110, bottom: 60, x: 10, y: 20, toJSON: () => ({}),
        });

        input.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX: 30, clientY: 30 }));
        const layer = document.querySelector('.app-ripple-layer') as HTMLElement;
        const wave = layer.querySelector('.app-ripple-wave') as HTMLElement;
        expect(layer.style.left).toBe('10px');
        expect(layer.style.top).toBe('20px');
        const radius = Math.hypot(80, 30);
        expect(parseFloat(wave.style.left)).toBeCloseTo(20 - radius);
        expect(parseFloat(wave.style.top)).toBeCloseTo(10 - radius);

        wave.dispatchEvent(new Event('animationend'));
        expect(document.querySelector('.app-ripple-layer')).toBeNull();
    });

    it('ignores secondary presses and disabled elements', () => {
        const fixture = TestBed.createComponent(TestHost);
        fixture.detectChanges();
        const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
        vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
            left: 0, top: 0, width: 100, height: 40,
            right: 100, bottom: 40, x: 0, y: 0, toJSON: () => ({}),
        });
        button.dispatchEvent(new MouseEvent('pointerdown', { button: 2 }));
        button.disabled = true;
        button.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
        expect(document.querySelector('.app-ripple-layer')).toBeNull();
    });

    it('removes active ripples when destroyed', () => {
        const fixture = TestBed.createComponent(TestHost);
        fixture.detectChanges();
        const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
        vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
            left: 0, top: 0, width: 100, height: 40,
            right: 100, bottom: 40, x: 0, y: 0, toJSON: () => ({}),
        });
        button.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
        expect(document.querySelector('.app-ripple-layer')).not.toBeNull();
        fixture.destroy();
        expect(document.querySelector('.app-ripple-layer')).toBeNull();
    });

    it('does not animate when reduced motion is requested', () => {
        const fixture = TestBed.createComponent(TestHost);
        fixture.detectChanges();
        vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
        const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
        vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
            left: 0, top: 0, width: 100, height: 40,
            right: 100, bottom: 40, x: 0, y: 0, toJSON: () => ({}),
        });
        button.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
        expect(document.querySelector('.app-ripple-layer')).toBeNull();
    });
});
