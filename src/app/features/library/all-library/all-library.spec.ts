import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllLibrary } from './all-library';

describe('AllLibrary', () => {
    let component: AllLibrary;
    let fixture: ComponentFixture<AllLibrary>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AllLibrary],
        }).compileComponents();

        fixture = TestBed.createComponent(AllLibrary);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
