import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevoCurso } from './nuevo-curso';

describe('NuevoCurso', () => {
  let component: NuevoCurso;
  let fixture: ComponentFixture<NuevoCurso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevoCurso]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NuevoCurso);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
