import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleCurso } from './detalle-curso';

describe('DetalleCurso', () => {
  let component: DetalleCurso;
  let fixture: ComponentFixture<DetalleCurso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleCurso]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalleCurso);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
