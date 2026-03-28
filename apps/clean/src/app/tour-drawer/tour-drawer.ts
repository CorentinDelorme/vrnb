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

  /** Returns the id portion of the current "/tour/:id" url, or undefined. */
  private getCurrentTourId(): string | undefined {
    const match = this.router.url.match(/\/tour\/([^/]+)/);
    return match ? match[1] : undefined;
  }

  /** URL to download the PDF for the current tour (e.g. "/pdf/V1.pdf"). */
  get pdfUrl(): string | undefined {
    const id = this.getCurrentTourId();
    return id ? `/pdf/${id}.pdf` : undefined;
  }

  /** URL to download the GPX for the current tour (e.g. "/gpx/V1.gpx"). */
  getGpxUrl(type?: 'start' | 'end'): string | undefined {
    const id = this.getCurrentTourId();
    return id ? `/gpx/${id}/${id}${type ? `_${type}` : ''}.gpx` : undefined;
  }
}
