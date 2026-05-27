# Nexo — Roadmap

> Implementation checklist for the Nexo runtime, dev server, static exporter, and CLI.
> Source of truth: [docs/DOCUMENTATION.MD](docs/DOCUMENTATION.MD). When in doubt, the documentation wins — update it before changing behavior here.

## Legend

- `[ ]` not started
- `[~]` in progress
- `[x]` done

Every phase is gated by its **Acceptance** block: do not move to the next phase until all acceptance boxes are ticked. Each phase produces an isolated, testable artifact.

---

## Phase 0 — Repository Setup

Bootstrap the toolchain so every later phase can be built and tested in isolation.

### Implementation

- [x] Initialize `package.json` (npm, `"type": "module"`, ESM)
- [x] Add `"bin": { "nexo": "./dist/cli/index.js" }`
- [x] Add TypeScript with `tsconfig.json` (`strict: true`, `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`)
- [x] Add ESLint (typescript-eslint) + Prettier configs and `npm run lint` / `npm run format` scripts
- [x] Add Vitest with `npm run test`, `npm run test:watch`, `npm run coverage`
- [x] Add `tsup` (or `tsc` + bundler of choice) for building runtime + CLI to `dist/`
- [x] Add `zod` as a runtime dependency (schema validation)
- [x] Add `chokidar`, `ws`, `mime-types` as runtime dependencies (dev server)
- [x] Create folder skeleton:
  - [x] `src/runtime/` — SchemaParser, ComponentResolver, PropResolver, Interpolator, AssetInjector, MountEngine, LifecycleRunner
  - [x] `src/dev-server/` — HTTPServer, FileWatcher, WSServer, HMRHandler
  - [x] `src/exporter/` — static HTML generator
  - [x] `src/cli/` — `nexo` command entry point
  - [x] `src/types/` — TypeScript interfaces from `docs/DOCUMENTATION.MD` §11
  - [x] `tests/` mirroring `src/` for unit tests
  - [x] `tests/fixtures/` for sample schemas and component folders
  - [x] `examples/pizza-landing/` end-to-end example project
- [x] Base `README.md` linking to `docs/DOCUMENTATION.MD` and this roadmap
- [x] `.gitignore` covering `node_modules`, `dist`, `coverage`, `.DS_Store`, `*.log`
- [x] Husky + lint-staged pre-commit hook running lint + typecheck on changed files
- [x] GitHub Actions CI (`.github/workflows/ci.yml`) running `lint`, `typecheck`, `test`, `build` on push and PR
- [x] Adopt Changesets for semver and changelog generation

### Tests

- [x] `npm run typecheck` succeeds on empty skeleton
- [x] `npm run test` runs zero tests successfully
- [x] `npm run build` produces an empty `dist/` without errors
- [x] CI workflow passes on a no-op PR

### Acceptance

- [x] Fresh clone → `npm install && npm test && npm run build` works in under 60s
- [x] Editor (with TS server) reports no errors anywhere in `src/`

---

## Phase 1 — SchemaParser

**Deliverable:** `parseSchema(path: string): Promise<NexoSchema>` exported from `src/runtime/schema-parser.ts`.

### Implementation

- [x] Define `NexoSchema`, `NexoConfig`, `NexoPages`, `NexoComponentSchema`, `PropDefinition`, `PropType`, `PropValue`, `AssetName` in `src/types/schema.ts` (mirroring §11 of the docs)
- [x] Define Zod schemas for each interface (`zNexoSchema`, `zNexoConfig`, `zNexoComponentSchema`, `zPropDefinition`)
- [x] Read `schema.json` from disk (async, UTF-8)
- [x] Run `zNexoSchema.safeParse` and convert errors into a `NexoSchemaError` class with file path + Zod issue tree formatted as readable text
- [x] Validate that every name in `pages[route]` exists as a key in `components`
- [x] Validate that every `components[name].source` path is a relative string (no absolute or URL paths)
- [x] Apply defaults: `config.port = 3000`, `config.assets = []` if absent

### Tests

- [x] Parses the example schema from `docs/DOCUMENTATION.MD` §4
- [x] Throws `NexoSchemaError` with descriptive message for: missing `config`, missing `pages`, unknown component referenced in a page, invalid prop `type`, non-string `source`
- [x] Applies default port `3000` when `config.port` is absent
- [x] Returns a value with the exact `NexoSchema` shape (snapshot test)

### Acceptance

- [x] No runtime dependency beyond `node:fs/promises` and `zod`
- [x] Pure function — no side effects beyond reading the schema file
- [x] All error messages include the offending path/field

---

## Phase 2 — ComponentResolver

**Deliverable:** `resolveComponent(name: string, schema: NexoSchema, rootDir: string): Promise<ResolvedComponent>` exported from `src/runtime/component-resolver.ts`.

