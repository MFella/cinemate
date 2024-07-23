import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../_services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatProgressBarModule, MatButtonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  providers: []
})
export class HomeComponent {

  username: string = '';
  password: string = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    if (authService.hasUserHaveValidToken()) {
      this.router.navigate(['/match']);
    }
  }

  login(): void {
    this.authService.login();
  }

  logout(): void {
    this.authService.logout(); 
  }

}
