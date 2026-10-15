import { VoiceflowChat } from './voiceflow-chat';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  PortalService, AnuncioPublico, EventoPublico, DatosProspecto, ESPECIALIDADES, FormatoGrid
} from '../../services/portal';

interface FotoLanding {
  titulo: string;
  imagenUrl: string;
  formatoGrid: FormatoGrid;
}

// Fotos visibles antes de pulsar "Ver más imágenes".
const FOTOS_INICIALES = 8;

interface Especialidad {
  nombre: string;
  icono: string;
  imagen: string;
  descripcion: string;
  beneficios: { icono: string; texto: string }[];
  activa: boolean;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Página pública. Las secciones de galería, noticias y calendario leen los
// endpoints sin token de /api/portal; el formulario de pre-inscripción crea un
// prospecto. Nada de aquí toca la gestión académica interna.
@Component({
  selector: 'app-landing',
  imports: [FormsModule, MatIconModule, MatButtonModule, VoiceflowChat],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class Landing implements OnInit, OnDestroy {
  // Catálogo de especialidades. La sección se dibuja recorriendo esta lista, así
  // que apagar una (activa: false) la quita de la página sin tocar la plantilla.
  // El día que el administrador las gestione desde el panel, bastará con llenar
  // esta misma lista desde la API.
  especialidades: Especialidad[] = [
    {
      nombre: 'Belleza', icono: 'content_cut', imagen: 'especialidad-belleza.jpg', activa: true,
      descripcion: 'Aprende corte, color y peinado para atender a tus propios clientes.',
      beneficios: [
        { icono: 'spa', texto: 'Técnicas de estética y estilismo' },
        { icono: 'groups', texto: 'Prácticas reales con clientes' },
        { icono: 'storefront', texto: 'Bases para abrir tu propio salón' },
        { icono: 'workspace_premium', texto: 'Título artesanal avalado' }
      ]
    },
    {
      nombre: 'Maquillaje', icono: 'brush', imagen: 'especialidad-maquillaje.jpg', activa: true,
      descripcion: 'Domina el maquillaje social y profesional para eventos y novias.',
      beneficios: [
        { icono: 'auto_awesome', texto: 'Técnicas profesionales de tendencia' },
        { icono: 'schedule', texto: 'Horarios flexibles' },
        { icono: 'storefront', texto: 'Bases para tu estudio o negocio' },
        { icono: 'workspace_premium', texto: 'Título artesanal avalado' }
      ]
    },
    {
      nombre: 'Fotografía', icono: 'photo_camera', imagen: 'especialidad-fotografia.jpg', activa: true,
      descripcion: 'Captura la luz y cuenta historias con tu cámara, del estudio al evento.',
      beneficios: [
        { icono: 'wb_sunny', texto: 'Iluminación y composición' },
        { icono: 'schedule', texto: 'Prácticas reales y horarios adaptables' },
        { icono: 'storefront', texto: 'Contenido para marcas y eventos' },
        { icono: 'workspace_premium', texto: 'Título artesanal avalado' }
      ]
    }
  ];

  get especialidadesActivas(): Especialidad[] {
    return this.especialidades.filter((e) => e.activa);
  }

  opcionesEspecialidad = ESPECIALIDADES;


  // Fotos fijas de la galería: siempre se muestran. Las que sube el
  // administrador (GaleriaPublica) se agregan a continuación, sin reemplazarlas.
  private readonly fotosFijas: FotoLanding[] = [
    { titulo: 'Graduados del CFA Guadalupana', imagenUrl: 'graduados.jpg', formatoGrid: 'GRANDE' },
    { titulo: 'Ceremonia de graduación', imagenUrl: 'graduados2.jpg', formatoGrid: 'PEQUENA_1' },
    { titulo: 'Nuestros graduados', imagenUrl: 'graduados3.jpg', formatoGrid: 'PEQUENA_2' },
    { titulo: 'Promoción de artesanos titulados', imagenUrl: 'graduados4.jfif', formatoGrid: 'HORIZONTAL' },
    { titulo: 'Entrega de títulos artesanales', imagenUrl: 'graduados5.jpg', formatoGrid: 'HORIZONTAL' }
  ];
  fotos: FotoLanding[] = [...this.fotosFijas];
  galeriaCompleta = false;
  // Índice de la foto abierta en grande (lightbox), o null si está cerrado.
  fotoAbierta: number | null = null;
  @ViewChild('cerrarLightbox') private botonCerrar?: ElementRef<HTMLButtonElement>;

  anuncios: AnuncioPublico[] = [];
  eventos: EventoPublico[] = [];
  novedadesCargadas = false;
  // Noticias cuyo texto completo está desplegado.
  private expandidos = new Set<number>();

  // Formulario de pre-inscripción.
  datos: DatosProspecto = { nombres: '', apellidos: '', telefono: '', especialidadInteres: '' };
  sitioWeb = ''; // campo trampa contra bots: una persona nunca lo llena
  intentoEnvio = false;
  enviando = false;
  enviado = false;
  errorEnvio = '';

  // WhatsApp del centro (0961493337 → formato internacional 593…)
  whatsappUrl = 'https://wa.me/593961493337?text=' +
    encodeURIComponent('Hola, quisiera información sobre las matrículas del CFA Guadalupana.');

  constructor(
    private portalService: PortalService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Si alguna petición falla (o el servidor tarda en despertar), la página
    // sigue mostrando su contenido fijo: aquí los errores son silenciosos.
    this.portalService.galeriaPublicada().subscribe({
      next: (fotos) => {
        if (fotos.length > 0) {
          this.fotos = [...this.fotosFijas, ...fotos];
          this.cdr.detectChanges();
        }
      },
      error: () => { /* se quedan las fotos fijas */ }
    });

    let pendientes = 2;
    const terminar = () => {
      if (--pendientes === 0) this.novedadesCargadas = true;
      this.cdr.detectChanges();
    };
    this.portalService.anunciosPublicados().subscribe({
      next: (anuncios) => { this.anuncios = anuncios; terminar(); },
      error: () => terminar()
    });
    this.portalService.calendarioPublicado().subscribe({
      next: (eventos) => { this.eventos = eventos; terminar(); },
      error: () => terminar()
    });
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  // ── Galería ──

  get fotosVisibles(): FotoLanding[] {
    return this.galeriaCompleta ? this.fotos : this.fotos.slice(0, FOTOS_INICIALES);
  }

  get fotosOcultas(): number {
    return Math.max(0, this.fotos.length - FOTOS_INICIALES);
  }

  alternarGaleria() {
    this.galeriaCompleta = !this.galeriaCompleta;
    if (!this.galeriaCompleta) this.irA('galeria');
  }

  abrirFoto(indice: number) {
    this.fotoAbierta = indice;
    document.body.style.overflow = 'hidden'; // la página no se desplaza detrás
    setTimeout(() => this.botonCerrar?.nativeElement.focus());
  }

  cerrarFoto() {
    this.fotoAbierta = null;
    document.body.style.overflow = '';
  }

  moverFoto(paso: number) {
    if (this.fotoAbierta === null) return;
    this.fotoAbierta = (this.fotoAbierta + paso + this.fotos.length) % this.fotos.length;
  }

  @HostListener('document:keydown', ['$event'])
  teclaLightbox(evento: KeyboardEvent) {
    if (this.fotoAbierta === null) return;
    if (evento.key === 'Escape') this.cerrarFoto();
    else if (evento.key === 'ArrowRight') this.moverFoto(1);
    else if (evento.key === 'ArrowLeft') this.moverFoto(-1);
  }

  // ── Fechas (días completos guardados en UTC; sin depender del idioma del navegador) ──

  dia(fecha: string): string {
    return fecha.slice(8, 10);
  }

  mes(fecha: string): string {
    return MESES[Number(fecha.slice(5, 7)) - 1] ?? '';
  }

  private fechaLarga(fecha: string): string {
    return `${Number(this.dia(fecha))} ${this.mes(fecha)} ${fecha.slice(0, 4)}`;
  }

  rango(evento: EventoPublico): string {
    const inicio = this.fechaLarga(evento.fechaInicio);
    const fin = this.fechaLarga(evento.fechaFin);
    return inicio === fin ? inicio : `Del ${inicio} al ${fin}`;
  }

  fechaNoticia(anuncio: AnuncioPublico): string {
    // La fecha de publicación es un instante: se muestra en la hora local.
    const f = new Date(anuncio.fechaPublicacion);
    return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`;
  }

  // ── Noticias ──

  esLargo(anuncio: AnuncioPublico): boolean {
    return anuncio.contenido.length > 220;
  }

  expandido(anuncio: AnuncioPublico): boolean {
    return this.expandidos.has(anuncio.id);
  }

  alternar(anuncio: AnuncioPublico) {
    if (!this.expandidos.delete(anuncio.id)) this.expandidos.add(anuncio.id);
  }

  // ── Pre-inscripción ──

  get telefonoValido(): boolean {
    return /^\+?\d{7,15}$/.test(this.datos.telefono.replace(/[\s-]/g, ''));
  }

  get nombresValidos(): boolean {
    return this.datos.nombres.trim().length >= 2;
  }

  get apellidosValidos(): boolean {
    return this.datos.apellidos.trim().length >= 2;
  }

  elegirEspecialidad(nombre: string) {
    this.datos.especialidadInteres = nombre;
    this.irA('preinscripcion');
  }

  enviar() {
    this.intentoEnvio = true;
    this.errorEnvio = '';
    if (this.enviando) return;
    if (!this.nombresValidos || !this.apellidosValidos || !this.telefonoValido || !this.datos.especialidadInteres) {
      return;
    }
    this.enviando = true;
    this.portalService.preinscribir({ ...this.datos, sitioWeb: this.sitioWeb }).subscribe({
      next: () => {
        this.enviando = false;
        this.enviado = true;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.enviando = false;
        this.errorEnvio = e?.error?.error || 'No pudimos enviar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.';
        this.cdr.detectChanges();
      }
    });
  }

  otraSolicitud() {
    this.datos = { nombres: '', apellidos: '', telefono: '', especialidadInteres: '' };
    this.intentoEnvio = false;
    this.enviado = false;
  }

  // ── Navegación ──

  irA(seccion: string) {
    document.getElementById(seccion)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  irALogin() {
    this.router.navigate(['/login']);
  }
}
