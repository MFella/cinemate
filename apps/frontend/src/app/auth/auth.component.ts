import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RestDataService } from '../_services/rest-data.service';
import { AuthService } from '../_services/auth.service';
import { AuthSource } from '../typings/common';

@Component({
  selector: 'app-auth',
  imports: [
    MatCardModule,
    MatDividerModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [],
})
export class AuthComponent {
  username = '';
  password = '';

  readonly isDemoAvailable = signal(false);
  readonly #restDataService = inject(RestDataService);

  constructor(private readonly authService: AuthService) {
    // only in the browser: the page is prerendered without a backend
    afterNextRender(() => {
      this.#restDataService.fetchAuthOptions().subscribe({
        next: options => this.isDemoAvailable.set(options.demo),
        // no backend options: just no demo button
        error: () => this.isDemoAvailable.set(false),
      });
    });
  }

  startDemo(): void {
    this.#restDataService.startDemo().subscribe(() => this.goToApp());
  }

  /** A full load, like after the Cognito sign-in: the app reads the new session. */
  goToApp(): void {
    window.location.assign('/match');
  }

  emitAuthButtonClicked(authSource: AuthSource): void {
    this.authService.emitAuthButtonClicked(authSource);
  }
}
