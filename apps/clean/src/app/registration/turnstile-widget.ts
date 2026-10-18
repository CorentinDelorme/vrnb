import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DOCUMENT,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const UNAVAILABLE_MESSAGE = 'Captcha indisponible, réessayez plus tard.';

/** Options of the Turnstile explicit rendering mode, limited to what the app uses. */
export interface TurnstileRenderOptions {
  readonly sitekey: string;
  readonly theme: 'light' | 'dark' | 'auto';
  readonly callback: (token: string) => void;
  readonly 'error-callback': (errorCode: string) => void;
  readonly 'expired-callback': () => void;
}

/** Subset of the Cloudflare Turnstile browser API used by this widget. */
export interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId?: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Cloudflare Turnstile widget in explicit rendering mode.
 *
 * The challenge runs as soon as `active` is true and the site key is known, so
 * the widget is never rendered while the modal is hidden. In tests and e2e, a
 * `window.turnstile` stub replaces the remote script and is used as is.
 */
@Component({
  selector: 'app-turnstile-widget',
  standalone: true,
  template: `
    <div class="min-h-[65px]" #container></div>
    @if (unavailable()) {
      <p class="text-error text-sm">{{ unavailableMessage }}</p>
    }
  `,
})
export class TurnstileWidget {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly siteKey = input.required<string>();
  /** True while the widget is visible; the challenge is released when it turns false. */
  readonly active = input(false);
  /** Resolved token, or an empty string when the token is cleared or invalidated. */
  readonly tokenChange = output<string>();
  readonly unavailable = signal(false);
  readonly unavailableMessage = UNAVAILABLE_MESSAGE;

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');
  private api: TurnstileApi | null = null;
  private widgetId: string | null = null;
  private scriptPromise: Promise<TurnstileApi> | null = null;

  constructor() {
    effect(() => {
      if (!this.isBrowser) {
        return;
      }
      const active = this.active();
      const siteKey = this.siteKey();
      if (!active) {
        this.clear();
        return;
      }
      if (this.widgetId !== null) {
        return;
      }
      if (siteKey.length === 0) {
        this.unavailable.set(true);
        return;
      }
      this.mount(siteKey);
    });
  }

  /** Clears the current token and lets the challenge run again. */
  reset(): void {
    this.clear();
    this.unavailable.set(false);
  }

  private mount(siteKey: string): void {
    const api = window.turnstile;
    if (api) {
      this.renderWidget(api, siteKey);
      return;
    }
    this.loadApi()
      .then((loaded) => {
        const stillExpected = this.active() && this.widgetId === null && this.siteKey() === siteKey;
        if (stillExpected) {
          this.renderWidget(loaded, siteKey);
        }
      })
      .catch(() => this.unavailable.set(true));
  }

  private renderWidget(api: TurnstileApi, siteKey: string): void {
    this.api = api;
    this.unavailable.set(false);
    this.widgetId = api.render(this.container().nativeElement, {
      sitekey: siteKey,
      theme: 'auto',
      callback: (token: string) => {
        this.unavailable.set(false);
        this.tokenChange.emit(token);
      },
      'error-callback': () => {
        this.reset();
        this.unavailable.set(true);
      },
      'expired-callback': () => this.reset(),
    });
  }

  private clear(): void {
    this.tokenChange.emit('');
    if (this.api && this.widgetId !== null) {
      this.api.reset(this.widgetId);
    }
  }

  private loadApi(): Promise<TurnstileApi> {
    this.scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.addEventListener('load', () => {
        const api = window.turnstile;
        if (api) {
          resolve(api);
        } else {
          reject(new Error('The Turnstile script loaded without exposing window.turnstile.'));
        }
      });
      script.addEventListener('error', () =>
        reject(new Error('The Turnstile script failed to load.')),
      );
      this.document.head.appendChild(script);
    });
    return this.scriptPromise;
  }
}
