# Stage 5 — Queue, shuffle and repeat: detailed guide

Build this stage in small milestones. You write the code, test each part, and then connect it to the UI. The goal is to learn how a queue works, not to copy the old React design.

## What this stage includes

- Play an album starting from any track.
- Previous and next, automatic advancement, shuffle, and repeat one/all.
- Reusable queue content shown inside Now Playing on desktop and in a phone sheet, with dragging and a reorder tray.
- Restore the queue and position after a reload.
- A settings page for player options.

**Not in this stage:** action menus and Play next/Add to queue actions (5c), cloud library storage (5b), persistent listening history and playlists (5d), or gapless playback and crossfade (6). Keep the existing lyrics placeholder for its later stage.

## Before you start

Your app already has:

- [PlayerService](./src/app/core/player/player.service.ts): one audio element, `playTrack`, `play`, `pause`, `seek`, and a `RepeatMode` signal. The repeat button is not connected yet. It already handles streaming, Media Session, and play tracking.
- [PlaybackControls](./src/app/shared/media/playback-controls/playback-controls.html): shared controls used by the mini-player and phone Now Playing view; shuffle, previous, next, and repeat are currently disabled.
- [TrackCard](./src/app/shared/media/track-card/track-card.ts): currently plays an individual track directly.
- [Album](./src/app/features/album/album.ts): provides album track rows, but those rows do not yet start an album queue.
- [Now Playing](./src/app/shared/media/now-playing/now-playing.html): has a Queue placeholder on desktop and a Queue shortcut on phone. Its layout does not need to copy the old app.
- [LibraryService](./src/app/core/library/library.service.ts): loads the Drive library and exposes track rows and loading/error state.
- [PlayTrackingService](./src/app/core/player/play-tracking.service.ts): records plays in memory; preserve its rules across skips, repeats, and restores.
- Angular CDK is already installed in [package.json](./package.json); you do not need another drag-and-drop package.

The old [player store](../material-music/app/src/state/player.ts), [queue panel](../material-music/app/src/nowplaying/QueuePanel.tsx), and [settings](../material-music/app/src/state/settings.ts) are references for behavior and edge cases, not a design you have to reproduce.

## 1. Decide what a queue item means

Before writing UI, define a small queue model in a new file under `src/app/core/player`. Keep the model and transformations independent of Angular, audio, and localStorage.

A useful starting shape is:

```ts
interface QueueEntry {
    entryId: string; // unique occurrence in this queue
    trackId: string; // library track
}

interface QueueState {
    entries: readonly QueueEntry[];
    currentIndex: number; // -1 when there is no current entry
    shuffle: boolean;
    originalOrder: readonly string[] | null; // entry IDs, only while shuffled
}
```

Keep the existing `RepeatMode` as the single source of repeat state; move or reuse its definition as needed rather than introducing a second mode that can disagree with the player. Add a small source/context value if you want to replace the current “Test Source” label with the album name.

**Why two IDs?** A queue can contain the same track more than once. Two occurrences need different `entryId`s so reordering, selection, restoration, and shuffle refer to the correct occurrence. Create entry IDs when building a queue, not in a template or every time a signal recomputes.

Write down these invariants and test them:

1. An empty queue has index `-1`; a nonempty queue with a current entry has an index within bounds.
2. Entry IDs are unique, even when track IDs repeat.
3. The current entry is identified by its entry ID; moving items cannot silently change which occurrence is playing.
4. With shuffle enabled, `originalOrder` contains each current entry ID exactly once; with shuffle off it is `null`.
5. A queue operation returns new state; it does not mutate the existing arrays.

**Check:** write small Vitest cases for empty, one-entry, duplicate-track, and invalid-index inputs. Invalid input should be rejected or handled explicitly, not silently turned into a successful-looking queue.

## 2. Build and test the pure queue operations

Implement small functions and tests before adding signals:

