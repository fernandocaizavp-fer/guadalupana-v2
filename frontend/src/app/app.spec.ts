import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { LoadingService } from './services/loading';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('muestra el indicador de carga global solo mientras hay operaciones en curso', async () => {
    const fixture = TestBed.createComponent(App);
    const loadingService = TestBed.inject(LoadingService);
    const compiled = fixture.nativeElement as HTMLElement;

    await fixture.whenStable();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    expect(compiled.querySelector('.loading-overlay')).toBeNull();

    loadingService.mostrar();
    await fixture.whenStable();
    expect(compiled.querySelector('.loading-texto')?.textContent).toContain(
      'Cargando, espere por favor...'
    );

    loadingService.ocultar();
    await fixture.whenStable();
    expect(compiled.querySelector('.loading-overlay')).toBeNull();
  });
});
