import { DestroyRef, Directive, TemplateRef, inject } from '@angular/core';
import { TopbarContentService } from './topbar-content.service';

@Directive({
    selector: 'ng-template[appTopbarLeft]',
})
export class TopbarLeft {
    constructor() {
        const unregister = inject(TopbarContentService).registerLeft(inject(TemplateRef));
        inject(DestroyRef).onDestroy(unregister);
    }
}
