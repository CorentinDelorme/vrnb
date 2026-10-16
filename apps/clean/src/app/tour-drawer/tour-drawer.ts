import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  CancelIcon,
  MapsLocationIcon,
  Pdf02Icon,
  Route02Icon,
  Tree06Icon,
} from '@hugeicons/core-free-icons';
import { GpxService } from '../shared/gpx/gpx.service';
import { DEFAULT_ZONE_ID } from '../zones';

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [HugeiconsIconComponent],
  templateUrl: './tour-drawer.html',
})
export class TourDrawer {
  title = inject(Title);
  gpxService = inject(GpxService);
  private router = inject(Router);

  pdf02Icon = Pdf02Icon;
  mapsLocationIcon = MapsLocationIcon;
  tree06Icon = Tree06Icon;
  cancelIcon = CancelIcon;
  route02Icon = Route02Icon;

  /** Zone and tour id parsed from the current "/tour/:zoneId/:id" url. */
  private getZoneAndId(): { zoneId: string; id: string | undefined } {
    const match = this.router.url.match(/\/tour\/([^/]+)\/([^/?]+)/);
    return { zoneId: match?.[1] ?? DEFAULT_ZONE_ID, id: match?.[2] };
  }

  /** URL to download the PDF for the current tour (e.g. "/pdf/bruz-sud/V1.pdf"). */
  get pdfUrl(): string | undefined {
    const { zoneId, id } = this.getZoneAndId();
    return id ? `/pdf/${zoneId}/${id}.pdf` : undefined;
  }

  /** URL to download the GPX for the current tour (e.g. "/gpx/bruz-sud/V1/V1.gpx"). */
  getGpxUrl(type?: 'start' | 'end'): string | undefined {
    const { zoneId, id } = this.getZoneAndId();
    return id ? `/gpx/${zoneId}/${id}/${id}${type ? `_${type}` : ''}.gpx` : undefined;
  }
}
