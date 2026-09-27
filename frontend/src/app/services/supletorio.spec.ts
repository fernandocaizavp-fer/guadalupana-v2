import { TestBed } from '@angular/core/testing';

import { Supletorio } from './supletorio';

describe('Supletorio', () => {
  let service: Supletorio;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Supletorio);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
