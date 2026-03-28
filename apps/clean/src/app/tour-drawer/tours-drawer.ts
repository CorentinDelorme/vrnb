import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { CancelIcon, Pdf02Icon } from '@hugeicons/core-free-icons';

@Component({
  selector: 'app-tours-drawer',
  standalone: true,
  imports: [HugeiconsIconComponent],
  templateUrl: './tours-drawer.html',
})
export class ToursDrawer {
  title = inject(Title);
  private router = inject(Router);

  cancelIcon = CancelIcon;
  pdf02Icon = Pdf02Icon;

  get pdfUrl(): string | undefined {
    const match = this.router.url.match(/\/tours\/([^/]+)/);
    const type = match ? match[1] : undefined;
    if (!type) return undefined;
    const filename = type === 'V' ? 'Suivi_parcours_a_velo.pdf' : 'Suivi_parcours_a_pied.pdf';
    return `/pdf/${filename}`;
  }
}
