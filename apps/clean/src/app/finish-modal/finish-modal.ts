import { Component } from '@angular/core';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { CancelIcon } from '@hugeicons/core-free-icons';

@Component({
  selector: 'app-finish-modal',
  standalone: true,
  imports: [HugeiconsIconComponent],
  templateUrl: './finish-modal.html',
})
export class FinishModal {
  cancelIcon = CancelIcon;
}
