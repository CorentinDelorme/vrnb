import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { BicycleIcon, PlayIcon, WalkingIcon } from '@hugeicons/core-free-icons';
import { Tour } from '../tours-service';

@Component({
  selector: 'app-tour-list-section',
  standalone: true,
  imports: [CommonModule, RouterModule, HugeiconsIconComponent],
  templateUrl: './tour-list-section.html',
})
export class TourListSection {
  @Input() title = '';
  @Input() tours: Tour[] = [];
  @Input() type: 'P' | 'V' = 'P';

  playIcon = PlayIcon;
  bicycleIcon = BicycleIcon;
  walkingIcon = WalkingIcon;
}
