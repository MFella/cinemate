import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CognitoService } from '../auth/cognito/cognito.service';

/** Lets in requests with a valid Cognito ID token in the `access_token` cookie. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly cognitoService: CognitoService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['access_token'];

    if (!token) {
      throw new UnauthorizedException();
    }

    const identity = await this.cognitoService.verifyIdToken(token);
    // the shape controllers read (see the UserId decorator)
    request['user'] = {
      sub: identity.id,
      email: identity.email,
      picture: identity.picture,
    };
    return true;
  }
}
