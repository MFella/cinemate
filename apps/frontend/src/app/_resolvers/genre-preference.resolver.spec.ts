import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { genrePreferenceResolver } from './genre-preference.resolver';

describe('genrePreferenceResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => genrePreferenceResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
