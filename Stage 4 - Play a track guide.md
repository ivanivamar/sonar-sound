# Stage 4 — Play a track: detailed guide

Split Stage 4 into **eight small milestones**, each ending with something you can test. You write the code; these are the steps and decisions to guide you.

## Before you start: what you already have

- [library-file.model.ts](./src/app/core/library/library-file.model.ts) defines `TrackFile`: its `flac.id` identifies the Drive file, and `flac.size`, `sampleRate`, and `bitDepth` can help with streaming and the quality badge.
- [player.html](./src/app/shared/media/player/player.html) already has a placeholder in the app shell. That is a good place for the mini-player.
- [track-card.html](./src/app/shared/media/track-card/track-card.html) is used for track rows. It needs a proper play control.
- [cover.ts](./src/app/shared/media/cover/cover.ts) and [duration-pipe.ts](./src/app/shared/pipes/duration-pipe.ts) can be reused.

**Important:** a private Drive file cannot simply be assigned to `audio.src`. The browser's audio requests do not pass through your Angular [auth.interceptor.ts](./src/app/core/auth/auth.interceptor.ts). First get playback working with a downloaded blob, then replace that with actual streaming.

## 1. Create the shared player service

Create a player service under `src/app/core/player`. Give it **one** `HTMLAudioElement`, for example `new Audio()`, and expose read-only signals:

| Signal | Meaning |
|---|---|
| `current` | Selected track, or `null` |
| `isPlaying` | Whether audio is actually playing |
| `position` | Current position in seconds |
| `duration` | Known duration in seconds, or unknown |
| `isBuffering` | Waiting for audio data |
| `error` | A message the UI can show |

Add methods such as `playTrack(track)`, `play()`, `pause()`, `toggle()` and `seek(seconds)`. Keep the audio element private: components should issue commands, not manipulate it directly.

**Why one service?** The service outlives individual pages. Navigating away from an album must not stop playback or create a second audio element.

**Check:** inject the service into two components and confirm both see the same selected track.

## 2. Make one track play — temporary blob approach

Start with the existing [DriveService](./src/app/core/drive/drive.service.ts):

1. When a track is selected, download `track.flac.id` with `downloadBlob()`.
2. Turn the resulting blob into an object URL using `URL.createObjectURL`.
3. Assign that URL to the audio element and call `play()`.
4. Await or handle the `play()` promise: browsers can reject it, especially after an asynchronous download. Show an actionable error or a play button to retry.
5. On replacement or sign-out, stop playback and revoke the old object URL.

Also handle **fast track switching**: if track A's download finishes after the user has selected track B, A must not start playing. Use a request/version identifier or cancellation.

This is **not streaming**: the whole FLAC downloads before playback. It is just a useful first milestone.

**Check:** select a track, hear it, switch tracks quickly, navigate to another page, then sign out. Only the latest selection should play, and sign-out should stop it.

## 3. Connect the audio events to signals

Let the audio element tell the service what actually happened:

- `playing`: playback has started or resumed; clear buffering.
- `pause`: update `isPlaying`.
- `waiting`: show buffering.
- `timeupdate`: update `position`.
- `loadedmetadata` / `durationchange`: update `duration` when it is finite.
- `ended`: stop showing the playing state.
- `error`: expose a useful playback error.

Don't assume `play()` succeeded just because it was called. Similarly, duration can initially be `NaN`; disable seeking until you have a usable duration.

**Check:** pause and resume, wait for a track to end, and try an unavailable file. The signals and visible UI should match what you hear.

## 4. Make tracks playable and build the mini-player

Add an explicit, keyboard-accessible play button to [track-card.html](./src/app/shared/media/track-card/track-card.html). Keep the existing artist and album links independently clickable.

Use the existing [Player component](./src/app/shared/media/player/player.ts) for the bar:

1. Show cover, title and artist for `current`.
2. Add a named play/pause button.
3. Add a native `<input type="range">` for seeking, with an accessible label and readable time value.
4. Show current time and duration using the existing duration pipe.
5. Show loading and error states; don't leave the user wondering why nothing plays.

Test on both desktop and phone. Make sure the bar doesn't cover the bottom of scrollable page content.

**Check:** play from the album page and Tracks tab; use keyboard Tab, Enter/Space and arrow keys to operate the controls.

## 5. Replace the blob with real Drive streaming

This is the trickiest part of the stage. Your old app solves it with a **service-worker proxy**:

- [driveStream.ts](../material-music/app/src/lib/driveStream.ts) registers the worker and connects it to the page.
- [sw.js](../material-music/app/public/sw.js) intercepts a same-origin audio URL, asks the page for a token, and requests the Drive file with an authorization header.

Build a small version of that mechanism:

