import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { findResolver } from './find.resolver';

describe('findResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => findResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
