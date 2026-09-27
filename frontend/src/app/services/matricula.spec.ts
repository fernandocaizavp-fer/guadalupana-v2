import { TestBed } from '@angular/core/testing';

import { Matricula } from './matricula';

describe('Matricula', () => {
  let service: Matricula;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Matricula);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
