import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { BicycleIcon, PlayIcon, UserAdd01Icon, WalkingIcon } from '@hugeicons/core-free-icons';
import { Tour } from '../tours-service';

@Component({
  selector: 'app-tour-list-section',
  standalone: true,
  imports: [CommonModule, RouterModule, HugeiconsIconComponent],
  templateUrl: './tour-list-section.html',
})
export class TourListSection {
  readonly title = input('');
  readonly tours = input<readonly Tour[]>([]);
  readonly type = input<'P' | 'V'>('P');
  readonly zoneId = input('');
  /**
   * True once the public registration status is known. Until then neither the
   * badge nor the register button is rendered: occupancy must not be guessed.
   */
  readonly statusLoaded = input(false);
  /** Names of the tours of this zone already covered by a binome. */
  readonly coveredNames = input<readonly string[]>([]);
  /** Emitted when the volunteer wants to register a binome on one tour. */
  readonly registerTour = output<Tour>();

  readonly playIcon = PlayIcon;
  readonly registerIcon = UserAdd01Icon;
  readonly bicycleIcon = BicycleIcon;
  readonly walkingIcon = WalkingIcon;

  isCovered(tourName: string): boolean {
    return this.coveredNames().includes(tourName);
  }
}
