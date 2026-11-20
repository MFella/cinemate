import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PreferencesComponent } from './preferences.component';

describe('PreferencesComponent', () => {
  let component: PreferencesComponent;
  let fixture: ComponentFixture<PreferencesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreferencesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              preferencesData: [
                { preferences: [{ id: 4, name: 'Adventure' }] },
                [
                  { id: 4, name: 'Adventure' },
                  { id: 7, name: 'Comedy' },
                ],
              ],
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PreferencesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('preselects the genres the user already has', () => {
    expect(component.preferencesFormGroup.get('genres')?.value).toEqual([4]);
  });

  it('does not allow saving until the selection changes', () => {
    expect(component.hasSelectionChanged()).toBe(false);

    component.preferencesFormGroup.get('genres')?.setValue([4, 7]);

    expect(component.hasSelectionChanged()).toBe(true);
  });

  it('treats the same genres in another order as unchanged', () => {
    component.preferencesFormGroup.get('genres')?.setValue([4]);

    expect(component.hasSelectionChanged()).toBe(false);
  });

  it('does not allow an empty selection', () => {
    component.preferencesFormGroup.get('genres')?.setValue([]);

    expect(component.preferencesFormGroup.invalid).toBe(true);
  });
});
