import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import {MatSelectModule} from '@angular/material/select';
import {MatInputModule} from '@angular/material/input';
import {MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule} from '@angular/material/form-field';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GenEntity, Genres, SelectOption, genres } from '../typings/common';
import { ActivatedRoute } from '@angular/router';
import { Observable, take } from 'rxjs';
import { RestDataService } from '../_services/rest-data.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertInteractionService } from '../_services/alert-interaction.service';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatProgressBarModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule],
    providers: [
      {provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: {appearance: 'outline'}}
    ],
  templateUrl: './preferences.component.html',
  styleUrl: './preferences.component.scss',
})
export class PreferencesComponent implements OnInit {
  #activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  #restDataService: RestDataService = inject(RestDataService);
  #alertService: AlertInteractionService = inject(AlertInteractionService);
  
  isFetchingData: boolean = false;
  originGenreId!: number;
  genreOptions: Array<SelectOption<Genres>> = genres.map((genre) => {
    return {
      value: Math.random() * 10,
      label: genre,
      disabled: true
    }
  });

  preferencesFormGroup: FormGroup = new FormGroup({
    genre: new FormControl('', [Validators.required])
  });

  ngOnInit(): void {
    this.isFetchingData = true;
    (this.#activatedRoute.data as Observable<{ preferencesData: [Record<'preference', GenEntity>, Array<GenEntity>] }>)
      .pipe(take(1))
      .subscribe(({ preferencesData }) => {
        this.genreOptions = preferencesData[1].map((genre) => {
          return {
            value: genre.id,
            label: genre.genre,
            disabled: genre.id === null
          }
        });

        this.originGenreId = preferencesData[0].preference.id;
        this.preferencesFormGroup.get('genre')?.setValue(this.originGenreId);
        this.isFetchingData = false;
      });      
  }

  savePreference(): void {
    const selectedPreference = this.preferencesFormGroup.get('genre')?.value;
    this.isFetchingData = true;
    this.#restDataService.saveUserPreference(selectedPreference)
      .pipe(take(1))
      .subscribe({
        next: (isSaved: boolean) => {
          if (isSaved) {
            this.originGenreId = selectedPreference;
          }
        },
        error:(error: HttpErrorResponse) => {
          this.#alertService.error(error?.message);
        },
        complete: () => {
          this.isFetchingData = false;
        }  
      });
  }
}
