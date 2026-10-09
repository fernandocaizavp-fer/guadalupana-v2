import { Component } from '@angular/core';
import { LoadingService } from '../../services/loading';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.html',
  styleUrl: './loading.scss'
})
export class LoadingComponent {
  constructor(protected loadingService: LoadingService) {}
}
