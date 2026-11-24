import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AuthComponent } from './auth.component';

// the real value is injected at build time (see project.json)
Object.assign(globalThis, { BACKEND_API_URL: 'http://localhost:3000' });

describe('AuthComponent', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;
  let http: HttpTestingController;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const answerOptions = (demo: boolean) => {
    http.expectOne(req => req.url.endsWith('auth/options')).flush({ demo });
    fixture.detectChanges();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('offers Google and Facebook', () => {
    answerOptions(false);

    expect(text()).toContain('Continue with Google');
    expect(text()).toContain('Continue with Facebook');
  });

  it('hides the demo button when the backend has the demo off', () => {
    answerOptions(false);

    expect(text()).not.toContain('Try the demo');
  });

  it('shows the demo button when the backend has the demo on', () => {
    answerOptions(true);

    expect(text()).toContain('Try the demo');
  });

  it('keeps the space of the demo block until the backend answers', () => {
    const section = () =>
      (fixture.nativeElement as HTMLElement).querySelector('.demo-section');

    expect(section()?.classList).toContain('is-pending');

    answerOptions(true);

    expect(section()?.classList).not.toContain('is-pending');
  });

  it('shows the demo block at once on a reload when the last answer was yes', () => {
    localStorage.setItem('demo_available', 'true');
    const reloaded = TestBed.createComponent(AuthComponent);
    reloaded.detectChanges();
    TestBed.inject(HttpTestingController).match(() => true);

    // afterNextRender has run in detectChanges: the cached answer is used
    reloaded.detectChanges();
    const section = (reloaded.nativeElement as HTMLElement).querySelector(
      '.demo-section'
    );
    expect(section?.classList).not.toContain('is-pending');
  });

  it('remembers the answer for the next reload', () => {
    answerOptions(true);

    expect(localStorage.getItem('demo_available')).toBe('true');
  });

  it('shows no demo button when the options cannot be loaded', () => {
    http
      .expectOne(req => req.url.endsWith('auth/options'))
      .flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text()).not.toContain('Try the demo');
  });

  it('starts the demo session and opens the app', () => {
    const goToApp = jest.spyOn(component, 'goToApp').mockImplementation();
    answerOptions(true);

    component.startDemo();
    http.expectOne(req => req.url.endsWith('auth/demo')).flush(null);

    expect(goToApp).toHaveBeenCalled();
  });

  it('does not open the app when the demo cannot start', () => {
    const goToApp = jest.spyOn(component, 'goToApp').mockImplementation();
    answerOptions(true);

    component.startDemo();
    http
      .expectOne(req => req.url.endsWith('auth/demo'))
      .flush('off', { status: 404, statusText: 'Not Found' });

    expect(goToApp).not.toHaveBeenCalled();
  });
});
