import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NotificacionService } from '../services/notificacion';
import { formularioValido } from './validacion';

describe('formularioValido', () => {
  const notificacion = { info: vi.fn() } as unknown as NotificacionService;
  const crearForm = () =>
    new FormGroup({
      nombres: new FormControl('', Validators.required),
      correo: new FormControl('no-es-correo', Validators.email)
    });

  beforeEach(() => vi.mocked(notificacion.info).mockReset());

  it('formulario inválido: marca los campos, avisa y devuelve false', () => {
    const form = crearForm();
    expect(formularioValido(form, notificacion)).toBe(false);
    expect(form.controls.nombres.touched).toBe(true);
    expect(form.controls.correo.touched).toBe(true);
    expect(notificacion.info).toHaveBeenCalledWith('Revisa los campos marcados en rojo');
  });

  it('formulario válido: no avisa y devuelve true', () => {
    const form = crearForm();
    form.setValue({ nombres: 'Ana', correo: 'ana@correo.com' });
    expect(formularioValido(form, notificacion)).toBe(true);
    expect(notificacion.info).not.toHaveBeenCalled();
  });

  it('sin formulario (vista aún no creada) no bloquea', () => {
    expect(formularioValido(undefined, notificacion)).toBe(true);
  });
});
