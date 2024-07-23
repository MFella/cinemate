import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';

const excludedUrlsFromUserIdInterception = [
  'https://accounts.google.com/.well-known/openid-configuration',
  'https://www.googleapis.com/oauth2/v3/certs'
];

export const userIdInterceptor: HttpInterceptorFn = (req, next) => {
  if (excludedUrlsFromUserIdInterception.includes(req.url)) {
    return next(req);
  }

  const clonedRequest = req.clone({
    setHeaders: {
      userId: inject(OAuthService).getIdentityClaims()?.['sub']
    }
  });
  return next(clonedRequest);
};