### Implementation

- [x] Define `ResolvedComponent`, `ComponentMeta`, `ComponentScript` types in `src/types/component.ts` (mirroring §11)
- [x] Resolve `components[name].source` relative to `rootDir`
- [x] Throw `ComponentNotFoundError` if the directory does not exist
- [x] Load the four files in parallel via `Promise.all`:
  - [x] `component.html` (UTF-8 string)
  - [x] `style.css` (UTF-8 string, optional → empty string if missing)
  - [x] `script.js` (dynamic `import()` returning `{ default: ComponentScript }`, optional → empty object if missing)
  - [x] `meta.json` (parsed and validated with `zComponentMeta`)
- [x] In-memory cache: `Map<string, Promise<ResolvedComponent>>` keyed by absolute source path
- [x] Export `clearComponentCache()` for the dev server to invalidate after a file change

### Tests

- [x] Loads a complete component from `tests/fixtures/components/Hero/`
- [x] Returns the same instance (referential equality) on a second call (cache hit)
- [x] `clearComponentCache()` forces a re-read
- [x] Throws `ComponentNotFoundError` when `source` does not exist
- [x] Throws when `meta.json` is malformed (delegates to Zod)
- [x] Treats missing `style.css` / `script.js` as optional (empty string / empty hooks)

### Acceptance

- [x] No I/O during cache hits
- [x] Cache is keyed by absolute path, not component name (two schemas can share the same component folder)

---

## Phase 3 — PropResolver

**Deliverable:** `resolveProps(attributes: NamedNodeMap | Record<string, string>, meta: ComponentMeta): ResolvedProps` exported from `src/runtime/prop-resolver.ts`.

### Implementation

- [x] Define `ResolvedProps` type
- [x] Iterate over `meta.props` (the source of truth for known props)
- [x] For each declared prop, look up the attribute value with this precedence (§6 of the docs):
  1. HTML attribute on `<nexo-component>`
  2. Value passed via the schema (if applicable — surfaced by the mount engine)
  3. `meta.props[name].default`
- [x] Type coercion table (§6):
  - [ ] `string` → literal attribute value
  - [ ] `number` → `Number(value)`; fall back to `default` if `NaN`
  - [ ] `boolean` → present attribute or `"true"` → `true`, otherwise `false`
  - [ ] `json` → `JSON.parse(value)`; fall back to `default` on parse error and warn
- [x] If `required: true` and resolved value is `undefined`, `console.warn` with `[Nexo] Missing required prop "x" on <Component>` (do not throw — §6)
- [x] Drop any attribute not declared in `meta.props` (silent — §6)

### Tests

- [x] String, number, boolean, json coercion all work per §6
- [x] Boolean attribute presence without value (`<nexo-component dark>`) resolves to `true`
- [x] Invalid JSON falls back to default and emits a warning (assert via `vi.spyOn(console, 'warn')`)
- [x] Missing required prop emits a warning but does not throw
- [x] Unknown attributes are silently dropped
- [x] HTML attribute beats `default`

### Acceptance

- [x] Pure function — no I/O, no DOM access (accepts a plain record for testability)
- [x] Never throws on user input

---

## Phase 4 — Interpolator

**Deliverable:** `interpolate(template: string, props: ResolvedProps): string` exported from `src/runtime/interpolator.ts`.

### Implementation

- [x] Match `{{ propName }}` with whitespace tolerance (`/\{\{\s*([a-zA-Z_$][\w$]*)\s*\}\}/g`)
- [x] Match `{{ propName | html }}` separately (skip HTML escaping for this variant)
- [x] Default branch: HTML-escape the value (`&`, `<`, `>`, `"`, `'`)
- [x] Missing or `undefined` props → replace with empty string (never `undefined`)
- [x] Serialize non-string values: `number`/`boolean` → `String(value)`, arrays/objects → `JSON.stringify(value)`
- [x] Single pass over the template (no recursive interpolation of inserted values)

### Tests

- [x] `{{ title }}` substitution
- [x] `{{ title | html }}` does not escape
- [x] Missing prop yields empty string
- [x] Special characters (`<script>`) are escaped in default mode
- [x] Numbers and booleans render as strings
- [x] Adjacent placeholders are independent (`{{ a }}{{ b }}`)
- [x] No infinite loop when a prop value contains `{{ ... }}`

### Acceptance

- [x] Function never throws
- [x] Pure (string in, string out)

---

## Phase 5 — AssetInjector

**Deliverable:** `class AssetInjector` exported from `src/runtime/asset-injector.ts` with `injectGlobal(names: AssetName[])` and `injectComponent(assets?: { css?: AssetName[]; js?: AssetName[] })`.

### Implementation

