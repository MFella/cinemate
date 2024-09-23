import {
  Component,
  DestroyRef,
  Inject,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavComponent } from './nav/nav.component';
import { AppLang, AppTheme, AuthSource } from './typings/common';
import { LocalStorageService } from './_services/local-storage.service';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { AuthService } from './_services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertInteractionService } from './_services/alert-interaction.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ProgressSpinnerComponent } from './progress-spinner/progress-spinner.component';
import { RestDataService } from './_services/rest-data.service';
import { NgToastModule } from 'ng-angular-popup';

@Component({
  standalone: true,
  imports: [NavComponent, RouterModule, NgToastModule],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private static readonly DEFAULT_APP_THEME: AppTheme = 'default';
  private static readonly DEFAULT_APP_LANG: AppLang = 'pl-PL';
  private static readonly TOKEN_EXPIRATION_DEBOUNCE_TIME = 150;

  #destroyRef = inject(DestroyRef);
  #authService = inject(AuthService);
  #intercationService = inject(AlertInteractionService);
  #restDataService = inject(RestDataService);
  #matDialog = inject(MatDialog);
  #matDialogRef: MatDialogRef<any> | null = null;

  title = 'frontend';
  selectedTheme: AppTheme = 'default';

  constructor(
    @Inject(PLATFORM_ID) platformId: string,
    readonly localStorageService: LocalStorageService,
    @Inject(DOCUMENT) private readonly document: Document
  ) {
    if (!isPlatformBrowser(platformId)) {
      return;
    }

    this.document.body.classList.remove('dark', 'default');
    const selectedTheme = localStorageService.getItem('theme');
    if (!selectedTheme) {
      localStorageService.setItem<'theme'>(
        'theme',
        AppComponent.DEFAULT_APP_THEME
      );
      this.selectedTheme = AppComponent.DEFAULT_APP_THEME;
      this.document.body.classList.add(AppComponent.DEFAULT_APP_THEME);
    } else {
      this.selectedTheme = selectedTheme;
      this.document.body.classList.add(selectedTheme);
    }

    this.observeUserClickedLoginButton();
    this.observeLoadingSpinnerChanged();
  }

  onToggleTheme(theme: AppTheme): void {
    this.document.body.classList.remove('dark', 'default');
    this.selectedTheme = theme;
    this.localStorageService.setItem('theme', theme);
    this.document.body.classList.add(theme);
  }

  private observeUserClickedLoginButton(): void {
    this.#authService
      .observeAuthButtonClicked()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((authSource: AuthSource) => {
        this.#restDataService.tryAuthenticateUser(authSource);
      });
  }

  private observeLoadingSpinnerChanged(): void {
    this.#intercationService
      .selectLoadingSpinnerChanged()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((isVisible: boolean) => {
        if (isVisible) {
          this.#matDialogRef = this.#matDialog.open(ProgressSpinnerComponent, {
            panelClass: 'transparent-loading-spinner',
            width: '250px',
          });
        } else {
          this.#matDialogRef?.close();
          this.#matDialogRef = null;
        }
      });
  }
}
