import { VoiceflowChat } from './voiceflow-chat';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-landing',
  imports: [MatIconModule, MatButtonModule, VoiceflowChat],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class Landing implements OnInit, OnDestroy {
  currentSlide = 0;
  private slideInterval: any;

  slides = [
    { img: 'graduados.jpg', title: 'Formando Artesanos de Excelencia', subtitle: 'Desde 2017 transformando vidas en Riobamba' },
    { img: 'graduados2.jpg', title: 'Graduados que Inspiran', subtitle: 'Nuestros estudiantes son nuestro mayor orgullo' },
    { img: 'matriculasgratis.jpg', title: 'Matrículas Abiertas', subtitle: 'Inscríbete y comienza tu formación artesanal' },
  ];

  especialidades = [
    { icon: 'face', nombre: 'Belleza', desc: 'Técnicas profesionales de estética y cuidado personal.' },
    { icon: 'brush', nombre: 'Maquillaje', desc: 'Arte y técnica del maquillaje profesional.' },
    { icon: 'camera_alt', nombre: 'Fotografía', desc: 'Fotografía artística y técnica digital.' },
  ];

  // WhatsApp del presidente del centro (0996883085 → formato internacional 593…)
  whatsappUrl = 'https://wa.me/593996883085?text=' +
    encodeURIComponent('Hola, quisiera información sobre las matrículas del CFA Guadalupana.');

  constructor(private router: Router) {}

  ngOnInit() {
    this.slideInterval = setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    }, 4000);
  }

  ngOnDestroy() {
    clearInterval(this.slideInterval);
  }

  goToSlide(i: number) {
    this.currentSlide = i;
  }

  irALogin() {
    this.router.navigate(['/login']);
  }
}