import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { AppTheme } from '../typings/common';
import {MatToolbarModule} from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { AuthService } from '../_services/auth.service';
import { Subject } from 'rxjs';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, NgIf, MatToolbarModule, RouterModule, MatDividerModule],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
})
export class NavComponent {
  #authService = inject(AuthService);
  isTokenValid: boolean = false;

  @Input()
  selectedTheme!: AppTheme;

  @Output()
  readonly toggleTheme$: Subject<AppTheme> = new Subject<AppTheme>();

  toggleTheme(): void {
    this.toggleTheme$.next(this.selectedTheme === 'dark' ? 'default' : 'dark');
  }

  getUserEmail(): string {
    const identityClaim = this.#authService.getUserIdentityClaim();
    return identityClaim.email;
  }

  getUserAvatarUrl(): string {
    const identityClaim = this.#authService.getUserIdentityClaim();
    return identityClaim.picture;
  }

  isUserHasValidToken(): boolean {
    return this.#authService.hasUserHaveValidToken();
  }
}
