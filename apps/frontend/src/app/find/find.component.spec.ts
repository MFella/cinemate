import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { of } from 'rxjs';
import { FindComponent } from './find.component';

// the real value is injected at build time (see project.json)
Object.assign(globalThis, { BACKEND_API_URL: 'http://localhost:3000' });

describe('FindComponent', () => {
  let component: FindComponent;
  let fixture: ComponentFixture<FindComponent>;
  let router: Router;
  let http: HttpTestingController;

  const create = async (
    queryParams: Record<string, string | string[]> = {}
  ) => {
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
            queryParamMap: of(convertToParamMap(queryParams)),
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

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FindComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const matchRequests = () =>
    http.match(request => request.url.includes('user/match'));

  describe('without a search in the URL', () => {
    beforeEach(() => create());

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('shows the search form and does not search', () => {
      expect(component.isInSearchMode).toBe(true);
      expect(matchRequests()).toHaveLength(0);
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

    it('puts the search in the URL instead of searching directly', () => {
      component.selectedEmails.set(['anna@example.com']);
      component.searchUserForm.patchValue({
        mailOfUsers: ['anna@example.com'],
        genre: 4,
        matchMode: 'any',
      });

      component.getUserMatch();

      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: {
            emails: ['anna@example.com'],
            genre: 4,
            mode: 'any',
            title: null,
            filter: null,
          },
        })
      );
      expect(matchRequests()).toHaveLength(0);
    });

    it('clears the URL when going back to the form', () => {
      component.returnToSearchMode();

      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: {} })
      );
    });

    it('keeps the title and the filter in the URL without adding a history entry', () => {
      component.searchUserForm.patchValue({
        mailOfUsers: ['anna@example.com'],
        genre: 4,
      });
      component.filterMatchResultForm.patchValue({
        movieTitle: ' street ',
        moreFilters: ['onlyWatched'],
      });

      component.filterMatchResultList();

      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          replaceUrl: true,
          queryParams: expect.objectContaining({
            title: 'street',
            filter: 'onlyWatched',
          }),
        })
      );
      const [request] = matchRequests();
      expect(request.request.params.get('searchedMovieTitle')).toBe(' street ');
      expect(request.request.params.get('onlyWatched')).toBe('true');
    });
  });

  describe('with a search in the URL (reload)', () => {
    it('restores the form and shows the results', async () => {
      await create({
        emails: ['anna@example.com', 'bob@example.com'],
        genre: '4',
        mode: 'any',
        title: 'street',
        filter: 'onlyUnwatched',
      });

      expect(component.isInSearchMode).toBe(false);
      expect(component.selectedEmails()).toEqual([
        'anna@example.com',
        'bob@example.com',
      ]);
      expect(component.searchUserForm.value).toEqual({
        mailOfUsers: ['anna@example.com', 'bob@example.com'],
        genre: 4,
        matchMode: 'any',
      });
      expect(component.filterMatchResultForm.value).toEqual({
        moreFilters: ['onlyUnwatched'],
        movieTitle: 'street',
      });

      const [request] = matchRequests();
      expect(request.request.params.getAll('mailOfUsers')).toEqual([
        'anna@example.com',
        'bob@example.com',
      ]);
      expect(request.request.params.get('genreId')).toBe('4');
      expect(request.request.params.get('matchMode')).toBe('any');
      expect(request.request.params.get('onlyUnwatched')).toBe('true');
      expect(request.request.params.get('searchedMovieTitle')).toBe('street');
    });

    it('shows the form when the genre in the URL is unknown', async () => {
      await create({ emails: 'anna@example.com', genre: '999' });

      expect(component.isInSearchMode).toBe(true);
      expect(matchRequests()).toHaveLength(0);
    });

    it('shows the form when the URL has no e-mails', async () => {
      await create({ genre: '4' });

      expect(component.isInSearchMode).toBe(true);
      expect(matchRequests()).toHaveLength(0);
    });

    it('ignores an unknown filter and falls back to "everyone"', async () => {
      await create({
        emails: 'anna@example.com',
        genre: '4',
        mode: 'nonsense',
        filter: 'hackme',
      });

      expect(component.searchUserForm.value.matchMode).toBe('all');
      expect(component.filterMatchResultForm.value.moreFilters).toEqual([]);
    });
  });
});
