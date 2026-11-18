import { Service, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { UserInfo } from './user.model';
import { AuthService } from '../auth/auth.service';

@Service()
export class UserService {
    private readonly authService = inject(AuthService);
    readonly userInfo = httpResource<UserInfo>(() => {
        return this.authService.isSignedIn() ? 'https://www.googleapis.com/oauth2/v3/userinfo' : undefined;
    });

}
