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

  static readonly DEMO_CACHE_KEY = 'demo_available';

  /** `loading`: the answer of the backend is not here yet (its space stays reserved). */
  readonly demoState = signal<'loading' | 'on' | 'off'>('loading');
  readonly #restDataService = inject(RestDataService);

  constructor(private readonly authService: AuthService) {
    // only in the browser: the page is prerendered without a backend
    afterNextRender(() => {
      this.authService.showPendingNotice();
      // the last answer is good enough until the new one arrives: no pop-in on a reload
      const cached = this.#readCachedDemo();
      if (cached !== null) {
        this.demoState.set(cached ? 'on' : 'off');
      }
      this.#restDataService.fetchAuthOptions().subscribe({
        next: options => {
          this.demoState.set(options.demo ? 'on' : 'off');
          this.#cacheDemo(options.demo);
        },
        // no backend options: just no demo button
        error: () => this.demoState.set('off'),
      });
    });
  }

  #readCachedDemo(): boolean | null {
    try {
      const value = localStorage.getItem(AuthComponent.DEMO_CACHE_KEY);
      return value === null ? null : value === 'true';
    } catch {
      return null;
    }
  }

  #cacheDemo(isAvailable: boolean): void {
    try {
      localStorage.setItem(AuthComponent.DEMO_CACHE_KEY, String(isAvailable));
    } catch {
      // storage blocked: the next reload just waits for the answer
    }
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
