import { ExecutionContext, UnauthorizedException, createParamDecorator } from "@nestjs/common";

export const UserId = createParamDecorator((_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    if (!request?.headers?.['userid']) {
        throw new UnauthorizedException('Access cannot be granted - wrong credentials');
    }

    return request?.headers?.['userid'];
});