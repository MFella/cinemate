import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { preferencesResolver } from './preferences.resolver';

describe('preferencesResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => preferencesResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
