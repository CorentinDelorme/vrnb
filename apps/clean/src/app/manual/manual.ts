import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { FullScreenIcon, PlayIcon } from '@hugeicons/core-free-icons';

@Component({
  selector: 'app-manual',
  standalone: true,
  imports: [RouterModule, HugeiconsIconComponent],
  templateUrl: './manual.html',
})
export class Manual {
  playIcon = PlayIcon;
  fullScreenIcon = FullScreenIcon;
}
