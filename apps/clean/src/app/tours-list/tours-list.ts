import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { PlayIcon } from '@hugeicons/core-free-icons';
import { TourStorageService } from '../tour-storage.service';
import { ToursService } from '../tours-service';
import { TourListSection } from './tour-list-section';

@Component({
  selector: 'app-tours-list',
  standalone: true,
  imports: [RouterModule, TourListSection, HugeiconsIconComponent],
  templateUrl: './tours-list.html',
})
export class ToursList {
  tourService = inject(ToursService);
  tourStorage = inject(TourStorageService);
  playIcon = PlayIcon;
  readonly currentYear = new Date().getFullYear();

  readonly articles = [
    {
      title: 'Bruz. Ils organisent une sortie pour ramasser les déchets',
      url: 'https://www.ouest-france.fr/bretagne/bruz-35170/ils-organisent-une-sortie-pour-ramasser-les-dechets-44c38453-b187-40f9-abfb-186708158729',
    },
    {
      title: 'Bruz. 201 kg de déchets ramassés dans la nature',
      url: 'https://www.ouest-france.fr/bretagne/bruz-35170/bruz-201-kg-de-dechets-ramasses-dans-la-nature-d7b699b7-1e8a-4dd6-adc6-73e3c14fe959',
    },
  ] as const;
}
