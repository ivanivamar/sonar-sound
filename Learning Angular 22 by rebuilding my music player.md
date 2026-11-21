# Learning Angular 22 by rebuilding my music player

Nov 17, 2026 · @Ivan

The goal is a player you wrote and understand yourself, built stage by stage. Each stage ends with something you can actually use, and each one teaches one topic. The new app rebuilds every feature of Material Music, not only the ones that teach something new: when it is done, the old app retires, and every feature has a home in code you wrote, so you know where to go to change or add something.

## How to use this roadmap

**The rules**

- **The old app stays in use.** Keep using Material Music every day. Switch only when the new app does everything the old one does (Feature map and Switching over, at the end).
- **Same backend, new frontend.** Reuse the same Google Drive folders, `library.json` and covers. That way you are learning the frontend and you don't have to redesign your data too.
- **You write the code.** Claude explains, reviews and debugs. Claude doesn't write features unless you ask for that on purpose.
- **Read the old code, don't copy it.** The old React app is a working reference for the hard parts (Drive, FLAC parsing, gapless). Read it, close it, then write your own version.
- **Ugly first, pretty later.** Get each feature working with plain styling. Animations get their own stages (7–9).
- **Desktop and phone together.** From Stage 3 on, build each page for both sizes at once (sidebar on desktop, bottom bar and sheets on phone). Retrofitting a phone layout onto finished pages later is much more work.

**Each stage has:**

- **You build**: the feature for your app.
- **You learn**: the concepts it teaches.
- **Done when**: a test you can check yourself.
- **Stretch**: an optional harder version.

There are no deadlines. One stage can take a weekend or a month. Tick off each stage when its "done when" test passes.

## Stage 0 — Setup

- [x] **You build:** an empty Angular 22 app that runs, in a new git repo (for example `D:\pelagic-ng`), kept separate from the old app.

**You learn:**

- Node 22+ and TypeScript 6. Angular 22 needs both and no longer supports Node 20.
- `ng new`: standalone components, zoneless change detection (the default now), SCSS or CSS, and the Vite-based dev server.
- The project layout: `src/app`, `app.config.ts` (providers), `app.routes.ts`, and `angular.json`.
- The Angular CLI: `ng generate component`, `ng serve`, `ng build`.
- Git basics if you're rusty: commit after every working step.

**Done when:** `ng serve` shows your own "Hello" page, and the first commit is pushed.

**Stretch:** set up ESLint and Prettier, and turn on `strict` mode in the TypeScript config.

**Suggested folder structure (grows over time):**

```
src/app/
  core/       services: auth, drive, library, player
  shared/     small reusable components (buttons, cover image)
  features/   one folder per page: library, album, artist, player, upload
```

## Part 1 — Foundations

### Stage 1 — Components, signals and routing (with fake data)

- [x] **You build:** a Library page showing a grid of albums from a hard-coded JSON file. Clicking an album opens `/album/:id` with its track list.

**You learn:**

- Components, templates, `input()` and `output()`.
- Signals: `signal()`, `computed()`, `effect()`. These replace React's `useState`, `useMemo` and `useEffect`.
- The control flow syntax: `@if`, `@for (track ...)`, `@switch`, `@defer`.
- Routing: `provideRouter`, route params read with `input()` (`withComponentInputBinding`), and lazy routes with `loadComponent`.

**Done when:** you can click from the grid to an album page and back, and the browser's back button works.

**Stretch:** add a search box that filters albums with a `computed()` signal.

### Stage 2 — Google sign-in and Drive

- [x] **You build:** "Sign in with Google", then load your real `library.json` from Drive in place of the fake data.

**You learn:**

- Services and dependency injection: `@Injectable({providedIn: 'root'})` and `inject()`.
- OAuth with Google Identity Services: access tokens, scopes, and what happens when a token expires.
- `HttpClient` and interceptors. An interceptor adds the `Authorization` header to every request.
- `httpResource()` / `resource()`: signal-based loading with built-in loading and error states.
- Keeping secrets out of the code: you'll use environment files for the client ID.

**Done when:** after a reload you are still signed in, and the grid shows your real library.

**Stretch:** cache `library.json` in IndexedDB and only download it again when Drive reports a new `version`. The old app already does this, so you have a reference.