1. **Create a queue** from an ordered list of track IDs and a selected occurrence. Pass in or create stable entry IDs at the boundary. An album played from track 3 should still contain tracks 1 and 2 as previously played items; the current index points to track 3.
2. **Select an entry** by entry ID and derive its current index. Reject an unknown ID.
3. **Move an entry** from one valid index to another. Find the current entry by ID afterward, so it remains current when a row moves across it. Moving the current row also keeps the same audio playing.
4. **Find a next/previous entry** without loading audio. Separate the decision about *which entry* from the effect of *playing it*.
5. Derive played, current, and upcoming entries from the queue and index; do not maintain three independently editable arrays.

For example, with `[A, B, C]` and B current, moving A after C produces `[B, C, A]` with B still current. If both A entries represent the same track, use their entry IDs to tell them apart.

**Tests:** beginning/end boundaries; invalid indices; moving before, after, and across the current item; moving the current item; duplicates; and confirming input arrays are unchanged.

## 3. Add a queue service and play an album

Create a small service with a private writable queue signal and a read-only public view. Use the pure functions from milestone 2. The service owns **queue state**, not an audio element.

1. Add a way to resolve a `trackId` into a current `TrackRow` using the loaded library. You may add a focused lookup to `LibraryService`; avoid saving full track objects in the queue, where metadata can become stale.
2. Make a public command that replaces the queue with a sequence of tracks and starts one entry. Resolve the selected entry and call the existing player loading path once.
3. On the album page, construct the sequence in the displayed order. Sort deliberately by disc and track number, with a deterministic policy for missing track numbers; do not depend on object iteration order.
4. Pass that album context through the track card or its output. Selecting an album row should start that row within the album queue, not an unrelated one-track queue.
5. Preserve the existing same-track play/pause UX deliberately. Decide how clicking the currently playing track in a *different* album context behaves; cover that choice in a test.
6. For a track clicked outside an album, choose a clear initial context, such as a one-track queue. Do not silently leave a stale old album queue behind.

Avoid circular service dependencies: for example, have `PlayerService` coordinate commands and inject a queue-state service, while the queue service does not inject `PlayerService`. Keep the current `playTrack()` loading/cancellation logic as the one route to the audio element.

**Check:** play the third track of a multi-disc album, inspect the queue order and selected item, then navigate away. The selected track continues playing. Select another track quickly and confirm an earlier asynchronous load cannot replace it.

## 4. Implement previous, next, and end-of-track behavior

Use the same queue transitions for UI buttons, keyboard media keys, and the `ended` event. Keep the distinction between **manual next** and **automatic end** explicit.

Recommended starting behavior:

| Action | Behavior |
|---|---|
| Manual next | Go to the next queue entry, ignoring repeat-one; at the end wrap only for repeat-all. Otherwise stop at the boundary. |
| Manual previous | If sufficiently far into the track, seek to the beginning; otherwise go to the previous entry. At the start wrap only for repeat-all. |
| Natural end, repeat off | Play the next entry; at the last entry stop. |
| Natural end, repeat all | Play the next entry, wrapping to the first. |
| Natural end, repeat one | Start a new playback of the same entry. |

Use a named previous-restart threshold, for example 3 seconds, rather than scattering a number across handlers. You can make it a setting in milestone 11.

1. Hook the shared [PlaybackControls](./src/app/shared/media/playback-controls/playback-controls.ts) buttons to player commands. Stop click propagation where needed so a transport click does not also open the Now Playing panel.
2. Replace the existing `ended` behavior with one coordinated transition. Be careful: the current tracking listener also handles `ended`. Finish the old listening session **before** starting the next one; verify event ordering so an old `ended` handler cannot clear the new track's tracker.
3. Add `nexttrack` and `previoustrack` Media Session handlers through [MediaSessionService](./src/app/core/player/media-session.service.ts). Feature-detect or handle unsupported actions without breaking playback.
4. Update button enabled states and accessible labels. Disabled controls must not claim they will work.
5. A failed next track should surface an error; do not silently skip an unknown number of tracks or create an infinite retry loop.

