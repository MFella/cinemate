import {
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';

export const UserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest();
    if (!request?.['user']) {
      throw new UnauthorizedException(
        'Access cannot be granted - wrong credentials'
      );
    }

    return request?.['user']?.sub;
  }
);
