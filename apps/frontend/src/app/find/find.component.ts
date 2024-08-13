import { ChangeDetectorRef, Component, computed, DestroyRef, inject, model, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { of, take } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { FindMatchResult, GenEntity, Genres, MovieRate, SelectOption } from '../typings/common';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../_services/auth.service';
import {MatTableModule} from '@angular/material/table';
import { RestDataService } from '../_services/rest-data.service';

@Component({
  selector: 'app-find',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDividerModule, MatSelectModule,
    ReactiveFormsModule, MatChipsModule, MatAutocompleteModule, MatIconModule, MatCardModule, MatTableModule],
  templateUrl: './find.component.html',
  styleUrl: './find.component.scss',
})
export class FindComponent implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);
  readonly #authService = inject(AuthService);
  readonly #restDataService = inject(RestDataService);

  readonly fetchedGenres = signal<Array<GenEntity>>([]);
  readonly selectedEmails = signal<Array<string>>([]);
  readonly currentUser = model('');
  readonly filteredUsers = computed(() => {
    return this.allUsers.filter(user => !this.selectedEmails().includes(user));
  });

  readonly searchUserForm = new FormGroup({
    mailOfUsers: new FormControl(),
    genre: new FormControl()
  });

  findMatchResult!: FindMatchResult;
  isInSearchMode: boolean = true;
  allUsers: Array<string> = [];
  genreOptions: Array<SelectOption<Genres>> = [];

  ngOnInit(): void {
    this.setSearchUserFormValidators();
    this.activatedRoute.data
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((data) => {
          this.genreOptions = data['findData'][1].map((genEntity: GenEntity) => {
            return {
              disabled: false,
              label: genEntity.name,
              value: genEntity.id
            }
          });
          const currentUserEmail = this.#authService.getIdentityClaimValues('email')?.at(0);
          this.allUsers = (data['findData'][2] as Array<string>)
            .filter((email: string) => email !== currentUserEmail);

          const userGenreId = (data['findData'][0] as Record<'preference', GenEntity>).preference.id;
          const userGenreOption = this.genreOptions.find((genre) => genre.value === userGenreId);
          userGenreOption && this.searchUserForm.get('genre')?.setValue(userGenreId);
      });
  
      of(this.allUsers)
        .subscribe((response: Array<string>) => {
          this.selectedEmails.update(fetchedUsers => [...fetchedUsers]);
        });
  }

  addUser($event: MatChipInputEvent): void {
    const value = ($event.value || '').trim();

    // Add our fruit
    if (value) {
      this.selectedEmails.update(fruits => [...fruits, value]);
    }

    // Clear the input value
    this.currentUser.set('');
  }

  removeUser(user: string): void {
    this.selectedEmails.update(users => {
      const index = users.indexOf(user);
      if (index < 0) {
        return users;
      }

      users.splice(index, 1);
      return [...users];
    });
    this.searchUserForm.controls['mailOfUsers'].setValue(this.selectedEmails());
  }

  handleUserSelection($event: MatAutocompleteSelectedEvent): void {
    this.selectedEmails.update(users => [...users, $event.option.viewValue]);
    this.searchUserForm.controls['mailOfUsers'].setValue(this.selectedEmails());
    this.currentUser.set('');
    $event.option.deselect();
  }

  getUserMatch(): void {
    this.#restDataService.fetchUserMatch(this.searchUserForm.value.genre, this.searchUserForm.value.mailOfUsers)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        //
      });
  }

  private setSearchUserFormValidators(): void {
    this.searchUserForm.controls['genre'].addValidators([Validators.required]);
    this.searchUserForm.controls['mailOfUsers'].addValidators([Validators.required]);
  }
}
