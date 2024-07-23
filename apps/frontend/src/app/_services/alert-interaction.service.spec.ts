import { TestBed } from '@angular/core/testing';

import { AlertInteractionService } from './alert-interaction.service';

describe('AlertInteractionService', () => {
  let service: AlertInteractionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlertInteractionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