1. Register a service worker and wait until it **controls the page**, not merely until registration succeeds. Service workers require a secure context; localhost works for development.
2. Give the audio element a same-origin URL identifying the Drive file, without putting the OAuth token in the URL.
3. Intercept that URL in the worker. Obtain a current token from the relevant page using `MessageChannel`; do not persist or log it.
4. Fetch Drive's `alt=media` endpoint with the bearer header. Forward the browser's `Range` request so seeking does not require the entire file.
5. Return the response body and correct status and range headers. Pay particular attention to `200`, `206`, invalid ranges, missing tokens and upstream errors. Don't claim a byte range that wasn't actually returned.
6. Surface worker, network and authentication failures in the player. On sign-out or expiry, stop playback and clear player state.

Read the old worker for ideas, but don't bring over its unrelated offline caching. The old app also uses a full-download fallback when the worker isn't available; if you keep that fallback, **make its full-download behavior clear** rather than treating it as streaming.

**Check:** in browser Network tools, play a large FLAC and seek well ahead. Confirm playback starts before the full download and that a range request returns a valid partial response. Also test expired authentication and worker-unavailable behavior.

## 6. Add Media Session controls

The shared [PlayerService](./src/app/core/player/player.service.ts) owns playback; [MediaSessionService](./src/app/core/player/media-session.service.ts) manages OS media controls and receives playback callbacks from it.

When the current track changes, set Media Session metadata: title, artist, album and, when available, artwork. The cover service already resolves Drive covers; verify that your target browser and OS can use the chosen artwork URL.

Register supported handlers for:

- `play` and `pause`
- `seekto`, and optionally `seekbackward` / `seekforward`

Each handler should call the **same service methods** as the UI. Update Media Session playback state as audio events arrive. Feature-detect the API: the app should still work when it is unavailable.

Leave next/previous handlers for **Stage 5**, when there is a queue.

**Check:** use your keyboard media keys and inspect the OS media controls. Browser and OS support varies, so test your actual target devices.

## 7. Build the full-screen Now Playing view

Create a separate view that reads the same service signals as the mini-player. It should not create another audio element.

1. Open it from a clearly named mini-player button.
2. Display the large cover, title, artist, play/pause, seek and time.
3. Show a quality badge from available FLAC metadata, such as bit depth and sample rate. Don't invent values when metadata is missing.
4. Add a close button and Escape handling. If it is modal, move focus into it, keep keyboard focus inside while open, and return focus to the opener when closed.
5. Make the layout work on phone and desktop.

The old [NowPlaying.tsx](../material-music/app/src/nowplaying/NowPlaying.tsx) is useful for layout and focus behavior; [parts.tsx](../material-music/app/src/nowplaying/parts.tsx) shows how the old app separated frequently updating seek controls. Skip lyrics, queue, shuffle and animation work until their later stages.

**Check:** opening and closing the view never interrupts playback; both sets of controls stay in sync.

## 8. Count plays in memory

Keep this logic separate from the UI so you can test it. The old reference is [playTracker.ts](../material-music/app/src/player/playTracker.ts).

For each playback of a track:

1. Start with `listened = 0` and `counted = false`.
2. Set the threshold to `min(30, duration / 2)` for a known positive duration; use 30 seconds if duration is unknown.
3. Accumulate **actual playback progression**, not the current position. Pause and buffering must not add time.
4. On `seeking`, stop accumulating and discard the position jump; on `seeked`, establish a new baseline. Also compare position progress with elapsed wall-clock time to avoid counting unexpected jumps.
5. Once the threshold is reached, record one in-memory play and set `counted = true`.
6. Starting a new playback of a track resets its counter; pausing, resuming or seeking within the same playback does not.

Store at least the track ID and timestamp so Stage 5d can later persist history.

**Focused tests:**

- A 120-second track counts after 30 seconds heard, not after seeking to 30.
- A 40-second track counts after 20 seconds heard.
- Pause and buffering add nothing; forward **and backward** seeks add nothing.
- It counts only once per playback, then counts again when explicitly restarted.
- Switching tracks resets the tracking baseline.

## Final Stage 4 checklist

- [ ] Any available FLAC plays from the library and continues across navigation.
- [ ] The stream starts without downloading the whole file, and seeking works.
- [ ] Mini-player and full-screen controls remain synchronized and accessible.
- [ ] Media keys work on a supported browser/OS.
- [ ] Errors, buffering, sign-out and rapid track switching behave sensibly.
- [ ] Play-count tests pass.
- [ ] Use Angular DevTools while playing: keep position-dependent UI in small components and verify the actual update behavior rather than assuming signals alone prevent every other check.

Begin with **steps 1–3**, using the blob temporarily. Once you can reliably hear and control one track, move on to the UI and then the streaming proxy.