**Reference in the old app:** `lib/drive.ts`, `state/library.ts`.

### Stage 3 — Real pages: album, artist, covers

- [x] **You build:** album and artist pages with real covers from Drive, plus a list of all songs.

**You learn:**

- Loading images that need a sign-in: `fetch` returns a blob, and you show it with `URL.createObjectURL`. Then you cache covers.
- `@defer (on viewport)` and lazy loading, so you don't fetch 500 covers at once.
- Virtual scrolling with the CDK's `cdk-virtual-scroll-viewport`, for the long songs list.

**Done when:** scrolling the full songs list feels smooth, and covers appear as you scroll.

**Also rebuild here:** the app shell (sidebar with playlists and account menu, sticky top bar with its search, the atmosphere background), the library tabs (All, Albums, Artists, Tracks; Playlists comes in 5d) with sort and filter chips, the artist page with its discography by release type, and global search: Ctrl K, recent searches, a dropdown that jumps to results, and a full results page. Old code: `shell/`, `pages/library/`, `pages/search/`, `state/search.ts`.

## Part 2 — Audio engines

After Stage 4 the new app is already a usable player, which is a good moment to stop and enjoy it.

### Stage 4 — Play a track

- [ ] **You build:** a `PlayerService` that holds one `<audio>` element and plays a FLAC streamed from Drive. Add a mini-player bar with play/pause, a seek slider and the time.

**You learn:**

- `HTMLAudioElement`: `src`, `play()` (it returns a promise), and the events `timeupdate`, `ended`, `waiting` and `error`.
- Why you should have one player service shared by the whole app, not an audio element per component.
- Keeping state in signals: `current`, `isPlaying`, `position`, `duration`.
- Performance: `position` changes about 4 times a second. Only the parts of the page that read it should update. In the old app every page re-rendered, which signals avoid by design. Check it with Angular DevTools.
- The Media Session API, which gives you lock-screen and keyboard media keys, artwork and the track title.

**Done when:** you can play any track, seek in it, and use the media keys on your keyboard.

**Also rebuild here:** the full-screen Now Playing view (big cover, title, controls, quality badge, open and close from the mini-player), and play counting: a play is 30 s actually heard, or half a track shorter than a minute, and seeking doesn't count. Keep the plays in memory for now; 5d stores them. Old code: `nowplaying/NowPlaying.tsx`, `nowplaying/parts.tsx`, `player/playTracker.ts`.

### Stage 5 — Queue, shuffle, repeat

- [ ] **You build:** a queue: play an album from a track, next/previous, shuffle, repeat all or one. The queue survives a reload, and you can drag to reorder it.

**You learn:**

- Designing state: the queue array, the current index, and the unshuffled copy. Write it as plain functions with no Angular in them, and unit-test those.
- Unit tests with Vitest (the default test runner in recent Angular).
- Saving to localStorage with the position stored on its own, so you don't rewrite the queue every second. The old app had exactly this bug.
- Drag and drop with the CDK (`cdkDropList`).

**Done when:** you can reload in the middle of a song and come back to the same queue and position, and the tests pass.

**Also rebuild here:** the queue panel (desktop side panel, phone sheet) with drag on any row and the reorder tray, and the settings page for player options. Old code: `nowplaying/QueuePanel.tsx`, `pages/settings/`, `state/settings.ts`.

### Stage 5c — Actions and overlays

- [ ] **You build:** the actions on songs, albums and artists, and the overlays they open: a right-click and ⋯ menu on desktop, an action sheet on phone, dialogs and toasts (with Undo). First actions: Play next, Add to queue, Go to album, Go to artist.

**You learn:**

- CDK Overlay: positioning a menu next to its button, flipping when there's no room, closing on outside click and Escape.
- CDK Dialog and focus handling: focus trap, returning focus to the button, `aria` roles for menus.
- One action service that every page calls, so each action is written once.
- A toast service with a queue, timeouts and an Undo callback.

**Done when:** right-clicking a song anywhere gives the same menu, Play next works from it, and a toast confirms it with Undo.

**Reference in the old app:** `actions/ActionHost.tsx`, `actions/actions.ts`, `components/ui/Menu.tsx`, `Sheet.tsx`, `Dialog.tsx`, `Toast.tsx`.

### Stage 5b — Move the library to Firestore

