import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { authGuard } from './auth.guard';
import { AuthService } from '../_services/auth.service';
import { RestDataService } from '../_services/rest-data.service';

describe('authGuard', () => {
  const navigate = jest.fn().mockResolvedValue(true);
  let hasValidToken = false;

  const run = (url: string, platform: 'browser' | 'server') => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: Router, useValue: { navigate } },
        {
          provide: AuthService,
          useValue: { hasUserValidToken: () => hasValidToken },
        },
        {
          provide: RestDataService,
          useValue: { isFetchUserInfoPended$: new BehaviorSubject(false) },
        },
      ],
    });
    return TestBed.runInInjectionContext(
      () =>
        authGuard(
          {} as ActivatedRouteSnapshot,
          { url } as RouterStateSnapshot
        ) as Promise<boolean>
    );
  };

  beforeEach(() => {
    navigate.mockClear();
    hasValidToken = false;
  });

  describe('on the server', () => {
    it('does not redirect or activate a protected URL (keeps /find, no resolvers run)', async () => {
      expect(await run('/find', 'server')).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('lets the login page render (its guard negates this result)', async () => {
      expect(await run('/', 'server')).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('in the browser', () => {
    it('lets a logged-in user open a protected URL', async () => {
      hasValidToken = true;
      expect(await run('/find', 'browser')).toBe(true);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('sends a logged-out user from a protected URL to login', async () => {
      expect(await run('/find', 'browser')).toBe(false);
      expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('sends a logged-in user from login to /match', async () => {
      hasValidToken = true;
      expect(await run('/', 'browser')).toBe(false);
      expect(navigate).toHaveBeenCalledWith(['/match']);
    });
  });
});
