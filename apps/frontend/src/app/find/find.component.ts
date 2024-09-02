import { Component, computed, DestroyRef, inject, model, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { of, take } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { FindMatchResult, GenEntity, MovieToRate, SelectOption } from '../typings/common';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../_services/auth.service';
import {MatTableModule} from '@angular/material/table';
import { RestDataService } from '../_services/rest-data.service';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MovieDetailComponent } from '../components/movie-detail/movie-detail.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-find',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDividerModule, MatSelectModule,
    ReactiveFormsModule, MatChipsModule, MatAutocompleteModule, MatIconModule, MatCardModule, MatTableModule,
    MatSlideToggleModule, MatTooltipModule],
    providers: [
      {
        provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
        useValue: {
          subscriptSizing: 'dynamic'
        }
      }
    ],
  templateUrl: './find.component.html',
  styleUrl: './find.component.scss',
})
export class FindComponent implements OnInit {

  @ViewChild('filterSelect')
  filterSelect!: MatSelect;

  private static readonly FETCH_MATCH_RESULT_SCROLL_THRESHOLD_PX = 200;
  private readonly activatedRoute = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);
  readonly #authService = inject(AuthService);
  readonly #restDataService = inject(RestDataService);
  readonly #matDialog = inject(MatDialog);

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

  readonly filterMatchResultForm = new FormGroup({
    moreFilters: new FormControl(),
    movieTitle: new FormControl('')
  })

  readonly filterOptions: Array<SelectOption> = [
    {
      disabled: false,
      label: 'Only watched',
      value: 'onlyWatched'
    },
    {
      disabled: false,
      label: 'Only unwatched',
      value: 'onlyUnwatched'
    }
  ]

  findMatchResult!: FindMatchResult;
  isInSearchMode: boolean = true;
  allUsers: Array<string> = [];
  genreOptions: Array<SelectOption> = [];
  displayMatchTableColumns: string[] = ['view-details', 'movie', 'email', 'is-watched'];

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
    if (value) {
      this.selectedEmails.update(fruits => [...fruits, value]);
    }

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
      .subscribe((findMatchResult: FindMatchResult) => {
        //
        this.findMatchResult = findMatchResult;
        this.isInSearchMode = false;
      });
  }

  async openMovieInfoDialog(movieId: number): Promise<void> {
    this.#restDataService.fetchMovieData(movieId)
      .pipe(take(1))
      .subscribe((movieToRate: MovieToRate) => {
        debugger;
        this.#matDialog.open(MovieDetailComponent, {
          data: {
            movie: movieToRate,
            movieDetailConfig: {
              shouldDisplayConfig: true,
              dialogActionButtons: ['Close']
            }
          }
        });
      });
  }

  returnToSearchMode(): void {
    this.isInSearchMode = true;

    // clear state of fetched rate results
    this.findMatchResult.matchedRates ??= [];
  }

  updateIsMovieWatched(movieId: number, isMovieWatched: boolean, $event: MouseEvent): void {
    $event.stopPropagation();
    this.#restDataService.saveIsMovieWatched(movieId, !isMovieWatched)
      .pipe(take(1))
      .subscribe((isResultSaved: boolean) => {
        debugger;
      });
  }

  openFilterSettingsSelect(): void {
    this.filterSelect.open();
  }

  filterMatchResultList(): void {
    const { moreFilters, movieTitle } = this.filterMatchResultForm.value;
    const moreFiltersObject = moreFilters?.reduce((acc: Record<'onlyWatched' | 'onlyUnwatched', boolean>, value: string) =>
      Object.defineProperty(acc, value, { value: true }), {}) ?? {};

    this.#restDataService.fetchUserMatch(this.searchUserForm.value.genre, this.searchUserForm.value.mailOfUsers,
      {
        onlyWatched: moreFiltersObject['onlyWatched'],
        onlyUnwatched: moreFiltersObject['onlyUnwatched'],
        searchedMovieTitle: movieTitle ?? ''
      }
    )
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((findMatchResult: FindMatchResult) => {
        this.findMatchResult = findMatchResult;
      })
  }

  handleMatchTableScroll($event: Event): void {
    const tableViewHeight = ($event.target as HTMLElement).offsetHeight // viewport: ~500px
    const tableScrollHeight = ($event.target as HTMLElement).scrollHeight // length of all table
    const scrollLocation = ($event.target as HTMLElement).scrollTop; // how far user scrolled


    const viewportTreshold = tableScrollHeight - tableViewHeight - FindComponent.FETCH_MATCH_RESULT_SCROLL_THRESHOLD_PX;    
    if (scrollLocation > viewportTreshold) {
      // fetch next match entities
    }
  }
  
  private setSearchUserFormValidators(): void {
    this.searchUserForm.controls['genre'].addValidators([Validators.required]);
    this.searchUserForm.controls['mailOfUsers'].addValidators([Validators.required]);
  }
}