- [x] Define `AssetType`, `AssetDefinition`, `AssetRegistry` types
- [x] Ship a built-in `ASSET_REGISTRY` covering at minimum: `tailwind`, `gsap`, `lucide` (URLs from §7 of the docs)
- [x] Allow the registry to be extended via constructor argument
- [x] Maintain an internal `Set<string>` of already-injected URLs for deduplication
- [x] `injectGlobal(names)` appends `<link>` (CSS first) and `<script>` (JS after) to `document.head`
- [x] `injectComponent(assets)` injects per-component assets respecting the same dedup
- [x] Unknown asset name → `console.warn` and skip (never throw)
- [x] Provide a `reset()` method (used by tests and by dev server full reloads)

### Tests

- [x] Global asset injection appends correct `<link>`/`<script>` to a JSDOM document
- [x] Re-injecting the same asset is a no-op (dedup)
- [x] Unknown asset emits a warning and does not throw
- [x] CSS is injected before JS when both are requested in the same call
- [x] `reset()` clears the dedup set

### Acceptance

- [x] No assumption beyond a global `document` (test with JSDOM)
- [x] Asset URLs match those documented in §7

---

## Phase 6 — MountEngine

**Deliverable:** `class MountEngine` exported from `src/runtime/mount-engine.ts` with `mount(context: MountContext): Promise<void>` and `unmount(element: HTMLElement): void`.

### Implementation

- [x] Define `MountContext` type
- [x] Register `<nexo-component>` once via `customElements.define` (guard against double registration)
- [x] On `connectedCallback`, defer to `NexoRuntime` to drive the full resolve → mount flow
- [x] For each instance:
  - [ ] Create a Shadow Root in `open` mode
  - [ ] Inject `<style>` with `style.css` content
  - [ ] Inject interpolated HTML as `innerHTML` of the shadow root
- [x] Track mounted instances in a `WeakMap<HTMLElement, MountedInstance>` so `unmount` can find the matching lifecycle data
- [x] `unmount(element)` removes listeners and calls into `LifecycleRunner` to fire `destroy`

### Tests

- [x] Mounts a component into a JSDOM element with the correct shadow root structure
- [x] CSS appears scoped to the shadow root (no leakage assertion)
- [x] Mounting twice on the same element replaces the previous content cleanly
- [x] `unmount` clears the shadow root and the WeakMap entry

### Acceptance

- [x] No global state beyond the custom-element registration flag
- [x] Works under JSDOM (used by Vitest)

---

## Phase 7 — LifecycleRunner

**Deliverable:** `class LifecycleRunner` exported from `src/runtime/lifecycle-runner.ts` with `run(hook: 'mounted' | 'destroy', ctx: ComponentContext): Promise<void>` and `observe(element: HTMLElement, onRemove: () => void): void`.

### Implementation

- [x] Define `ComponentContext` type (`element: ShadowRoot`, `props: ResolvedProps`, `emit: (event, data?) => void`)
- [x] Implement an `emit` stub that dispatches a `CustomEvent` on the host element (MVP behavior, full event bus is post-MVP)
- [x] `run('mounted', ctx)` awaits the hook if it returns a Promise and catches errors → `console.error` (do not crash the page)
- [x] `run('destroy', ctx)` mirrors the above
- [x] `observe(element, onRemove)` uses `MutationObserver` on `document.body` (one shared observer) to detect removal of the host element and invoke `onRemove`
- [x] Tear down the shared observer when no instances remain

### Tests

- [x] `mounted` is awaited and resolved before `run` resolves
- [x] An error thrown inside `mounted` is logged and does not propagate
- [x] `destroy` fires when the host element is removed from the DOM
- [x] `emit` dispatches a `CustomEvent` with the provided detail

### Acceptance

- [x] One shared `MutationObserver` for the whole page (not one per component)
- [x] No memory leaks when many components mount and unmount in sequence

---

## Phase 8 — Dev Server

**Deliverable:** `nexo dev` command starts an HTTP + WebSocket server with hot reload.

### Implementation

- [x] `src/dev-server/http-server.ts` — Node `http` server serving static files from project root
- [x] If the request has no extension and `schema.pages[path]` exists, generate the HTML on the fly (using the static exporter machinery without inlining shadow DOM)
- [x] Inject the live-reload `<script>` from §9 only on dev responses
- [x] `src/dev-server/file-watcher.ts` — `chokidar` watching `schema.json` and `components/**/*` (debounced)
- [x] `src/dev-server/ws-server.ts` — `ws` server on `config.port + 1` broadcasting reload messages
- [x] `src/dev-server/hmr-handler.ts` — apply the reload rules table from §9:
  - [ ] `schema.json` changed → `{ type: 'full-reload' }`
  - [ ] `components/X/meta.json` changed → `{ type: 'full-reload' }`
  - [ ] `components/X/{component.html,style.css,script.js}` changed → `{ type: 'component-reload', component: 'X' }` and call `clearComponentCache()` for that path
