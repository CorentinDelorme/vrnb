import type * as Leaflet from 'leaflet';

// Leaflet 1.9 ships a UMD bundle as its package main entry. Depending on the
// bundler (Vite dev pre-bundling vs production build), `await
// import('leaflet')` resolves either to the Leaflet namespace itself or to an
// interop namespace with the Leaflet object under `.default`. Accessing
// `L.Map` on the latter gives `undefined` and crashes with
// "o.Map is not a constructor". Unwrapping the default export covers both.
export async function loadLeaflet(): Promise<typeof Leaflet> {
  const mod = (await import('leaflet')) as unknown as typeof Leaflet & {
    readonly default?: typeof Leaflet;
  };
  return mod.default ?? mod;
}
