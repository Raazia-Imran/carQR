# The 3D landing page

The home route `/` now tells the parking-contact story through an original cartoon streetscape. This changes the presentation layer; it does not activate live messaging or introduce a new authentication system. Follow [QUICKSTART.md](QUICKSTART.md) for the complete local setup.

## See it locally

If the project is already set up, keep your database running, then run:

```sh
npm ci
npm run dev
```

Open **http://localhost:3000** and scroll. The separate `npm run worker` process is needed for real application delivery workflows; the landing page's interactive examples do not use it. `npm ci` installs the pinned Three.js dependency from the committed lockfile.

For a production build, run `npm run build` and then `npm start`. Never expose the local simulation publicly. Live deployment must satisfy the configuration and provider requirements in [OPERATIONS.md](OPERATIONS.md) and [PROVIDERS.md](PROVIDERS.md).

## The visitor experience

| Section | What it explains or does |
|---|---|
| Park | Introduces the small sticker and private contact concept; links to sign-in |
| Scan | Explains that the passerby chooses and confirms a reason; reason buttons change the later illustrative alert |
| Alert | Shows a sample request, with WhatsApp first and consented SMS fallback explained |
| Reply | Lets the visitor try an acknowledgement in a clearly labelled local example |
| Carry on | Moves the illustrated car away and explains resolution |
| Features | Illustrates the sealed-secret sticker, owner preferences, independently accepted backup and abuse/privacy controls |
| Audiences | Switches between drivers, campuses and workplaces, describing implemented pilot scope |
| Pilot model | Explains manual sticker ordering and operator-confirmed prices/terms; links to `/pricing` |
| FAQs | Answers number privacy, intentional sends, WhatsApp configuration, SMS, tag control, calls and ordering questions |
| Final action | Links to owner sign-in and existing help/privacy/terms pages |

The visual is genuine browser-rendered 3D when WebGL is available. Scroll progress changes the car, camera, phone and visitor. Pointer movement adds a subtle camera response with a mouse. There is no physical “4D” hardware requirement.

The illustration uses a decorative QR pattern. It is **not** an activation secret or a usable vehicle tag. Use the admin/tag issuance flow for a real application QR.

## Source locations

| File | Responsibility |
|---|---|
| `app/components/landing/Landing.tsx` | Page sections, navigation, scroll chapter measurement, example state, audience switch and FAQs |
| `app/components/landing/CarScene.tsx` | Client-side lazy scene loading and original SVG fallback |
| `app/components/landing/scene.ts` | Procedural geometry, camera, lights, animation, visibility and GPU cleanup |
| `app/components/landing/landing.css` | Scoped palette, typography, layouts, overlays, responsive rules and reduced-motion styles |
| `app/ui.tsx` | Selects the landing page at `/`; other routes retain the shared application header/footer |
| `app/layout.tsx` | Product title and description; existing search-index restriction remains |

There are no external model, font or image downloads for this scene. No analytics or new public data endpoints were added.

To edit the story, update `chapters` and the matching scene/overlay behavior. To change a notification example, update `scenarios`; labels come from the shared fixed reasons. Update FAQ answers if implemented backend behavior changes. Keep product claims aligned with [IMPLEMENTATION.md](IMPLEMENTATION.md).

## Motion and resource handling

- Scene indicators navigate to each of the five chapters.
- The motion control pauses continuous scene animation. Scrolling can still select the corresponding static scene.
- OS `prefers-reduced-motion` disables smooth scrolling, scene interpolation, idle animation and CSS transitions.
- The scene module loads on the client separately from the initial page. An SVG illustration is present before loading and remains if loading/WebGL fails or the graphics context is lost.
- Pixel density is capped, with a lower mobile cap. The render loop pauses when the scene is offscreen or the document is hidden.
- Resize, visibility and intersection observers and GPU resources are cleaned up on unmount.
- Page styles are scoped so existing owner, admin and scanner layouts retain their styling.

## Privacy and messaging truth

The public scanner page and status projection omit the owner's stored phone number. The platform and selected delivery providers still process the destination needed for messaging. Do not describe this as anonymity from the operator or providers.

The WhatsApp adapter and signed receipt processing are implemented. Successful live sending has not been demonstrated. An approved business sender/template and valid deployment configuration are required. Local simulation sends neither WhatsApp nor SMS.

Landing page reason selection and the “I'm coming” example only update browser component state. They never create an incident, acknowledge a real incident, access a phone record or send a message. Actual actions remain in the existing scanner and authenticated owner routes. Masked calls remain unimplemented Phase B work.

## Verification and outstanding visual review

After integration, `npm run typecheck`, all 34 existing SQL integration tests, and `npm run build` passed. `npm audit --omit=dev` reported zero known runtime dependency vulnerabilities. Those checks verify compilation and existing application behavior, not the finished appearance on every device.

Browser automation was unavailable in the implementation environment, so the following still need actual browser/device review:

1. At 360, 390, 768, 1280 and 1440 px widths, check for clipped text, horizontal overflow, overlay collisions and sticky scene behavior. Also check short screens and landscape phones.
2. Scroll all five chapters and use each scene indicator. Verify that displayed story text, overlay and car state agree, including after resizing.
3. Use the mobile menu, reason buttons, example acknowledgement, audience buttons and FAQ disclosures. Confirm the example sends no network mutation.
4. Use keyboard-only navigation, skip link and visible focus. Check reading order, zoom to 200%, and labels with a screen reader.
5. Enable reduced motion before loading and change it while the page is open. Try the motion control and verify the selected still scenes remain understandable.
6. Disable WebGL or simulate a lost graphics context. Verify that the original SVG fallback remains visible with readable story content and functional navigation.
7. Verify the graphics loop stops in a background tab and offscreen; inspect low-powered mobile GPU performance and the scene chunk transfer size.
8. Follow sign-in, dashboard, privacy, terms, help and ordering links. Repeat a real application scanner-to-owner journey in local simulation with the worker running.
9. Check actual text/icon contrast, touch target usability, browser console/network errors and current Safari/Firefox/Chromium behavior.

Record device/browser versions and actual results. No screenshot, frame-rate measurement, accessibility certification or zero-bug guarantee is implied by the compilation checks.
