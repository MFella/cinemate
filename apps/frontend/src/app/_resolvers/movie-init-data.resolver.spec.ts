import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { movieInitDataResolver } from './movie-init-data.resolver';
import { MovieData } from '../typings/common';

describe('movieInitDataResolver', () => {
  const executeResolver: ResolveFn<Array<MovieData>> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => movieInitDataResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
