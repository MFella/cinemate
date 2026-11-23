import {
  Component,
  computed,
  DestroyRef,
  inject,
  model,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldModule,
} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import {
  BehaviorSubject,
  debounceTime,
  filter,
  of,
  Subject,
  switchMap,
  take,
  throttleTime,
} from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import {
  FindMatchResult,
  GenEntity,
  MatchedMovie,
  MovieToRate,
  SelectOption,
  UserPreferences,
} from '../typings/common';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../_services/auth.service';
import { MatTableModule } from '@angular/material/table';
import { RestDataService } from '../_services/rest-data.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertInteractionService } from '../_services/alert-interaction.service';
import { MatchComponent } from '../match/match.component';
import { MoviePreviewComponent } from '../movie-preview/movie-preview.component';

@Component({
  selector: 'app-find',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatMenuModule,
    MoviePreviewComponent,
  ],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        subscriptSizing: 'dynamic',
      },
    },
  ],
  templateUrl: './find.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './find.component.scss',
})
export class FindComponent implements OnInit {
  private static readonly FETCH_MATCH_RESULT_SCROLL_THRESHOLD_PX = 200;
  private static readonly FETCH_MATCH_RESULT_SCROLL_DEBOUNCE_OFFSET = 200;
  private readonly activatedRoute = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);
  readonly #authService = inject(AuthService);
  readonly #restDataService = inject(RestDataService);
  readonly #matDialog = inject<MatDialog>(MatDialog);
  readonly #alertInteractionService = inject(AlertInteractionService);
  readonly #router = inject(Router);
  // the search (e-mails, genre, mode) that the results on screen belong to
  #loadedSearchKey: string | null = null;

  readonly fetchedGenres = signal<Array<GenEntity>>([]);
  readonly selectedEmails = signal<Array<string>>([]);
  readonly currentUser = model('');
  readonly filteredUsers = computed(() => {
    return this.allUsers.filter(user => !this.selectedEmails().includes(user));
  });

  readonly searchUserForm = new FormGroup({
    mailOfUsers: new FormControl(),
    genre: new FormControl(),
    matchMode: new FormControl<'all' | 'any'>('all'),
  });

  readonly filterMatchResultForm = new FormGroup({
    moreFilters: new FormControl(),
    movieTitle: new FormControl(''),
  });

  readonly filterOptions: Array<SelectOption> = [
    {
      disabled: false,
      label: 'Only watched',
      value: 'onlyWatched',
    },
    {
      disabled: false,
      label: 'Only unwatched',
      value: 'onlyUnwatched',
    },
  ];

  readonly matchedMovies$: BehaviorSubject<Array<MatchedMovie>> =
    new BehaviorSubject<Array<MatchedMovie>>([]);
  readonly matchTableScrolled$: Subject<Event> = new Subject<Event>();

  pageNumber = 0;
  findMatchResult: FindMatchResult | null = null;
  isInSearchMode = true;
  allUsers: Array<string> = [];
  genreOptions: Array<SelectOption> = [];
  displayMatchTableColumns: string[] = [
    'view-details',
    'movie',
    'email',
    'is-watched',
  ];

  ngOnInit(): void {
    this.setSearchUserFormValidators();
    this.observeMatchTableScrolled();
    // title typing and filter changes re-query the results (no search button needed)
    this.filterMatchResultForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.filterMatchResultList());
    this.activatedRoute.data
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(data => {
        this.genreOptions = data['findData'][1].map((genEntity: GenEntity) => {
          return {
            disabled: false,
            label: genEntity.name,
            value: genEntity.id,
          };
        });
        const currentUserEmail = this.#authService
          .getUserPayloadValues('email')
          ?.at(0);
        this.allUsers = (data['findData'][2] as Array<string>).filter(
          (email: string) => email !== currentUserEmail
        );

        // the first preferred genre is the default one in the search form
        const userGenreId = (data['findData'][0] as UserPreferences)
          .preferences[0]?.id;
        const userGenreOption = this.genreOptions.find(
          genre => genre.value === userGenreId
        );
        userGenreOption &&
          this.searchUserForm.get('genre')?.setValue(userGenreId);
      });

    // the URL is the source of truth of a search: reload and "back" restore it
    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(params => this.applySearchFromUrl(params));

    of(this.allUsers).subscribe(() => {
      this.selectedEmails.update(fetchedUsers => [...fetchedUsers]);
    });
  }

  addUser($event: MatChipInputEvent): void {
    const value = ($event.value || '').trim();
    if (value && !this.selectedEmails().includes(value)) {
      this.selectedEmails.update(emails => [...emails, value]);
      this.searchUserForm.controls['mailOfUsers'].setValue(
        this.selectedEmails()
      );
    }
    $event.chipInput?.clear();

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
    // the query params change triggers the search (see applySearchFromUrl)
    this.#router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        ...this.buildSearchQueryParams(),
        title: null,
        filter: null,
      },
    });
  }

  async openMovieInfoDialog(matchedMovie: MatchedMovie): Promise<void> {
    this.#restDataService
      .fetchMovieData(matchedMovie.movie.id)
      .pipe(take(1))
      .subscribe((movieToRate: MovieToRate) => {
        this.#matDialog.open(MatchComponent, {
          panelClass: 'movie-detail-dialog',
          data: {
            withActionButtons: false,
            matchedMovie,
            movie: movieToRate,
          },
        });
      });
  }

  returnToSearchMode(): void {
    this.#router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {},
    });
  }

  /** The "watched" filter that is on, if any (the two options exclude each other). */
  get activeMoreFilter(): string | null {
    return this.filterMatchResultForm.value.moreFilters?.at(0) ?? null;
  }

  toggleMoreFilter(value: SelectOption['value']): void {
    this.filterMatchResultForm.controls.moreFilters.setValue(
      this.activeMoreFilter === value ? [] : [value]
    );
  }

  filterMatchResultList(): void {
    this.#router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: this.buildSearchQueryParams(),
      replaceUrl: true,
    });
    this.loadResults(false);
  }

  private buildSearchQueryParams(): Record<string, unknown> {
    const { moreFilters, movieTitle } = this.filterMatchResultForm.value;
    return {
      emails: (this.searchUserForm.value.mailOfUsers ?? []).filter(Boolean),
      genre: this.searchUserForm.value.genre,
      mode: this.searchUserForm.value.matchMode ?? 'all',
      title: movieTitle?.trim() || null,
      filter: moreFilters?.at(0) ?? null,
    };
  }

  private applySearchFromUrl(params: ParamMap): void {
    const emails = params
      .getAll('emails')
      .map(email => email.trim())
      .filter(Boolean);
    const genre = Number(params.get('genre'));
    const isGenreKnown = this.genreOptions.some(
      option => option.value === genre
    );

    if (!emails.length || !isGenreKnown) {
      // no (valid) search in the URL: show the form, which keeps what was typed
      this.#loadedSearchKey = null;
      this.isInSearchMode = true;
      this.pageNumber = 0;
      this.findMatchResult = null;
      this.filterMatchResultForm.reset(
        { moreFilters: [], movieTitle: '' },
        { emitEvent: false }
      );
      return;
    }

    const matchMode = params.get('mode') === 'any' ? 'any' : 'all';
    const searchKey = JSON.stringify([emails, genre, matchMode]);
    if (searchKey === this.#loadedSearchKey) {
      // only the title or the filter changed: the results are already up to date
      return;
    }
    this.#loadedSearchKey = searchKey;

    const filterParam = params.get('filter');
    const isFilterKnown = this.filterOptions.some(
      option => option.value === filterParam
    );
    this.selectedEmails.set(emails);
    this.searchUserForm.patchValue({
      mailOfUsers: emails,
      genre,
      matchMode,
    });
    this.filterMatchResultForm.reset(
      {
        moreFilters: isFilterKnown ? [filterParam] : [],
        movieTitle: params.get('title') ?? '',
      },
      { emitEvent: false }
    );
    this.isInSearchMode = false;
    this.pageNumber = 0;
    this.loadResults(true);
  }

  private loadResults(showSpinner: boolean): void {
    const { moreFilters, movieTitle } = this.filterMatchResultForm.value;
    const activeFilter = moreFilters?.at(0);
    showSpinner &&
      this.#alertInteractionService.isLoadingSpinnerActive$.next(true);

    this.#restDataService
      .fetchUserMatch(
        this.searchUserForm.value.genre,
        this.searchUserForm.value.mailOfUsers,
        {
          pageNumber: 0,
          matchMode: this.searchUserForm.value.matchMode ?? 'all',
          onlyWatched: activeFilter === 'onlyWatched' ? true : undefined,
          onlyUnwatched: activeFilter === 'onlyUnwatched' ? true : undefined,
          searchedMovieTitle: movieTitle ?? '',
        }
      )
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (findMatchResult: FindMatchResult) => {
          this.findMatchResult = findMatchResult;
          this.matchedMovies$.next(findMatchResult.matchedRates);
        },
        // the interceptor reports the error; just stop the spinner
        error: () =>
          this.#alertInteractionService.isLoadingSpinnerActive$.next(false),
        complete: () =>
          this.#alertInteractionService.isLoadingSpinnerActive$.next(false),
      });
  }

  observeMatchTableScrolled(): void {
    this.matchTableScrolled$
      .pipe(
        filter(this.shouldFilterScrollEvent.bind(this)),
        throttleTime(FindComponent.FETCH_MATCH_RESULT_SCROLL_DEBOUNCE_OFFSET),
        switchMap(() =>
          this.#restDataService.fetchUserMatch(
            this.searchUserForm.value.genre,
            this.searchUserForm.value.mailOfUsers,
            {
              pageNumber: this.pageNumber + 1,
              matchMode: this.searchUserForm.value.matchMode ?? 'all',
            }
          )
        )
      )
      .subscribe({
        next: (findMatchResult: FindMatchResult) => {
          this.findMatchResult = findMatchResult;
          this.matchedMovies$.next(
            this.matchedMovies$.getValue().concat(findMatchResult.matchedRates)
          );
          this.pageNumber += 1;
        },
        error: () => {
          this.#alertInteractionService.error(
            'Error occured during fetching next orders...'
          );
        },
      });
  }
  private shouldFilterScrollEvent($event: Event): boolean {
    // viewport: ~500px
    const tableViewHeight = ($event.target as HTMLElement).offsetHeight;
    // length of all table
    const tableScrollHeight = ($event.target as HTMLElement).scrollHeight;
    // how far user scrolled
    const scrollLocation = ($event.target as HTMLElement).scrollTop;

    const viewportTreshold =
      tableScrollHeight -
      tableViewHeight -
      FindComponent.FETCH_MATCH_RESULT_SCROLL_THRESHOLD_PX;

    return (
      scrollLocation > viewportTreshold && !this.findMatchResult?.isLastPage
    );
  }

  private setSearchUserFormValidators(): void {
    this.searchUserForm.controls['genre'].addValidators([Validators.required]);
    this.searchUserForm.controls['mailOfUsers'].addValidators([
      Validators.required,
    ]);
  }
}
