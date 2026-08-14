interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface ImportMetaEnv {
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}

// Ambient global bindings are declared with `var` so TypeScript exposes the
// property on `globalThis`; no JavaScript variable is emitted.
// eslint-disable-next-line no-var
declare var __LKP_D1__: unknown;
