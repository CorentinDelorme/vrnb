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

  /** Returns the zone portion of the current "/tour/:zoneId/:id" url, or the default zone. */
  private getCurrentZoneId(): string {
    const match = this.router.url.match(/\/tour\/([^/]+)\/([^/?]+)/);
    return match ? match[1] : DEFAULT_ZONE_ID;
  }

  /** Returns the id portion of the current "/tour/:zoneId/:id" url, or undefined. */
  private getCurrentTourId(): string | undefined {
    const zoned = this.router.url.match(/\/tour\/([^/]+)\/([^/?]+)/);
    if (zoned) return zoned[2];
    const legacy = this.router.url.match(/\/tour\/([^/?]+)/);
    return legacy ? legacy[1] : undefined;
  }

  /** URL to download the PDF for the current tour (e.g. "/pdf/bruz-sud/V1.pdf"). */
  get pdfUrl(): string | undefined {
    const id = this.getCurrentTourId();
    return id ? `/pdf/${this.getCurrentZoneId()}/${id}.pdf` : undefined;
  }

  /** URL to download the GPX for the current tour (e.g. "/gpx/bruz-sud/V1/V1.gpx"). */
  getGpxUrl(type?: 'start' | 'end'): string | undefined {
    const id = this.getCurrentTourId();
    const zoneId = this.getCurrentZoneId();
    return id ? `/gpx/${zoneId}/${id}/${id}${type ? `_${type}` : ''}.gpx` : undefined;
  }
}
