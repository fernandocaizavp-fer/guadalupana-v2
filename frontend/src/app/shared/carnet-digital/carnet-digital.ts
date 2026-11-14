import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface CarnetDialogData {
  matricula: any;
  fotoUrl?: string;
}

@Component({
  selector: 'app-carnet-digital',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './carnet-digital.html',
  styleUrl: './carnet-digital.scss'
})
export class CarnetDigitalDialog implements OnInit {
  matricula: any;
  fotoEstudiante: string | null = null;
  firmaUrl: string | null = null;
  estaGirado = false;

  constructor(
    public dialogRef: MatDialogRef<CarnetDigitalDialog>,
    @Inject(MAT_DIALOG_DATA) public data: CarnetDialogData
  ) {
    this.matricula = data.matricula || {};
    this.fotoEstudiante = data.fotoUrl || this.matricula?.usuario?.fotoUrl || null;
  }

  ngOnInit(): void {
    // Si la matrícula no tiene la foto directamente, intentar buscarla en el objeto
    if (!this.fotoEstudiante && this.matricula?.fotoUrl) {
      this.fotoEstudiante = this.matricula.fotoUrl;
    }

    // Cargar firma digital personalizada si se configuró previamente en el navegador
    const firmaGuardada = localStorage.getItem('cfg_firma_digital');
    if (firmaGuardada) {
      this.firmaUrl = firmaGuardada;
    }
  }

  onFirmaSeleccionada(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.firmaUrl = e.target.result;
        localStorage.setItem('cfg_firma_digital', this.firmaUrl as string);
      };
      reader.readAsDataURL(file);
    }
  }

  restablecerFirmaDefault(event: Event): void {
    event.stopPropagation();
    this.firmaUrl = null;
    localStorage.removeItem('cfg_firma_digital');
  }

  girar(): void {
    this.estaGirado = !this.estaGirado;
  }
}
