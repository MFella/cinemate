import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Catch(Prisma.PrismaClientInitializationError, Prisma.PrismaClientKnownRequestError)
export class PrismaClientErrorFilter implements ExceptionFilter {
    catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse();
        const status = HttpStatus.BAD_REQUEST;
    
        response.status(status).json({
          statusCode: status,
          message: exception.message,
        });
      }
    
}
