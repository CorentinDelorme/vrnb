import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { CancelIcon, MapsLocationIcon, Pdf02Icon } from '@hugeicons/core-free-icons';
import { DEFAULT_ZONE_ID } from '../zones';

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
  mapsLocationIcon = MapsLocationIcon;

  /** Matches both "/tours/:type" and "/tours/:zoneId/:type". */
  private getZoneAndType(): { zoneId: string; type: string | undefined } {
    const zoned = this.router.url.match(/\/tours\/([^/]+)\/([^/?]+)/);
    if (zoned) return { zoneId: zoned[1], type: zoned[2] };
    const legacy = this.router.url.match(/\/tours\/([^/?]+)/);
    return { zoneId: DEFAULT_ZONE_ID, type: legacy ? legacy[1] : undefined };
  }

  get pdfUrl(): string | undefined {
    const { zoneId, type } = this.getZoneAndType();
    if (!type) return undefined;
    const filename = type === 'V' ? 'Suivi_parcours_a_velo.pdf' : 'Suivi_parcours_a_pied.pdf';
    return `/pdf/${zoneId}/${filename}`;
  }

  get mapPdfUrl(): string | undefined {
    const { zoneId, type } = this.getZoneAndType();
    if (!type) return undefined;
    const filename = type === 'V' ? 'Carte_parcours_a_velo.pdf' : 'Carte_parcours_a_pied.pdf';
    return `/pdf/${zoneId}/${filename}`;
  }
}
