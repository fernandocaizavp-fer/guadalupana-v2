import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistrarAsistencia } from './registrar-asistencia';

describe('RegistrarAsistencia', () => {
  let component: RegistrarAsistencia;
  let fixture: ComponentFixture<RegistrarAsistencia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrarAsistencia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistrarAsistencia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
