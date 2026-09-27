import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IngresarDisciplina } from './ingresar-disciplina';

describe('IngresarDisciplina', () => {
  let component: IngresarDisciplina;
  let fixture: ComponentFixture<IngresarDisciplina>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngresarDisciplina]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IngresarDisciplina);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
