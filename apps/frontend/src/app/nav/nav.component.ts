import {
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  Output,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import {
  CommonModule,
  isPlatformServer,
  NgIf,
  NgOptimizedImage,
} from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { AppTheme } from '../typings/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { AuthService } from '../_services/auth.service';
import { Subject } from 'rxjs';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CustomTooltipDirective } from '../_directives/custom-tooltip.directive';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';

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
    CustomTooltipDirective,
    MatMenuModule,
    MatSidenavModule,
    NgOptimizedImage,
  ],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
})
export class NavComponent implements OnDestroy {
  #authService = inject(AuthService);
  #changeDetectorRef = inject(ChangeDetectorRef);
  #platformId = inject(PLATFORM_ID);

  @Input()
  selectedTheme!: AppTheme;

  @Output()
  readonly toggleTheme$: Subject<AppTheme> = new Subject<AppTheme>();

  mobileQuery: MediaQueryList;

  private _mobileQueryListener: () => void;

  constructor() {
    const media = inject(MediaMatcher);

    this.mobileQuery = media.matchMedia('(max-width: 700px)');
    this._mobileQueryListener = () => this.#changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);
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

  isUserHasValidToken(): boolean {
    if (isPlatformServer(this.#platformId)) {
      return false;
    }

    return this.#authService.hasUserHaveValidToken();
  }

  logoutUser(): void {
    debugger;
    this.#authService.logout();
    this.#changeDetectorRef.detectChanges();
  }

  toggleSidenav(matSidenav: MatSidenav): void {
    matSidenav.toggle();
    this.#changeDetectorRef.detectChanges();
  }
}