- [ ] **You build:** the library metadata moves from `library.json` into Firestore. The music files (about 80 GB) stay on Drive. Each track stores its Drive file IDs (`flacId`, `opusId`), and the player keeps streaming from Drive.

**You learn:**

- Data modelling in Firestore. Use `artists/{id}` and `albums/{id}`, with the tracks stored inside each album document. That makes loading the library about one read per album, which keeps you inside the 50K reads/day free quota.
- The modular Firebase SDK in Angular: `@angular/fire` or plain `firebase/firestore` in a service. `onSnapshot` gives you a real-time listener, which you turn into a signal (`toSignal`, or by setting a `signal()` yourself).
- Offline persistence (`persistentLocalCache`), so the app opens from the cache.
- Security rules: only your account can read and write.
- A one-time migration script (Node + Admin SDK) that reads `library.json` and writes the documents in batches.

**Done when:** the new app loads the library from Firestore, and a change made in the Firebase console appears in the open app without a reload.

**Stretch:** change the old importer (`npm run import`) to write to Firestore instead of the JSON. Move the covers to Cloud Storage so they become plain `<img src>` URLs.

**Knock-on effect:** in Stage 12, uploads become a single album document write. The "re-read, merge, check version, write" step on `library.json` goes away.

### Stage 5d — Your data: likes, playlists, history

- [ ] **You build:** liked songs (the heart and its lilac ping), playlists (create, rename, cover, add and remove songs, reorder), smart playlists that update themselves from rules, and the play history: the plays counted since Stage 4, stored per month and shared between PC and phone. Plus the library edits: change an album's genres, remove an album. The library's Playlists tab and the add-to-playlist action from 5c land here.

**You learn:**

- Firestore writes that never conflict between devices: append-only history rows merged by key, `arrayUnion`.
- Optimistic updates: change the signal at once, write in the background, roll back on error.
- A small rules engine for smart playlists, written as pure functions you can test with Vitest.
- Derived data with `computed`: play counts per track, "last played", most played artists.

**Done when:** a song you like on the phone shows as liked on the PC, a smart playlist fills itself, and a track's play count goes up after you listen to it.

**Reference in the old app:** `state/likes.ts`, `state/playlists.ts`, `state/smart.ts`, `state/history.ts`, `actions/SmartDialog.tsx`, `actions/GenreDialog.tsx`, `state/removal.ts`.

### Stage 5e — Home and mixes

- [ ] **You build:** the Home page and the mixes built from your own library and history: Jump back in, Recently added, Made for you (daily mixes with their generated covers), Radio for you, Your artists, Smart playlists, Rediscover.

**You learn:**

- Seeded randomness, so both devices get the same mixes on the same day.
- Turning history into rankings over time windows (last 90 days, not played in a while).
- Drawing generated cover art with SVG or canvas.
- Different subtitles per shelf on the same album card (content projection).

**Done when:** Home looks like the old app's, and the PC and phone show the same daily mixes.

**Reference in the old app:** `pages/Home.tsx`, `pages/home/`, `lib/mixing.ts`, `lib/daymix.ts`, `state/mixes.ts`, `state/radio.ts`, `state/recent.ts`.

### Stage 6 — Gapless, crossfade and Web Audio

- [ ] **You build:** gapless playback with two decks, so a live album plays with no gaps between tracks. Then try an optional crossfade, and a small visualizer or EQ.

**You learn:**

- Preloading the next track and switching between the two decks just before the current one ends.
- The Web Audio API graph: `AudioContext`, `MediaElementAudioSourceNode` → `GainNode` / `BiquadFilterNode` → `destination`.
- `AnalyserNode` with a `<canvas>` and `requestAnimationFrame` for a spectrum visualizer.
- Autoplay rules: why an `AudioContext` has to start after the user taps something.
- Engine abstraction: a `PlayerEngine` interface, so Android can use ExoPlayer later (Stage 13).

**Done when:** a continuous live album plays with no audible gap between tracks.

**Reference in the old app:** `player/htmlEngine.ts` (the two-deck logic, about 60 ms lead time).

**Stretch:** ReplayGain / loudness normalization from the FLAC tags, using a `GainNode`.

## Part 3 — Animations and transitions

There are four tools, from simplest to most powerful. Use the simplest one that does the job. Most of the polish in a player app is CSS.