- [x] Graceful shutdown on `SIGINT`/`SIGTERM`

### Tests

- [x] HTTP server returns generated HTML for a known route in a temp project
- [x] HTTP server returns the right MIME types for static files
- [x] File watcher emits the right HMR message for each row of the §9 table (use `chokidar.watch` with `usePolling: true` in tests)
- [x] WebSocket broadcasts the correct payload
- [x] Live-reload `<script>` is injected in dev responses and absent in build output

### Acceptance

- [x] `nexo dev` boots in under 1s on the `examples/pizza-landing` project
- [x] Editing a component template triggers a component-reload (not a full reload)

---

## Phase 9 — Static Export

**Deliverable:** `nexo build` writes self-contained HTML files to `dist/` using Declarative Shadow DOM.

### Implementation

- [x] `src/exporter/build.ts` — iterate over `schema.pages`
- [x] For each route, resolve and interpolate every component using the runtime modules from phases 1–4
- [x] Emit Declarative Shadow DOM per §10:
  ```html
  <nexo-component name="X" ...attrs>
    <template shadowrootmode="open">
      <style>/* style.css */</style>
      <!-- interpolated component.html -->
    </template>
  </nexo-component>
  ```
- [x] Inject global + per-page assets as `<link>`/`<script>` in `<head>` (CSS before JS)
- [x] Do not inject the dev live-reload script
- [x] Map routes to output files: `/` → `dist/index.html`, `/sobre` → `dist/sobre.html`, nested routes flattened with `-` (document the rule in the file header)
- [x] Copy any local assets under `assets/` to `dist/assets/`
- [x] Pretty-print HTML output and validate it parses without errors

### Tests

- [x] Building the docs example schema produces an `index.html` containing each component's interpolated content
- [x] Output contains `template shadowrootmode="open"` blocks
- [x] No live-reload `<script>` appears in output
- [x] Routes map to expected filenames
- [x] Multi-page schema produces one HTML file per route

### Acceptance

- [x] Output is openable in a modern browser with zero JS and still renders shadow DOM
- [x] Build completes in under 500ms for the example project

---

## Phase 10 — CLI

**Deliverable:** `nexo` binary exposing `init`, `dev`, `build`.

### Implementation

- [x] `src/cli/index.ts` — argv parsing (no external CLI framework needed; small `parseArgs` wrapper is fine)
- [x] `nexo init <name>` — scaffolds the structure shown in §12 of the docs (schema.json, index.html, Hero/, Footer/ with all four files each)
- [x] `nexo dev` — flags `--port` and `--schema` (defaults from §12), wires Phase 8
- [x] `nexo build` — flags `--out` and `--schema` (defaults from §12), wires Phase 9
- [x] `--help` and `--version` text
- [x] Friendly error reporting: `NexoSchemaError`, `ComponentNotFoundError` printed without stack trace; unknown errors printed with stack trace
- [x] Color-coded output (use `node:util.styleText` or zero-dep ANSI helper)
- [x] Exit codes: `0` success, `1` user error (schema/component), `2` internal error

### Tests

- [x] `nexo init tmp-app` creates the expected file tree (snapshot test)
- [x] `nexo dev --port 4000` boots on port 4000
- [x] `nexo build --out custom-dist` writes to `custom-dist/`
- [x] `--help` lists all three commands and their flags
- [x] Unknown command prints help and exits non-zero

### Acceptance

- [x] Binary works after `npm pack` + `npm install -g ./nexo-*.tgz`
- [x] End-to-end smoke test passes: `nexo init demo && cd demo && nexo build`

---

## Definition of Done (global)

- [x] Every interface from `docs/DOCUMENTATION.MD` §11 is exported from `src/types/` and re-exported from the package entry
- [x] Every architectural decision from §14 is respected:
  - [ ] Single `schema.json` as source of truth
  - [ ] Props limited to `type + default + required`
  - [ ] Props passed via HTML attributes
  - [ ] No SSR; dev server + static export only
  - [ ] Pages as ordered arrays in the schema
  - [ ] Shadow DOM for isolation
  - [ ] No virtual DOM, no reconciliation
  - [ ] Declarative Shadow DOM in the static export
  - [ ] TypeScript throughout
  - [ ] Zod for schema validation
- [x] `examples/pizza-landing/` mirrors §3 and `nexo build` on it produces working HTML
- [x] End-to-end smoke test in CI: `nexo init` → edit a component → `nexo build` → assert HTML contains the expected text
- [x] `npm run lint && npm run typecheck && npm test && npm run build` is green on `main`
- [x] `README.md` shows install, init, dev, build in under one screenful
