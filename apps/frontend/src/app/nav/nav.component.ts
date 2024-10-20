import {
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { CommonModule, NgIf, NgOptimizedImage } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { AppTheme } from '../typings/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { AuthService } from '../_services/auth.service';
import { Subject } from 'rxjs';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { LocalStorageService } from '../_services/local-storage.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    NgIf,
    MatToolbarModule,
    RouterModule,
    MatDividerModule,
    MatTooltipModule,
    MatMenuModule,
    MatSidenavModule,
    NgOptimizedImage,
  ],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
})
export class NavComponent implements OnDestroy, OnInit {
  #authService = inject(AuthService);
  #changeDetectorRef = inject(ChangeDetectorRef);
  #lsService = inject(LocalStorageService);

  @Input()
  selectedTheme!: AppTheme;

  @Output()
  readonly toggleTheme$: Subject<AppTheme> = new Subject<AppTheme>();

  mobileQuery: MediaQueryList;
  isUserHasValidToken = false;

  private _mobileQueryListener: () => void;

  constructor() {
    const media = inject(MediaMatcher);

    this.mobileQuery = media.matchMedia('(max-width: 700px)');
    this._mobileQueryListener = () => this.#changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);
  }

  ngOnInit(): void {
    this.observeHasUserValidToken();
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }

  toggleTheme(): void {
    this.toggleTheme$.next(this.selectedTheme === 'dark' ? 'default' : 'dark');
  }

  getUserEmail(): string | undefined {
    const userPayload = this.#authService.getUserPayload();
    return userPayload?.email;
  }

  getUserAvatarUrl(): string | undefined {
    const userPayload = this.#authService.getUserPayload();
    return userPayload?.picture;
  }

  logoutUser(): void {
    this.#lsService.deleteCookie('access_token');
    this.#changeDetectorRef.detectChanges();
  }

  toggleSidenav(matSidenav: MatSidenav): void {
    matSidenav.toggle();
    this.#changeDetectorRef.detectChanges();
  }

  private observeHasUserValidToken(): void {
    this.#authService
      .observeHasUserValidToken()
      // .pipe(debounceTime(200))
      .subscribe((isTokenValid: boolean) => {
        if (!isTokenValid && isTokenValid !== this.isUserHasValidToken) {
          this.#authService.logout();
        }

        this.isUserHasValidToken = isTokenValid;
      });
  }
}
