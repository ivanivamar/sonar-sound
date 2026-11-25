import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { Atmosphere } from './atmosphere';

describe('Atmosphere', () => {
    let component: Atmosphere;
    let fixture: ComponentFixture<Atmosphere>;

    afterEach(() => vi.unstubAllGlobals());

    beforeEach(async () => {
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => ({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        );
        await TestBed.configureTestingModule({
            imports: [Atmosphere],
        }).compileComponents();

        fixture = TestBed.createComponent(Atmosphere);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
