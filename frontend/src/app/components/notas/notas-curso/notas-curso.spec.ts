import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotasCurso } from './notas-curso';

describe('NotasCurso', () => {
  let component: NotasCurso;
  let fixture: ComponentFixture<NotasCurso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotasCurso]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotasCurso);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
