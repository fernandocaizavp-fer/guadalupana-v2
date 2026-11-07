import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { DialogService } from '../services/dialog';
import { ConCambiosSinGuardar, Instantanea, avisarAlCerrar, cambiosSinGuardarGuard } from './cambios-sin-guardar';

describe('Instantanea', () => {
  it('antes de la primera foto nunca hay cambios (datos aún cargando)', () => {
    expect(new Instantanea().cambio({ 1: '8' })).toBe(false);
  });

  it('detecta un cambio respecto a la foto y deja de verlo al volver a fijar', () => {
    const inst = new Instantanea();
    const notas: Record<number, string> = { 1: '8', 2: '' };
    inst.fijar(notas);
    expect(inst.cambio(notas)).toBe(false);

    notas[2] = '9';
    expect(inst.cambio(notas)).toBe(true);

    inst.fijar(notas); // tras guardar
    expect(inst.cambio(notas)).toBe(false);
  });

  it('la foto es una copia: modificar el objeto original no la altera', () => {
    const inst = new Instantanea();
    const presentes: Record<number, boolean> = { 1: true };
    inst.fijar(presentes);
    presentes[1] = false;
    expect(inst.cambio(presentes)).toBe(true);
  });
});

describe('cambiosSinGuardarGuard', () => {
  const confirm = vi.fn();
  const ejecutar = (componente: ConCambiosSinGuardar) =>
    TestBed.runInInjectionContext(() =>
      cambiosSinGuardarGuard(componente, {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, {} as RouterStateSnapshot)
    );

  beforeEach(() => {
    confirm.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: DialogService, useValue: { confirm } }] });
  });

  it('sin cambios deja salir sin preguntar', () => {
    expect(ejecutar({ hayCambiosSinGuardar: () => false })).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('con cambios pregunta y respeta la respuesta del usuario', async () => {
    confirm.mockResolvedValue(false);
    expect(await ejecutar({ hayCambiosSinGuardar: () => true })).toBe(false);

    confirm.mockResolvedValue(true);
    expect(await ejecutar({ hayCambiosSinGuardar: () => true })).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});

describe('avisarAlCerrar', () => {
  it('solo bloquea el cierre de la pestaña si hay cambios', () => {
    const conCambios = { preventDefault: vi.fn(), returnValue: undefined } as unknown as BeforeUnloadEvent;
    avisarAlCerrar(conCambios, true);
    expect(conCambios.preventDefault).toHaveBeenCalled();

    const sinCambios = { preventDefault: vi.fn() } as unknown as BeforeUnloadEvent;
    avisarAlCerrar(sinCambios, false);
    expect(sinCambios.preventDefault).not.toHaveBeenCalled();
  });
});
