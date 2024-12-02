import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpStatusCode,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../_services/auth.service';

export const errorHandlerInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((httpErrorResponse: HttpErrorResponse) => {
      if (httpErrorResponse.status === HttpStatusCode.Unauthorized) {
        inject(AuthService).logout();
      }

      return throwError(() => httpErrorResponse);
    })
  );
};
