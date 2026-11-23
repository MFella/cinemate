import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionService } from '../auth/session.service';

/** Lets in requests with a valid session (Cognito ID token or demo token) in the `access_token` cookie. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['access_token'];

    if (!token) {
      throw new UnauthorizedException();
    }

    const identity = await this.sessionService.resolve(token);
    // the shape controllers read (see the UserId decorator)
    request['user'] = {
      sub: identity.id,
      email: identity.email,
      picture: identity.picture,
    };
    return true;
  }
}
