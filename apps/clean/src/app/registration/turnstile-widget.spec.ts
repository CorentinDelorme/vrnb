import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TurnstileRenderOptions, TurnstileWidget } from './turnstile-widget';

@Component({
  selector: 'app-turnstile-host',
  standalone: true,
  imports: [TurnstileWidget],
  template: `
    <app-turnstile-widget
      [siteKey]="siteKey()"
      [active]="active()"
      (tokenChange)="tokens.push($event)"
    />
  `,
})
class TurnstileHost {
  readonly siteKey = signal('turnstile-site-key');
  readonly active = signal(false);
  readonly tokens: string[] = [];
}

const TURNSTILE_UNAVAILABLE_MESSAGE = 'Captcha indisponible, réessayez plus tard.';

const script = (): HTMLScriptElement | null =>
  document.querySelector<HTMLScriptElement>('script[src*="challenges.cloudflare.com"]');

const flushMicrotasks = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

describe('TurnstileWidget', () => {
  let fixture: ComponentFixture<TurnstileHost>;
  let host: TurnstileHost;
  let renderedOptions: TurnstileRenderOptions | null;
  let render: ReturnType<
    typeof vi.fn<(container: HTMLElement, options: TurnstileRenderOptions) => string>
  >;
  let reset: ReturnType<typeof vi.fn<(widgetId?: string) => void>>;

  beforeEach(async () => {
    renderedOptions = null;
    render = vi.fn((_container: HTMLElement, options: TurnstileRenderOptions): string => {
      renderedOptions = options;
      return 'widget-1';
    });
    reset = vi.fn((): void => undefined);
    window.turnstile = { render, reset };

    await TestBed.configureTestingModule({ imports: [TurnstileHost] }).compileComponents();
    fixture = TestBed.createComponent(TurnstileHost);
    host = fixture.componentInstance;
  });

  afterEach(() => {
    delete window.turnstile;
    script()?.remove();
  });

  it('does not render the widget while inactive', () => {
    fixture.detectChanges();
    expect(render).not.toHaveBeenCalled();
  });

  it('renders the widget with the site key when activated, reusing window.turnstile', () => {
    host.active.set(true);
    fixture.detectChanges();

    expect(render).toHaveBeenCalledTimes(1);
    const [container, options] = render.mock.calls[0];
    expect(container).toBeInstanceOf(HTMLElement);
    expect(options.sitekey).toBe('turnstile-site-key');
    expect(options.theme).toBe('auto');
    expect(script()).toBeNull();
  });

  it('renders the widget once per activation, not on every change detection cycle', () => {
    host.active.set(true);
    fixture.detectChanges();
    fixture.detectChanges();
    fixture.detectChanges();

    host.active.set(false);
    fixture.detectChanges();
    host.active.set(true);
    fixture.detectChanges();

    expect(render).toHaveBeenCalledTimes(1);
  });

  it('forwards the token resolved by the challenge', () => {
    host.active.set(true);
    fixture.detectChanges();

    renderedOptions?.callback('turnstile-token');

    expect(host.tokens).toEqual(['turnstile-token']);
  });

  it('clears the token and resets the widget when the token expires', () => {
    host.active.set(true);
    fixture.detectChanges();

    renderedOptions?.['expired-callback']();

    expect(host.tokens).toEqual(['']);
    expect(reset).toHaveBeenCalledWith('widget-1');
  });

  it('clears the token and resets the widget when the challenge fails', () => {
    host.active.set(true);
    fixture.detectChanges();

    renderedOptions?.['error-callback']('network-error');
    fixture.detectChanges();

    expect(host.tokens).toEqual(['']);
    expect(reset).toHaveBeenCalledWith('widget-1');
    expect(fixture.nativeElement.textContent).toContain(TURNSTILE_UNAVAILABLE_MESSAGE);
  });

  it('clears the token and resets the widget when it is deactivated', () => {
    host.active.set(true);
    fixture.detectChanges();

    host.active.set(false);
    fixture.detectChanges();

    expect(host.tokens).toEqual(['']);
    expect(reset).toHaveBeenCalledWith('widget-1');
  });

  it('resets the widget on demand so a failed submission can retry', () => {
    host.active.set(true);
    fixture.detectChanges();
    renderedOptions?.callback('turnstile-token');

    fixture.debugElement.query(By.directive(TurnstileWidget)).componentInstance.reset();

    expect(host.tokens).toEqual(['turnstile-token', '']);
    expect(reset).toHaveBeenCalledWith('widget-1');
  });

  it('reports an unavailable captcha when the site key is missing', () => {
    host.siteKey.set('');
    host.active.set(true);
    fixture.detectChanges();

    expect(render).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(TURNSTILE_UNAVAILABLE_MESSAGE);
  });

  it('loads the turnstile script lazily when the global is missing', async () => {
    delete window.turnstile;
    host.active.set(true);
    fixture.detectChanges();

    const injected = script();
    expect(injected?.src).toContain('render=explicit');

    window.turnstile = { render, reset };
    injected?.dispatchEvent(new Event('load'));
    await flushMicrotasks();

    expect(render).toHaveBeenCalledTimes(1);
  });

  it('reports an unavailable captcha when the script fails to load', async () => {
    delete window.turnstile;
    host.active.set(true);
    fixture.detectChanges();

    script()?.dispatchEvent(new Event('error'));
    await flushMicrotasks();
    fixture.detectChanges();

    expect(render).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(TURNSTILE_UNAVAILABLE_MESSAGE);
  });
});
