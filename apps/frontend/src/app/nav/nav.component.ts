import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
  NgZone,
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
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  EventType,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { AuthService } from '../_services/auth.service';
import { filter, Subject } from 'rxjs';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { LocalStorageService } from '../_services/local-storage.service';
import { AppPaths } from '../app.routes';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavComponent implements OnDestroy, OnInit {
  #authService = inject(AuthService);
  #changeDetectorRef = inject(ChangeDetectorRef);
  #lsService = inject(LocalStorageService);
  router = inject(Router);
  ngZone = inject(NgZone);
  #destroyRef = inject(DestroyRef);

  @Input()
  selectedTheme!: AppTheme;

  @Output()
  readonly toggleTheme$: Subject<AppTheme> = new Subject<AppTheme>();

  mobileQuery: MediaQueryList;
  isUserHasValidToken = false;
  userAvatarUrl = '';
  private _mobileQueryListener: () => void;
  currentActivatedUrl = '';

  constructor() {
    const media = inject(MediaMatcher);

    this.mobileQuery = media.matchMedia('(max-width: 700px)');
    this._mobileQueryListener = () => this.#changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);
  }

  async navigate(appPath: AppPaths): Promise<void> {
    await this.ngZone.run(() => {
      this.router.navigate([appPath]);
    });
  }
  ngOnInit(): void {
    this.observeHasUserValidToken();
    this.router.events
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        filter(action => action.type === EventType.NavigationEnd)
      )
      .subscribe((event: any) => {
        this.currentActivatedUrl = event.url;
        this.#changeDetectorRef.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }

  toggleTheme(): void {
    this.toggleTheme$.next(this.selectedTheme === 'dark' ? 'default' : 'dark');
  }

  getUserEmail(): string | undefined {
    const userPayload = this.#authService.getUserInfo();
    return userPayload?.email;
  }

  logoutUser(): void {
    this.#authService.logout();
    this.#changeDetectorRef.detectChanges();
  }

  toggleSidenav(matSidenav: MatSidenav): void {
    matSidenav.toggle();
    this.#changeDetectorRef.detectChanges();
  }

  private observeHasUserValidToken(): void {
    this.#authService
      .observeHasUserValidToken()
      .subscribe((isTokenValid: boolean) => {
        if (!isTokenValid && isTokenValid !== this.isUserHasValidToken) {
          this.#authService.logout();
        }

        this.isUserHasValidToken = isTokenValid;
        this.userAvatarUrl = this.#authService.getUserInfo()?.picture ?? '';
        this.#changeDetectorRef.detectChanges();
      });
  }
}
