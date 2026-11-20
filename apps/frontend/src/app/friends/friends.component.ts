import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Observable, take } from 'rxjs';
import { RestDataService } from '../_services/rest-data.service';
import { AlertInteractionService } from '../_services/alert-interaction.service';
import { FriendsOverview } from '../typings/common';

@Component({
  selector: 'app-friends',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './friends.component.html',
  styleUrl: './friends.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class FriendsComponent implements OnInit {
  readonly #restDataService = inject(RestDataService);
  readonly #alertService = inject(AlertInteractionService);
  readonly #destroyRef = inject(DestroyRef);

  readonly overview = signal<FriendsOverview>({
    friends: [],
    incoming: [],
    outgoing: [],
  });
  readonly isBusy = signal(false);

  readonly addFriendForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  ngOnInit(): void {
    this.reload();
  }

  sendRequest(): void {
    const email = this.addFriendForm.controls.email.value?.trim();
    if (!email || this.addFriendForm.invalid) {
      return;
    }

    this.run(this.#restDataService.sendFriendRequest(email), () => {
      this.addFriendForm.reset({ email: '' });
      // same message whether or not the account exists
      this.#alertService.success(
        'If this account exists, the request has been sent'
      );
    });
  }

  respond(friendshipId: string, accept: boolean): void {
    this.run(
      this.#restDataService.respondToFriendRequest(friendshipId, accept)
    );
  }

  remove(userId: string): void {
    this.run(this.#restDataService.removeFriend(userId));
  }

  private reload(): void {
    this.#restDataService
      .fetchFriends()
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(overview => this.overview.set(overview));
  }

  private run(request: Observable<boolean>, onSuccess?: () => void): void {
    this.isBusy.set(true);
    request.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: () => {
        onSuccess?.();
        this.reload();
      },
      error: () => {
        this.#alertService.error('Something went wrong, try again');
        this.isBusy.set(false);
      },
      complete: () => this.isBusy.set(false),
    });
  }
}
