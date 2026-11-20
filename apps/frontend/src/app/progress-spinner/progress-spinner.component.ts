import { Component, ChangeDetectionStrategy } from '@angular/core';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-progress-spinner',
  imports: [MatProgressSpinnerModule],
  templateUrl: './progress-spinner.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './progress-spinner.component.scss',
})
export class ProgressSpinnerComponent {}
