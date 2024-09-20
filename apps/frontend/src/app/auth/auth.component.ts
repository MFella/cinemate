import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../_services/auth.service';
import { Router } from '@angular/router';
import { AuthSource } from '../typings/common';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatProgressBarModule,
    MatButtonModule,
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
  providers: [],
})
export class AuthComponent {
  username: string = '';
  password: string = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  emitAuthButtonClicked(authSource: AuthSource): void {
    this.authService.emitAuthButtonClicked(authSource);
  }

  logout(): void {
    this.authService.logout();
  }
}
