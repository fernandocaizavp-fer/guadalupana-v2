import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CentroNotificacionesService } from '../../services/centro-notificaciones';

@Component({
  selector: 'app-campana-notificaciones',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './campana-notificaciones.html',
  styleUrl: './campana-notificaciones.scss'
})
export class CampanaNotificaciones implements OnInit, OnDestroy {
  servicio = inject(CentroNotificacionesService);
  private router = inject(Router);

  ngOnInit(): void {
    this.servicio.iniciarSondeo();
  }

  ngOnDestroy(): void {
    this.servicio.detenerSondeo();
  }

  irAChat(): void {
    this.router.navigate(['/chat']);
  }
}