**Tests:** all three repeat modes; one-entry and empty queues; first/last boundaries; manual next versus natural end in repeat-one; previous on both sides of the threshold; and play counting exactly once for each playback, including repeating the same entry.

**Check:** play an album, use UI buttons and media keys, and let a short track end naturally. The controls and audio must agree about which track is current.

## 5. Add shuffle without losing the current track

Implement and test shuffle as pure transformations first:

1. When enabling it, store the current entry ID order as `originalOrder`.
2. Keep the current entry selected and playing. Leave already-played entries in place and shuffle only the upcoming entries. For example, `[A, B, C, D]` with B current might become `[A, B, D, C]`.
3. Use a proper Fisher–Yates shuffle. Accept a random-number function as an argument so tests can provide deterministic values.
4. When disabling shuffle, restore `originalOrder` and find the current entry by ID, even if it is now at a different index.
5. Define how manual reorders interact with shuffle. A simple, predictable starting policy is: **a manual reorder while shuffled becomes the new original order**. Turning shuffle off then keeps that edited order rather than unexpectedly undoing the user's change. Apply this policy to the whole queue and explain it in the UI if needed.
6. New queue construction while shuffle is active must establish a new matching original order; do not reuse the previous album's order.

**Tests:** no lost/duplicated entries; duplicate track IDs with distinct entry IDs; current occurrence unchanged; enable/disable; changes while shuffled; empty/one-entry queues; deterministic random inputs. Verify behavior, not a particular random order.

**Check:** turn shuffle on during playback, skip a track, then turn it off. Playback should not restart merely because the order changed.

## 6. Build the queue content and phone sheet

Separate the **queue content** from its **container**:

- Create a queue component that renders and operates on the shared queue state. It should not depend on whether it is inside a sheet.
- On desktop, put that component directly in the Queue tab area already present in [Now Playing](./src/app/shared/media/now-playing/now-playing.html). It is integrated content, not a floating overlay.
- On phone, put the same queue component inside a sheet opened by the Queue shortcut. The sheet owns open/close and focus behavior; the queue component owns its list interactions.
- Lyrics are for a later stage, but follow the same separation: reusable lyrics content directly in the desktop Lyrics tab and inside a phone sheet. Queue and Lyrics are different content components, not separate implementations of the sheet.

For the queue component:

1. Render played items, the current item, and upcoming items from the same queue state. Clearly identify the current occurrence, including when a track appears twice.
2. Show track title, artist, and useful cover/duration information from the library. Use a stable `entryId` in `@for`.
3. Selecting a row jumps to that entry and starts it through the same player command as next/previous.
4. Provide a clear empty state. Do not expose the Lyrics shortcut as working functionality until it is implemented.
5. On desktop, make the list feel part of the player: an open, borderless list against the atmospheric background, a compact “Up next” header and count, and a softly tinted current-track row. Keep upcoming rows mostly transparent and reveal reorder controls on hover **and keyboard focus**.
6. Design for narrow screens and long queues; keep the list scrollable. Measure performance before adding virtualization.

For the phone sheet, provide a close control. If it is modal, manage focus on open, keep it inside while modal, close with Escape, and restore focus to the opener. If it is non-modal, do not claim it is modal and make navigation between it and surrounding controls clear.

If you choose to display a source label, represent a real source in queue state; otherwise use a neutral label rather than guessing. For the future lyrics content, use spacious, readable text and a clearly highlighted current line; keep surrounding lines readable rather than heavily blurred.

**Check:** switch desktop tabs or open and close the phone sheet while audio plays, jump to a played/upcoming row, and navigate the queue with a keyboard and screen reader. Both layouts use the same queue state, and no second audio element is created.

## 7. Reorder by drag and with a keyboard

