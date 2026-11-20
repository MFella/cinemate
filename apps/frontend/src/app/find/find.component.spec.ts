import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FindComponent } from './find.component';

describe('FindComponent', () => {
  let component: FindComponent;
  let fixture: ComponentFixture<FindComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FindComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({
              findData: [
                { preferences: [{ id: 7, name: 'Comedy' }] },
                [
                  { id: 4, name: 'Adventure' },
                  { id: 7, name: 'Comedy' },
                ],
                ['anna@example.com'],
              ],
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FindComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with the first preferred genre selected and "everyone" mode', () => {
    expect(component.searchUserForm.value.genre).toBe(7);
    expect(component.searchUserForm.value.matchMode).toBe('all');
  });

  it('cannot search without a friend selected', () => {
    expect(component.searchUserForm.valid).toBe(false);
  });

  it('adds a typed e-mail to the form once, ignoring duplicates', () => {
    const add = (value: string) =>
      component.addUser({
        value,
        chipInput: { clear: jest.fn() },
      } as never);

    add(' anna@example.com ');
    add('anna@example.com');

    expect(component.selectedEmails()).toEqual(['anna@example.com']);
    expect(component.searchUserForm.value.mailOfUsers).toEqual([
      'anna@example.com',
    ]);
    expect(component.searchUserForm.valid).toBe(true);
  });
});