| Tool                                                            | Use it for                                                                           | Controlled from                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| CSS transitions / keyframes + `animate.enter` / `animate.leave` | hover, press, toasts, sheets, list items appearing or leaving                        | CSS classes                                      |
| View Transitions API                                            | page-to-page changes, a cover "morphing" into the player                             | the browser takes a snapshot of before and after |
| Web Animations API (`element.animate()`)                        | animations driven by code (drag release, progress) that you need to pause or reverse | TypeScript                                       |
| GSAP                                                            | timelines, scroll-linked effects, complex choreography                               | TypeScript (a library)                           |

### Stage 7 — CSS and enter/leave

- [ ] **You build:** a toast system, a bottom sheet for the song menu, a queue panel that slides in, and list items that fade and slide when added or removed.

**You learn:**

- `transition`, `@keyframes`, easing curves (`cubic-bezier`, `linear()` for springs), and which properties are cheap to animate (`transform`, `opacity`) versus costly (`height`, `top`).
- `animate.enter="class"` / `animate.leave="class"`: Angular adds the class and waits for the animation to finish before removing the element. The old `@angular/animations` package is deprecated, so skip it.
- `@starting-style` and `transition-behavior: allow-discrete`, so you can animate from `display: none`.
- Staggering a list with `animation-delay: calc(var(--i) * 30ms)`.
- `prefers-reduced-motion`: respect it from day one.

**Done when:** opening and closing the queue panel is smooth, and toasts slide out instead of vanishing.

### Stage 8 — Page transitions

- [ ] **You build:** cross-fades between pages, and an album cover in the grid that grows into the album page header.

**You learn:**

- `withViewTransitions()` in `provideRouter`: one line, and every navigation gets a transition.
- `view-transition-name`: give the cover the same name on both pages, and the browser morphs it.
- Styling `::view-transition-old()` / `::view-transition-new()`, and `onViewTransitionCreated` to skip or customize transitions per route.
- `document.startViewTransition()` by hand, for changes that are not navigations (for example opening the full player).

**Done when:** clicking an album makes its cover fly into the header, and going back reverses it.

### Stage 9 — Code-driven motion and GSAP

- [ ] **You build:** a swipe-down-to-close full player that follows your finger and springs back. Then rebuild one GSAP effect from the old app, such as the scroll-collapsing header or the cover flight into lyrics.

**You learn:**

