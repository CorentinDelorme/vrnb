import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { ArrowLeftIcon } from '@hugeicons/core-free-icons';

import { TourDrawer } from './tour-drawer/tour-drawer';
import { ToursDrawer } from './tour-drawer/tours-drawer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, HugeiconsIconComponent, TourDrawer, ToursDrawer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  router = inject(Router);
  title = inject(Title);

  arrowLeftIcon = ArrowLeftIcon;
}
