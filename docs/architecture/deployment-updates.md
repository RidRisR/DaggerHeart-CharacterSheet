# Deployment Updates

## Session Policy

- Publishing a release must not initiate a reload or broadcast navigation to open tabs.
- New document visits and user-initiated reloads may load the latest release.
- Use the existing `pnpm build` / `out` deployment and the hosting platform's default cache behavior. No asset inheritance or deployment initialization variables are required.
- Already-loaded code can continue running. An open page may fail to load an additional module after a release removes its old asset URL. Accept this boundary instead of forcing a reload; users can reopen after saving.
- Deployment updates must not clear browser storage or overwrite in-memory character state.

## Legacy Service Worker Retirement

The previously published `/sw.js` broadcast `CHUNK_LOAD_ERROR`, causing clients to reload without waiting for autosave. Keep that URL available as a retirement worker and register it through `ServiceWorkerLifecycle` using the configured base path.

This compatibility path applies to browsers with an existing worker installation. It protects ongoing editing by replacing the old worker, claiming its clients, and unregistering without messages, navigation, fetch interception, or storage cleanup. Immediate activation is intentional for retirement only; it does not replace page JavaScript. Registration failures are reported to the console and do not trigger recovery navigation.

Coverage: `tests/unit/service-worker-retirement.test.ts` and `components/__tests__/service-worker-lifecycle.test.tsx` verify retirement, request pass-through, base paths, and ignored legacy reload messages.

Remove the registration component only when legacy registrations no longer need active retirement. Keep the published worker URL available for returning browsers. Already-open pages from releases containing the old global error handlers retain those handlers until their next document load.
