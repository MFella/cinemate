import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldModule,
} from '@angular/material/form-field';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  GenEntity,
  SelectOption,
  UserPreferences,
  genres,
} from '../typings/common';
import { ActivatedRoute } from '@angular/router';
import { Observable, take } from 'rxjs';
import { RestDataService } from '../_services/rest-data.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertInteractionService } from '../_services/alert-interaction.service';

@Component({
  selector: 'app-preferences',
  imports: [
    MatCardModule,
    MatDividerModule,
    MatProgressBarModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline' },
    },
  ],
  templateUrl: './preferences.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './preferences.component.scss',
})
export class PreferencesComponent implements OnInit {
  #activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  #restDataService: RestDataService = inject(RestDataService);
  #alertService: AlertInteractionService = inject(AlertInteractionService);

  isFetchingData = false;
  originGenreIds: Array<number> = [];
  genreOptions: Array<SelectOption> = genres.map(genre => {
    return {
      value: Math.random() * 10,
      label: genre,
      disabled: true,
    };
  });

  preferencesFormGroup: FormGroup = new FormGroup({
    genres: new FormControl<Array<number>>([], [Validators.required]),
  });

  ngOnInit(): void {
    this.isFetchingData = true;
    (
      this.#activatedRoute.data as Observable<{
        preferencesData: [UserPreferences, Array<GenEntity>];
      }>
    )
      .pipe(take(1))
      .subscribe(({ preferencesData }) => {
        this.genreOptions = preferencesData[1].map(genre => {
          return {
            value: genre.id,
            label: genre.name,
            disabled: genre.id === null,
          };
        });

        this.originGenreIds = preferencesData[0].preferences.map(
          genre => genre.id
        );
        this.preferencesFormGroup.get('genres')?.setValue(this.originGenreIds);
        this.isFetchingData = false;
      });
  }

  hasSelectionChanged(): boolean {
    const selected: Array<number> =
      this.preferencesFormGroup.get('genres')?.value ?? [];
    return (
      selected.length !== this.originGenreIds.length ||
      selected.some(genreId => !this.originGenreIds.includes(genreId))
    );
  }

  savePreference(): void {
    const selectedPreference: Array<number> =
      this.preferencesFormGroup.get('genres')?.value ?? [];
    this.isFetchingData = true;
    this.#restDataService
      .saveUserPreferences(selectedPreference)
      .pipe(take(1))
      .subscribe({
        next: (isSaved: boolean) => {
          if (isSaved) {
            this.originGenreIds = [...selectedPreference];
            this.#alertService.success('Preferences have been saved');
          }
        },
        error: (error: HttpErrorResponse) => {
          this.#alertService.error(error?.message);
        },
        complete: () => {
          this.isFetchingData = false;
        },
      });
  }
}
