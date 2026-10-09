import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra la selección de perfil con los tres botones al iniciar', () => {
    expect(el.querySelector('.seleccion-card h2')?.textContent).toContain('¡Bienvenido!');
    const botones = Array.from(el.querySelectorAll('.perfil-btn')).map((b) => b.textContent?.trim());
    expect(botones).toHaveLength(3);
    expect(botones.join(' ')).toContain('Estudiante');
    expect(botones.join(' ')).toContain('Docente');
    expect(botones.join(' ')).toContain('Administrativo');
    expect(el.querySelector('form')).toBeNull();
  });

  it('usa pantalla dividida con la imagen para Estudiante y con el logotipo para Docente', async () => {
    component.seleccionarPerfil('ESTUDIANTE');
    await fixture.whenStable();
    expect(el.querySelector('.dividido-imagen img')?.getAttribute('src')).toBe('rolestudiante.jpg');
    expect(el.querySelector('.dividido-marca')).toBeNull();
    expect(el.querySelector('form')).toBeTruthy();

    component.seleccionarPerfil('DOCENTE');
    await fixture.whenStable();
    expect(el.querySelector('.dividido-imagen')).toBeNull();
    expect(el.querySelector('.dividido-marca img')?.getAttribute('src')).toBe('logo.jpg');
    expect(el.querySelector('.dividido-form .login-card form')).toBeTruthy();
  });

  it('"Cambiar perfil" regresa a la selección y limpia el formulario', async () => {
    component.seleccionarPerfil('ADMINISTRATIVO');
    component.correo = 'admin@ejemplo.com';
    component.password = 'secreta';
    component.error.set('Correo o contraseña incorrectos');
    await fixture.whenStable();

    (el.querySelector('.cambiar-btn') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(component.perfil()).toBeNull();
    expect(component.correo).toBe('');
    expect(component.password).toBe('');
    expect(component.error()).toBe('');
    expect(el.querySelector('.seleccion-card')).toBeTruthy();
  });
});
