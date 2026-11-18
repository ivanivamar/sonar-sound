import { AuthService } from './../../../../core/auth/auth.service';
import { Component, inject, input } from '@angular/core';
import { PopupPosition } from '../../../directives/popup-position';
import { UserInfo } from '../../../../core/user/user.model';

@Component({
    imports: [PopupPosition],
    selector: 'app-account-popup',
    styleUrl: './account-popup.scss',
    templateUrl: './account-popup.html',
})
export class AccountPopup {
    private readonly authService = inject(AuthService);
    userInfo = input<UserInfo>();
    isVisible = input(false);
    anchor = input.required<HTMLElement>();

    onLogout() {
        this.authService.signOut();
    }
}
