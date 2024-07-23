import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';

const accessControlHeader = 'Access-Control-Allow-Origin';

export const corsInterceptor: HttpInterceptorFn = (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
  // request = request.clone({
  //   setHeaders: {
  //     [accessControlHeader]: '*',
  //   }
  // });

  return next(request);
};
