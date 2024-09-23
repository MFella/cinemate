import { DOCUMENT } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

const excludedUrlsFromUserIdInterception = [
  'https://accounts.google.com/.well-known/openid-configuration',
  'https://www.googleapis.com/oauth2/v3/certs',
];

export const userIdInterceptor: HttpInterceptorFn = (req, next) => {
  const document = inject(DOCUMENT);
  if (excludedUrlsFromUserIdInterception.includes(req.url)) {
    return next(req);
  }

  debugger;
  const clonedRequest = req.clone({
    setHeaders: {
      ['authorization']: `Bearer ${document.cookie.replace(
        'access_token=',
        ''
      )}`,
    },
  });
  return next(clonedRequest);
};
