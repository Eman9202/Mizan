# MIZAN interaction repair

Audited main commit `341eb513c495d808beebab88524fc9ba5e39aff7` on 2026-09-21.

## Confirmed causes

| File / location | Defect and effect | Repair |
| --- | --- | --- |
| index.html: workout registration | `$()` returns one Element, but `.forEach()` is called on it. The uncaught TypeError stops the main IIFE before microphone, onboarding, profile and progress initialization. | Use `$$()` for the collection. |
| index.html: applyLanguage | The same single-element `.forEach()` defect stops loadProfile even after the first defect is fixed. | Use `$$()` for navigation buttons. |
| index.html: workout timer | Handler references undefined `card`. | Read routine steps from the selected `view`. |
| index.html: startAI | An unconditional return after displaying the Tavus embed makes the existing microphone/WebRTC connection unreachable. | Restore the existing voice path, timeout/cancellation and failure feedback. |
| index.html: closeVoiceStage | Handler outside the IIFE calls private `stopAI`, causing ReferenceError and trapping the overlay. | Delegate clicks inside the owning scope; release tracks on cancellation and page exit. |
| index.html: avatars | Stage animation targets absent `stageAvatar`; male MP4 is absent from repository; empty video URLs are assigned for other characters. | Use a real stage image and existing CSS state animations; stop requesting absent video files. |
| sw.js | Every GET, including external voice tokens, is cached regardless of no-store. Offline missing assets receive HTML. | Bypass cross-origin/no-store requests, cache successful responses only, restrict HTML fallback to navigation, version cache and remove old MIZAN caches. |

Also removed the duplicate navigation fallback that hid initialization failures, handled speech recognition start/stop/error states and blocked storage writes without aborting startup, guarded unsupported notifications, and removed literal backslash-n text from the HTML head.

## Scope and limits

The patch restores the already-present WebRTC voice implementation using the existing token worker; it does not add a new provider. The Tavus override and blocking external script are removed from the core interaction path. The stage now shows the selected local image with CSS talking/listening motion. This is **not** a photorealistic live video or lip-synced avatar. Reintroducing that integration requires separate provider verification.

The Cloudflare worker source/configuration is not in this repository. Its availability, CORS, credentials, billing and actual end-to-end audio were not verified. Voice failures leave usable controls and a text fallback. Existing offline chat replies remain rule-based. Speech recognition still depends on browser support and permission; voice requires HTTPS (or localhost for development).

README.md, index-old.html, manifest.webmanifest and the listed image assets are not the source of the confirmed JavaScript initialization exceptions.

## Validation

Run `node --test tests/interaction.test.cjs` (Node 18+).

13 passing runtime regression tests exercise the actual inline scripts in a Node VM with mock DOM/media/network APIs: initialization, navigation, onboarding, workout countdown/stop, recognition unavailable/permission error, voice connection states, service failure, denial, close during permission prompt, timeout, storage failure, and service-worker token cache bypass.

Running the startup test against the unmodified main HTML reproduces `TypeError: $(...).forEach is not a function` at workout registration. Inline scripts and sw.js also pass Node syntax checks.

These are not browser layout tests or real audio tests. Browser visual verification was blocked: the available cloud browser cannot reach localhost and a local Chromium download timed out.

## Before production merge

- Open the branch in a local HTTPS/localhost test environment; complete onboarding and confirm every navigation category.
- On Android Chrome, start/stop a workout, change language, save profile and progress, reload.
- Allow and deny microphone access; test recognition and a real voice session through the token worker; close while connecting and reopen.
- Check talking/listening motion and ensure recording stops after closing.
- After deploying, reload/reopen to activate the updated service worker and check offline navigation and missing-asset behavior.

Changes are prepared on a review branch, not merged into main or deployed.
