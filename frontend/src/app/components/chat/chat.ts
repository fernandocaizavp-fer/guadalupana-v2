import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBadgeModule } from '@angular/material/badge';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ChatService, ContactoChat, MensajeChat } from '../../services/chat';
import { AuthService } from '../../services/auth';
import { NotificacionService } from '../../services/notificacion';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatBadgeModule,
    MatToolbarModule
  ],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('scrollMensajes') private scrollContainer!: ElementRef;

  contactos: ContactoChat[] = [];
  contactosFiltrados: ContactoChat[] = [];
  contactoActivo: ContactoChat | null = null;
  mensajes: MensajeChat[] = [];

  busqueda = '';
  nuevoMensaje = '';
  cargandoContactos = true;
  cargandoMensajes = false;
  enviando = false;

  filtroRol: string = 'TODOS';
  usuarioActual: any = null;
  private pollingTimer: any = null;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private notificacion: NotificacionService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.usuarioActual = this.authService.getUsuario();
    this.cargarContactos();

    // Polling cada 7 segundos para nuevos mensajes y contactos
    this.pollingTimer = setInterval(() => {
      this.actualizarMensajesSilencioso();
    }, 7000);
  }

  ngOnDestroy() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
  }

  cargarContactos() {
    this.cargandoContactos = true;
    this.chatService.listarContactos().subscribe({
      next: (contactos) => {
        this.contactos = contactos;
        this.filtrarContactos();
        this.cargandoContactos = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargandoContactos = false;
        this.notificacion.error(err.error?.error || 'Error al cargar contactos');
        this.cdr.detectChanges();
      }
    });
  }

  filtrarContactos() {
    const q = this.busqueda.toLowerCase().trim();
    this.contactosFiltrados = this.contactos.filter(c => {
      const nombreCompleto = `${c.nombre} ${c.apellido}`.toLowerCase();
      const coincideTexto = !q || nombreCompleto.includes(q) || (c.detalleMateria && c.detalleMateria.toLowerCase().includes(q));
      const coincideRol = this.filtroRol === 'TODOS' || c.rol === this.filtroRol;
      return coincideTexto && coincideRol;
    });
  }

  cambiarFiltroRol(rol: string) {
    this.filtroRol = rol;
    this.filtrarContactos();
  }

  seleccionarContacto(contacto: ContactoChat) {
    this.contactoActivo = contacto;
    contacto.noLeidos = 0; // Se marcan como leídos
    this.cargandoMensajes = true;
    this.cdr.detectChanges();

    this.chatService.obtenerConversacion(contacto.id).subscribe({
      next: (res) => {
        this.mensajes = res.mensajes;
        this.cargandoMensajes = false;
        this.cdr.detectChanges();
        this.hacerScrollAbajo();
      },
      error: (err) => {
        this.cargandoMensajes = false;
        this.notificacion.error(err.error?.error || 'Error al cargar mensajes');
        this.cdr.detectChanges();
      }
    });
  }

  enviar() {
    const texto = this.nuevoMensaje.trim();
    if (!texto || !this.contactoActivo || this.enviando) return;

    this.enviando = true;
    this.nuevoMensaje = '';

    this.chatService.enviarMensaje(this.contactoActivo.id, texto).subscribe({
      next: (msg) => {
        this.mensajes.push(msg);
        if (this.contactoActivo) {
          this.contactoActivo.ultimoMensaje = {
            contenido: msg.contenido,
            fecha: msg.fecha,
            esMio: true,
            leido: false
          };
        }
        this.enviando = false;
        this.cdr.detectChanges();
        this.hacerScrollAbajo();
      },
      error: (err) => {
        this.enviando = false;
        this.notificacion.error(err.error?.error || 'Error al enviar mensaje');
        this.cdr.detectChanges();
      }
    });
  }

  actualizarMensajesSilencioso() {
    if (!this.contactoActivo) {
      // Si no hay chat abierto, solo refrescar contactos y no leídos
      this.chatService.listarContactos().subscribe({
        next: (contactos) => {
          this.contactos = contactos;
          this.filtrarContactos();
          this.cdr.detectChanges();
        }
      });
      return;
    }

    const contactoId = this.contactoActivo.id;
    this.chatService.obtenerConversacion(contactoId).subscribe({
      next: (res) => {
        if (this.contactoActivo?.id === contactoId) {
          if (res.mensajes.length !== this.mensajes.length) {
            this.mensajes = res.mensajes;
            this.cdr.detectChanges();
            this.hacerScrollAbajo();
          }
        }
      }
    });
  }

  hacerScrollAbajo() {
    setTimeout(() => {
      try {
        if (this.scrollContainer) {
          this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        }
      } catch (err) {}
    }, 50);
  }

  volver() {
    const usuario = this.authService.getUsuario();
    const rol = usuario?.rol;
    if (rol === 'ADMIN') this.router.navigate(['/dashboard']);
    else if (rol === 'PROFESOR') this.router.navigate(['/profesor']);
    else this.router.navigate(['/estudiante']);
  }

  cerrarChatActivo() {
    this.contactoActivo = null;
    this.cdr.detectChanges();
  }

  obtenerIniciales(nombre?: string, apellido?: string): string {
    const n = (nombre || '').trim().charAt(0);
    const a = (apellido || '').trim().charAt(0);
    return (n + a).toUpperCase() || 'CG';
  }

  formatearHora(fechaIso: string): string {
    if (!fechaIso) return '';
    const d = new Date(fechaIso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatearFechaMensaje(fechaIso: string): string {
    if (!fechaIso) return '';
    const d = new Date(fechaIso);
    const hoy = new Date();
    if (d.toDateString() === hoy.toDateString()) {
      return this.formatearHora(fechaIso);
    }
    return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
  }

  obtenerEtiquetaRol(rol: string): string {
    if (rol === 'ADMIN') return 'Dirección';
    if (rol === 'PROFESOR') return 'Docente';
    if (rol === 'ESTUDIANTE') return 'Estudiante';
    return rol;
  }
}
