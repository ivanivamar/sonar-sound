import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BottomSheet } from './bottom-sheet';

describe('BottomSheet', () => {
    let component: BottomSheet;
    let fixture: ComponentFixture<BottomSheet>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BottomSheet],
        }).compileComponents();

        fixture = TestBed.createComponent(BottomSheet);
        fixture.componentRef.setInput('label', 'Queue');
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