Use CDK drag-and-drop (`CdkDropList`, `CdkDrag`) for the queue. The library function `moveItemInArray` mutates its argument: if you use it, apply it to a copy, then commit a new signal value.

1. Connect the drop event's indices to the tested move operation. If the UI splits played/current/upcoming into sections, translate section-relative indices into the single full queue correctly.
2. Allow any queue occurrence to be moved. Moving the current row changes its place in the queue, **not** the current audio source.
3. Add a reorder tray: an explicit reorder mode that shows the complete order, allows multiple moves, and has **Apply** and **Cancel**. Keep the draft separate from live queue state until Apply; Cancel must not change playback or queue order.
4. If the queue changes while the tray is open (for example, another track is selected), detect the stale draft and ask the user to reopen it or otherwise resolve the conflict; do not overwrite newer state silently.
5. CDK pointer dragging alone is not a keyboard solution. Provide named **Move up** and **Move down** buttons or an equivalent keyboard operation, with focus retained and an announcement of the new position. Offer the same capability on touch.
6. Apply the shuffle/reorder policy from milestone 5 consistently for both direct dragging and the tray.

**Tests:** reorder across the current item in both directions, move the current item, duplicates, first/last boundaries, draft Apply/Cancel, stale draft, and keyboard moves. Verify the current entry and audio do not change.

## 8. Persist queue state separately from position

The roadmap calls for localStorage, not cloud sync. Split the storage into:

- A **queue snapshot**: schema version, stable entry IDs and track IDs, current entry ID, order, shuffle/original order, repeat, and optional source context. Write it only when these change.
- A **position record**: snapshot/queue revision, current entry ID, and seconds. Write it on a throttle, for example every 5 seconds, and at useful boundaries such as pause or seek completion.

Associate the position with both the current occurrence and the matching queue snapshot revision. If either differs at restore time, ignore that stale position. Regenerate the revision when the persisted queue snapshot changes, and save a matching current position when appropriate. This avoids applying A's old position to B or to a later occurrence of A.

1. Validate parsed data at runtime: schema version, types, unique entry IDs, valid current entry, consistent shuffled order, repeat mode, and finite non-negative position. `JSON.parse` and localStorage can fail; report problems and keep the live player usable instead of crashing or claiming persistence succeeded.
2. Keep the last successfully saved snapshot coherent if a write fails. A position from a failed/new snapshot must never be treated as matching an old snapshot.
3. Cancel pending throttled writes when the track or session changes; a delayed write from the old track must not replace the new position.
4. Do not store access tokens, blob URLs, or audio bytes in the queue snapshot.
5. Do not restore one user's queue for another. The current auth service exposes no stable account ID, so a conservative initial policy is to clear saved account-specific state on **sign-out or expiry**, including an expired session found on reload. This means an expired token loses the saved queue. Also prevent account switching while signed in unless you can verify the identity or clear the old queue first. Retaining it across reauthentication requires a trustworthy account identity and account-scoped storage; do not claim that protection based on the token alone.

**Tests:** queue writes do not occur on every `timeupdate`; position writes are throttled; switching tracks and reordering cannot restore a stale position; duplicate track occurrences remain distinct; malformed storage and failed writes surface an error; sign-out, expiry, and expired-session reload cannot expose one account's queue to another.

## 9. Restore after a reload

Restoring is not the same operation as selecting and autoplaying a track. The current `playTrack()` always calls `play()`, so first separate **loading a source** from **starting playback** without duplicating the streaming path.

1. Wait until authentication, the library, and the streaming worker are ready. Do not interpret “library still loading” as “all saved tracks are missing.”
2. Resolve saved track IDs against the loaded library. If the library fails to load, show a retryable error and retain the saved snapshot; do not overwrite it with an empty queue.
3. Define a visible policy for genuinely missing tracks once loading succeeds. For example, remove missing entries, retain valid entries in order, and report how many were unavailable. Recalculate the current entry and shuffle order consistently; if the saved current entry is missing, choose an explicit fallback without applying its position to a different entry.
4. Load the restored current track **paused**; do not assume autoplay permission after a reload. Wait for audio metadata before seeking. Clamp a valid saved position to the known duration and do not call `play()` automatically.
5. Guard every asynchronous stage with the same kind of generation/version check used for track loading. A user selecting a new track or signing out during restore must win over the old restore.
6. Restoring and seeking to the saved position must not itself count as listening. A play count starts only when playback actually resumes, according to your Stage 4 tracker.

