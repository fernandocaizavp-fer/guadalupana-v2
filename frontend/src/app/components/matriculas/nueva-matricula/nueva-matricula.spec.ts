import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevaMatricula } from './nueva-matricula';

describe('NuevaMatricula', () => {
  let component: NuevaMatricula;
  let fixture: ComponentFixture<NuevaMatricula>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevaMatricula]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevaMatricula);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
