import { DestroyRef, Directive, TemplateRef, inject, input } from '@angular/core';
import { TopbarContentService, TopbarContentWhen } from './topbar-content.service';

@Directive({
    selector: 'ng-template[appTopbarLeft]',
})
export class TopbarLeft {
    readonly topbarWhen = input<TopbarContentWhen>('always');

    constructor() {
        const unregister = inject(TopbarContentService).registerLeft(inject(TemplateRef), this.topbarWhen);
        inject(DestroyRef).onDestroy(unregister);
    }
}