**Check:** play in the middle of a track, wait for a position save, reload, and confirm the same queue, current occurrence, and approximately saved position return paused. Press Play and hear it continue. Also test a missing track, a failed library load, and selecting a different track during restore.

## 10. Add the repeat and shuffle UI

The `RepeatMode` enum and `toggleRepeat()` already exist in `PlayerService`; connect their behavior rather than creating another repeat state.

1. Enable the shuffle and repeat buttons in [PlaybackControls](./src/app/shared/media/playback-controls/playback-controls.html).
2. Make shuffle's on/off state understandable visually and to assistive technology (`aria-pressed` for a toggle).
3. Give repeat a label that describes its current mode and/or the next action. Use distinct off/all/one visual states; do not rely on color alone.
4. Use the same state and commands in the mini-player and phone/full-screen controls. Verify clicks do not bubble into the footer's open-panel handler.
5. Check tab order, focus indication, keyboard activation, and accessible names on both screen sizes.

**Check:** change modes from one view and confirm the other immediately reflects the same state. The visible repeat mode must match what happens at track end.

## 11. Add a settings page for player options

Create a lazy-loaded Settings route and a focused settings service. The old app's [settings](../material-music/app/src/state/settings.ts) are inspiration, not a list of features to implement now.

1. Start with one option that the current player actually supports: for example, the **previous-button restart threshold** from milestone 4. Explain its units and behavior.
2. Give the option a validated default and update the previous command to read it. Prefer a native, labeled control; use signals for settings state and Signal Forms if you build a new form.
3. Persist this small preference separately from the queue and position. Validate stored values and surface storage errors. Decide whether this is a device preference or account-specific data; do not present localStorage as cross-device sync.
4. Leave settings for crossfade, gapless, other audio formats, and future features until their respective stages. Do not add controls that do nothing.
5. Add navigation to Settings and test keyboard access and small-screen layout.

**Check:** change the option, test Previous before and after the threshold, reload, and confirm the chosen value still applies.

## 12. Verify the whole stage

Run the focused queue, player, persistence, panel, and settings tests, then the existing build. Use the repository's existing Vitest/Angular test runner, for example:

```powershell
npm test -- --watch=false --include='src\app\core\player\queue.spec.ts'
npm run build
```

Adjust the test path to your actual file name. Add focused tests for new behavior rather than trying to reach a coverage percentage.

Manual end-to-end checklist:

- [ ] Start an album from a middle track; queue order and current occurrence are correct.
- [ ] Previous, next, natural end, repeat one/all/off, and media keys behave consistently.
- [ ] Shuffle on/off preserves the current occurrence; duplicates remain distinct.
- [ ] Drag and keyboard reorder work across the current item; tray Apply/Cancel works.
- [ ] Integrated desktop queue content and the phone sheet are usable, accessible, and do not interrupt playback.
- [ ] Reload in the middle of a song restores the same queue and approximately the saved position, paused.
- [ ] Missing tracks, invalid storage, worker/library errors, and sign-out are handled explicitly.
- [ ] Selecting a new track during restore or loading never starts an older track.
- [ ] Seeking, repeat, and track switches preserve the Stage 4 play-count rules.
- [ ] Queue changes do not cause the full queue to be rewritten on every position update.
- [ ] Settings work after reload and do not advertise unimplemented features.

Start with **milestones 1–2**. Do not connect drag-and-drop or persistence until the queue transitions have reliable tests.
