import { TestBed } from '@angular/core/testing';

import { BasicRestDataService } from './basic-rest-data.service';

describe('BasicRestDataService', () => {
  let service: BasicRestDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BasicRestDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
