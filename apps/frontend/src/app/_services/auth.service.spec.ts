import { TestBed } from '@angular/core/testing';

import { AlertInteractionService } from './alert-interaction.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const success = jest.fn();

  beforeEach(() => {
    sessionStorage.clear();
    success.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: AlertInteractionService, useValue: { success } }],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('message left by a logout that reloaded the page', () => {
    it('is shown once', () => {
      sessionStorage.setItem('logout_notice', 'You have been logged out');

      service.showPendingNotice();
      service.showPendingNotice();

      expect(success).toHaveBeenCalledTimes(1);
      expect(success).toHaveBeenCalledWith('You have been logged out');
    });

    it('shows nothing when there is none', () => {
      service.showPendingNotice();

      expect(success).not.toHaveBeenCalled();
    });
  });
});