- Pointer events (`pointerdown`/`move`/`up`, `setPointerCapture`), and turning finger velocity into a spring.
- `element.animate()`, `Animation.finished`, `playbackRate`, and `commitStyles()`.
- GSAP in Angular: create animations inside `afterNextRender()`, and clean them up with `DestroyRef` / `gsap.context().revert()`. Run them outside change detection.
- ScrollTrigger and `Flip` (GSAP's version of the cover morph). Compare it with what View Transitions gave you in Stage 8.
- Scroll-driven CSS animations (`animation-timeline: scroll()`): you may not need GSAP for the header at all.

**Done when:** you can explain why you'd pick each of the four tools for a given effect.

**Reference in the old app:** the GSAP docs in this project (`material-music-gsap-*`).

**Also rebuild here:** the cover swipe in Now Playing (swipe for next and previous), dragging sheets on phone, the press ripple, and the collapsing headers on album, artist and playlist pages.

### Stage 9b — Lyrics

- [ ] **You build:** lyrics in Now Playing: synced lines that follow the song and scroll by themselves, plain lyrics when there are no timings, fetching missing lyrics, romaji for Japanese and romanization for Korean, and the phone lyrics sheet.

**You learn:**

- Parsing LRC into timed lines, and finding the current line from `currentTime` with a `computed`.
- Smooth auto-scroll that pauses while you scroll yourself.
- Loading a heavy library (the romaji converter) only when it's needed, with a dynamic `import()`.

**Done when:** a Japanese song shows synced lyrics with romaji under each line, and clicking a line seeks to it.

**Reference in the old app:** `nowplaying/Lyrics.tsx`, `lib/lrc.ts`, `lib/lyricsFetch.ts`, `lib/romaji.ts`, `lib/hangul.ts`.

## Part 4 — Downloads, offline and uploads

### Stage 10 — Downloads with progress

- [ ] **You build:** a "Download album" button that saves the files for offline play, with a progress bar per track, a total, and a cancel button.

**You learn:**

- Streaming with `fetch`: `response.body.getReader()`, counting bytes against `Content-Length`, and `AbortController` to cancel.
- `HttpClient` with `reportProgress: true` / `observe: 'events'`, as the Angular alternative. Compare it with `fetch`.
- Where to store big files: OPFS (`navigator.storage.getDirectory()`) versus IndexedDB blobs. Also `navigator.storage.persist()` and `estimate()`.
- A download queue: two at a time, retries, and resuming with `Range` requests.
- Playing from storage: the player picks the local file first, then streams from Drive.

**Done when:** in airplane mode, a downloaded album plays fully.

**Also rebuild here:** the Downloads page, the offline toggle on albums and playlists, the library's offline filter, and the offline badge on cards. Old code: `pages/downloads/`, `state/downloads.ts`, `pages/library/OfflineToggle.tsx`.

### Stage 11 — Offline app shell (service worker)

- [ ] **You build:** the app opens with no network, can be installed as a PWA, and shows a "New version — reload" toast.

**You learn:**

- `ng add @angular/pwa`: `ngsw-config.json`, asset groups and data groups.
- `SwUpdate`: `versionUpdates` and `activateUpdate()`. This is how the update toast works.
- Cache strategies (freshness versus performance), and why the audio files go in OPFS rather than the service worker cache.

**Done when:** you can kill the network, reload, and the app and your downloads still work.

### Stage 11b — Sync between devices

- [ ] **You build:** what the old app does between PC and phone: each device sees what the other is playing, can take over the playback where it stopped, or control the other one remotely (the devices button). Settings sync too.

**You learn:**

- Live Firestore documents as signals: `onSnapshot` in, small writes out, no write loops.
- Presence: knowing which devices are online, with a heartbeat and a timeout.
- Who owns the playback when two devices both think they do.

**Done when:** you pause on the phone, open the PC, and continue the same song at the same second.

**Reference in the old app:** `sync/playerSync.ts`, `sync/DevicesButton.tsx`, `sync/settingsSync.ts`, `sync/cloud.ts`.

### Stage 12 — Uploads to Drive

- [ ] **You build:** the Upload page: drop FLAC files or folders, read their tags, group them by album, review, then upload them to the right Drive folders and update `library.json`.

**You learn (in this order; each is a mini-project):**

1. Choosing files: drag and drop with `DataTransferItem.webkitGetAsEntry()` for folders, plus `<input webkitdirectory>`.
2. Reading binary files: `File.arrayBuffer()`, `DataView`, and parsing FLAC STREAMINFO, Vorbis comments and the embedded picture yourself. It's a good exercise in byte-level work.
3. Drive uploads: simple versus multipart versus **resumable sessions**. Use XHR `upload.onprogress` (`fetch` still has no upload progress), resume from the reported `Range` after errors, and refresh the token on 401.
4. Concurrency: two uploads at a time, with cancel and retry for each one.
5. Safe catalogue updates: re-read `library.json`, merge, check the Drive `version` again, then write. It's optimistic concurrency.
6. Stretch: encode Opus in the browser with WebCodecs `AudioEncoder`, run in a **Web Worker** so the UI doesn't freeze.

**Done when:** you upload a real album, it shows up in the library without a reload, and the old app sees it too.

**Reference in the old app:** `src/upload/flac.ts`, `opus.ts`, `driveWrite.ts`, and the project doc `pelagic-step10-upload.md`.

**Also rebuild here:** the upload inspector (fix tags before writing), upload issues, and artist images. Old code: `pages/upload/Inspector.tsx`, `state/uploadIssues.ts`, `upload/artistImages.ts`.

## Part 5 — Android, quality and switching over

### Stage 13 — Android with Capacitor

- [ ] **You build:** an APK of the new app that plays with the screen off and shows notification controls.

**You learn:**

- Capacitor: `npx cap add android`, `cap sync`, and how the web app runs inside a WebView.
- Why background audio needs a native player. You can reuse the old app's ExoPlayer plugin behind the same `PlayerEngine` interface from Stage 6, or write a small one yourself to learn the Java/Kotlin bridge.
- Safe areas, the back button, and status bar colours.

**Done when:** music keeps playing with the phone locked, and you can skip tracks from the notification.

**Also rebuild here:** the home-screen widget, release notifications, the Android back button, and in-app APK updates. Old code: `native/widget.ts`, `native/releaseNotify.ts`, `native/backButton.ts`, `native/updates.ts`, and `pelagic-java/`.

### Stage 14 — Quality and deploy

- [ ] **You build:** an error boundary (Angular's `ErrorHandler`), a few tests for each service, and CI that runs lint, tests and build before deploying to Firebase Hosting.

**You learn:** GitHub Actions, `ng build` budgets, bundle analysis, and a Content Security Policy.

This also fixes the high-priority items from the November code audit in the new app.

## Part 6 — The rest of Material Music

These are the features beyond daily playback. Each one is its own stage, in any order, and each still teaches something. The old app retires after the last one.

### Stage 15 — DJ

- [ ] **You build:** the DJ: an endless chain of themed sessions, a spoken intro before each one, the sonar animation that follows the voice, the DJ panel and its start screen.

**You learn:** a larger pure-TypeScript engine with Vitest tests, calling your Firebase function for the voice, caching audio in IndexedDB, and an analyser node driving an animation.

**Reference in the old app:** `dj/`, `state/dj.ts`, `firebase/` (the voice function).

### Stage 16 — Stats and yearly recap

- [ ] **You build:** the Stats page (top artists, albums, songs and genres by year and month) and the yearly recap shelf with its share image.

**You learn:** grouping and ranking history data, drawing charts, and rendering an image on a canvas to share.

**Reference in the old app:** `pages/stats/`, `state/stats.ts`, `lib/artStats.ts`.

### Stage 17 — New releases and Discovery

- [ ] **You build:** new releases from the artists in your library, with previews, the release panel, the Home shelf, and Discovery for related artists.

**You learn:** calling outside APIs (Deezer, MusicBrainz) through your Firebase functions, rate limits, caching responses, and playing previews through the same player.

**Reference in the old app:** `pages/releases/`, `state/releases.ts`, `state/discovery.ts`, `state/previews.ts`, `lib/deezer.ts`, `lib/musicbrainz.ts`.

### Stage 18 — Artist extras and concerts

- [ ] **You build:** the artist page extras (bio, photos, related artists) and the Concerts page with On tour.

**You learn:** combining several sources into one view, and dates and time zones for events.

**Reference in the old app:** `pages/library/ArtistExtras.tsx`, `state/artistExtras.ts`, `pages/concerts/`, `state/concerts.ts`.

### Stage 19 — Library health

- [ ] **You build:** the Health page: checks on your library (missing covers, lyrics or files, wrong tags) with fixes.

**You learn:** long-running checks that report progress without freezing the page, and batch fixes written back to Firestore.

**Reference in the old app:** `pages/health/`, `state/health.ts`.

### Switching over

Move to the new app as your daily player once it covers the basics (library, queue, gapless, downloads, Android), and keep the old app around for the rest. The old app retires when every row of the Feature map below is done. From then on, a change or a new feature goes into the new code, in the place the Feature map points to.

## Feature map

Every feature of Material Music, where it lives in the old code, and the stage that rebuilds it. When a row is done in the new app, note where its code went, so later changes start from here.

| Feature                                               | Old code                                                               | Stage |
| ----------------------------------------------------- | ---------------------------------------------------------------------- | ----- |
| Sign-in, Drive access, library loading                | `state/session.ts`, `lib/drive.ts`, `state/library.ts`                 | 2     |
| App shell: sidebar, top bar, account menu, atmosphere | `shell/`, `pages/AccountMenu.tsx`, `components/Atmosphere.tsx`         | 3     |
| Library tabs, sort and filter                         | `pages/library/Library.tsx`, `libgrid.tsx`                             | 3     |
| Album page                                            | `pages/library/AlbumPage.tsx`                                          | 1, 3  |
| Artist page and discography                           | `pages/library/ArtistPage.tsx`                                         | 3     |
| Authed covers                                         | `lib/covers.ts`                                                        | 3     |
| All songs list (virtual scroll)                       | `pages/library/SongsList.tsx`                                          | 3     |
| Global search (Ctrl K)                                | `pages/search/`, `state/search.ts`                                     | 3     |
| Player, mini-player, Media Session                    | `state/player.ts`, `shell/PlayerBar.tsx`                               | 4     |
| Now Playing full screen                               | `nowplaying/NowPlaying.tsx`, `parts.tsx`                               | 4     |
| Play counting                                         | `player/playTracker.ts`                                                | 4     |
| Queue, shuffle, repeat, queue panel                   | `state/player.ts`, `nowplaying/QueuePanel.tsx`                         | 5     |
| Settings                                              | `pages/settings/`, `state/settings.ts`                                 | 5     |
| Menus, action sheets, dialogs, toasts                 | `actions/`, `components/ui/`                                           | 5c    |
| Library metadata in Firestore                         | `sync/firebase.ts`, `sync/cloud.ts`                                    | 5b    |
| Liked songs                                           | `state/likes.ts`, `components/LikeButton.tsx`                          | 5d    |
| Playlists and smart playlists                         | `state/playlists.ts`, `state/smart.ts`, `pages/playlists/`             | 5d    |
| Play history                                          | `state/history.ts`                                                     | 5d    |
| Genre editing, album removal                          | `actions/GenreDialog.tsx`, `state/removal.ts`, `state/genres.ts`       | 5d    |
| Home shelves, daily mixes, radio                      | `pages/Home.tsx`, `pages/home/`, `lib/mixing.ts`, `lib/daymix.ts`      | 5e    |
| Gapless two-deck engine                               | `player/htmlEngine.ts`                                                 | 6     |
| Motion, transitions, gestures                         | `design/ripple.ts`, `nowplaying/coverFlight.ts`, `nowplaying/swipe.ts` | 7–9   |
| Lyrics, romaji                                        | `nowplaying/Lyrics.tsx`, `lib/lrc.ts`, `lib/romaji.ts`                 | 9b    |
| Downloads and offline                                 | `state/downloads.ts`, `pages/downloads/`                               | 10    |
| PWA and update toast                                  | `lib/pwa.ts`                                                           | 11    |
| Sync between devices                                  | `sync/playerSync.ts`, `sync/DevicesButton.tsx`                         | 11b   |
| Upload                                                | `upload/`, `pages/upload/`, `state/upload.ts`                          | 12    |
| Android app, widget, notifications, updates           | `native/`, `player/nativeEngine.ts`, `pelagic-java/`                   | 13    |
| Error handling, tests, CI, deploy                     | `components/ErrorBoundary.tsx`, `.github/`                             | 14    |
| DJ                                                    | `dj/`, `state/dj.ts`                                                   | 15    |
| Stats and yearly recap                                | `pages/stats/`, `state/stats.ts`                                       | 16    |
| New releases and Discovery                            | `pages/releases/`, `state/releases.ts`, `state/discovery.ts`           | 17    |
| Artist extras, concerts                               | `pages/library/ArtistExtras.tsx`, `pages/concerts/`                    | 18    |
| Library health                                        | `pages/health/`, `state/health.ts`                                     | 19    |

## Resources and getting help

**Read along:**

- [angular.dev](https://angular.dev): the official tutorial, then the guides for Signals, Routing, Enter and leave animations, Route transition animations, and Service workers.
- [MDN](https://developer.mozilla.org): the guides for the Web Audio API, View Transitions, OPFS, Streams, and WebCodecs.
- [GSAP docs](https://gsap.com/docs): ScrollTrigger, Flip, and `gsap.context`.
- [Google Drive API: resumable upload](https://developers.google.com/drive/api/guides/manage-uploads).

**How to ask Claude, depending on how much help you want:**

| You want                    | Ask like this                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------- |
| To understand a concept     | "Explain View Transitions like I'm new to it, with a tiny example that isn't my app." |
| A hint, not the answer      | "My `animate.leave` doesn't run. Give me a hint, not the fix."                        |
| A code review               | "Review `player.service.ts`: what would a senior Angular dev change, and why?"        |
| Debugging help              | "Here's the error and the code. Walk me through how to find the cause."               |
| To compare with the old app | "How did the old app do gapless? Explain the idea, don't paste the code."             |
| Practice                    | "Give me 3 small exercises on signals before I start Stage 4."                        |

At the end of each stage, ask for a quick review of what you built. That's the best way to catch habits early.
