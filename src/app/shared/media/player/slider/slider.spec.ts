import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Slider } from './slider';

describe('Slider', () => {
    let component: Slider;
    let fixture: ComponentFixture<Slider>;
    let emitted: number[];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [Slider],
        }).compileComponents();

        fixture = TestBed.createComponent(Slider);
        component = fixture.componentInstance;
        emitted = [];
        component.valueChange.subscribe((value) => emitted.push(value));
    });

    async function press(key: string) {
        const slider: HTMLElement = fixture.nativeElement.querySelector('.slider');
        const event = new KeyboardEvent('keydown', { key, cancelable: true });
        slider.dispatchEvent(event);
        await fixture.whenStable();
        return event;
    }

    async function setup(value: number, max: number) {
        fixture.componentRef.setInput('value', value);
        fixture.componentRef.setInput('max', max);
        await fixture.whenStable();
    }

    it('should create', async () => {
        await fixture.whenStable();
        expect(component).toBeTruthy();
    });

    it('seeks forwards and backwards in 5 second steps', async () => {
        await setup(20, 100);

        await press('ArrowRight');
        await press('ArrowLeft');
        await press('PageUp');

        expect(emitted).toEqual([25, 15, 30]);
    });

    it('clamps keyboard seeking to the track bounds', async () => {
        await setup(2, 100);

        await press('ArrowLeft');
        await press('End');
        await press('Home');

        expect(emitted).toEqual([0, 100, 0]);
    });

    it('prevents default scrolling for handled keys only', async () => {
        await setup(20, 100);

        expect((await press('ArrowRight')).defaultPrevented).toBe(true);
        expect((await press('a')).defaultPrevented).toBe(false);
        expect(emitted).toEqual([25]);
    });

    it('ignores keys when there is nothing to seek', async () => {
        await setup(0, 0);

        await press('ArrowRight');

        expect(emitted).toEqual([]);
    });
});
