<div align="center">

# Eskai · *look up*

### Watch the infrared sky change. Learn to tell what moves from what doesn't.

Real images from NASA's **SPHEREx** space telescope, in your browser.
Type a patch of sky, flick through the telescope's visits, and see a nearby star drift across the field.

[Features](#what-you-can-do) · [How it works](#how-it-works) · [Under the hood](#under-the-hood) · [Run it](#run-it) · [Deploy](#deploy) · [Credits](#data-and-credits)

</div>

---

## Why Eskai

In 1930, Clyde Tombaugh found Pluto by flicking between two photographs of the same sky taken days apart. Whatever moved was not a star. That instrument, the *blink comparator*, is still one of the most powerful ideas in astronomy.

SPHEREx maps the entire sky in infrared light and returns to the same spot every 5 to 7 months. That makes it a blink comparator the size of the universe, but its data is made for researchers, not for curious people.

**Eskai puts that comparator in anyone's hands.** No account, no install, no jargon: enter coordinates, press play, and watch Barnard's Star move between visits.

> Everything Eskai marks is a **candidate**. Nothing is presented as a discovery, and anything the software flags says plainly that it needs human verification.

---

## What you can do

### See the sky move
Type RA and Dec (decimal degrees or `08h55m10s / -7d14m42s`) and a field of view, or move the sky map and press **See SPHEREx data for this spot**. You get one SPHEREx image per visit, with play, pause, step and speed control (1 to 24 frames per second).

- **Difference layer**: subtract one visit from another. What stayed put disappears; what changed lights up. Red is brighter later, blue is brighter earlier.
- **Detections (beta)**: software-proposed candidates from the first-versus-last difference, coloured by kind (appeared, disappeared, contaminated).
- **Expected-position rings and arrows**: see where a known mover *was* and where its catalogue proper motion says it *is now*.

### See its light
- **Chemical filters** for H₂O, CO₂ and CO.
- **Spectrum** for any object, detected candidate, or any point you click, coloured by detector, with molecular windows shaded.
- **Light curve** of brightness at every visit, with error bars.

### Compare your eyes with infrared
A draggable bar shows the same sky in **visible light (DSS2)** on one side and **infrared (AllWISE)** on the other. Works with mouse, finger or arrow keys.

### Point at the sky
*What is above you?* Share your location (or type it), pick a direction and a height with two sliders, and the map shows that part of the sky right now, suggesting the nearest of the featured objects. On a phone, the compass and tilt sensors can do the aiming instead. Your location and orientation never leave the device.

### Ask questions
A built-in assistant explains what is on screen, in plain or technical language, and lists catalogued objects around any position using SIMBAD. It always shows: *"AI assistant: it can be wrong. Findings need human verification."*

### Play: *Find what moves*
Two real SPHEREx images flicker. Click where something moved. Faster and closer scores more, scored on the server so the browser never sends a score. Rounds from easy to hard, a leaderboard, and a downloadable *Star hunter* card.

### Report what you see
Pick a point, say what you think it is (asteroid, brown dwarf, high proper-motion star, variable star, transient, other), add a note. Others can confirm with **I see it too**. Every report generates a shareable 1200×630 card with a SPHEREx cutout and the words *"Unverified candidate: needs human confirmation."*

### Five objects, ready instantly
Five hand-picked objects, including **Barnard's Star**, **Epsilon Indi B**, **WISE 0855** and **R Draconis**, open at once with their images, distance and a story line such as *"The light you see left this star about 6 years ago."* Any other position is processed live by the backend and takes about a minute, with a progress card that says what is happening and how long is left.

### Every view is a link
Coordinates, field of view, layer and view live in the URL (`?ra=&dec=&fov=&band=&view=`). Share the exact patch of sky you are looking at.

---

## How it works

```
 Browser (this repo)                          Backend (spherex-api)
┌──────────────────────────┐   /api/v1/jobs   ┌─────────────────────────┐
│ Landing  ·  Viewer       │ ───────────────▶ │ SPHEREx images (IRSA)   │
│ Sky map (Aladin Lite)    │ ◀─────────────── │ Spectra · detections    │
│ Player · Spectrum · Chat │   patch + WCS    │ Game · reports · chat   │
└──────────┬───────────────┘                  └─────────────────────────┘
           │ sky tiles                
           ▼                          SIMBAD (CDS) for nearby catalogued objects
   NASA/IPAC IRSA (AllWISE, DSS2)
```

The URL is the single source of truth for the view. The sky map talks only to Aladin and IRSA; the data view asks the backend for a patch. The five featured objects come back at once, while any other place returns a job that is polled until ready.

---

## Under the hood

The interface is friendly on purpose. The engineering behind it is not trivial.

**Scientifically honest by design**
- A caveat system attaches the data team's warnings (saturated cores, unvalidated blends) to every object and spectrum, always visible, never buried.
- Objects that cannot be measured are not faked: Barnard's Star and R Draconis saturate the detector, and the app says so instead of drawing a spectrum.
- Rounds where the motion is smaller than one SPHEREx pixel say so, and offer a hint.

**Pixel-accurate sky geometry**
- Every image is placed using its patch's **WCS** (the pixel-to-sky mapping), so clicks, detection markers, proper-motion rings and spectrum probes land on exactly the right pixel.

**Astronomy maths, validated**
- "Point at the sky" converts height and bearing plus place and time into RA/Dec through sidereal time, then undoes precession to the J2000 frame the map uses.
- Checked against **astropy** on 40 random cases: worst error **27″ (0.0075°)**. End to end in a browser with simulated sensors in Madrid: within **0.01°**.

**Built to survive a free server**
| If this happens | The visitor sees |
|---|---|
| Backend is asleep | Loading lines switch to "the server is waking up"; the landing page needs no backend at all |
| Backend restarts during a live job | The job is restarted once, automatically |
| IRSA does not answer | The nearest cached object is served, with a banner saying it is for another position |
| Rate limit (429) | Buttons wait exactly the time the server asks, with a countdown |
| SIMBAD fails or limits us | Its lines disappear and the app stops asking for 5 minutes |
| Network is down | A clear message with a way back to the map |
| Credits or loading lines unreachable | Local copies are shown |

**Fast, offline-friendly front door**
- The landing page makes **zero network requests** and never loads the sky viewer, so it works while the backend sleeps. Fonts are self-hosted.

**Designed, not defaulted**
- One accent colour (verdigris) for action and active state. Red and blue are reserved for *later* and *earlier* in difference images. Amber is reserved for scientific caveats. Every note, warning and error shares one visual treatment. Serif for names and stories, monospace for measured values.

**Accessible and mobile-first**
- Every control is reachable by keyboard; dialogs trap focus and close on Escape; animations stop for people who prefer reduced motion. On phones, tools become a bottom tab bar, panels open under the image, and touch targets are at least 44 px.

**Stack**: React 19 · TypeScript · Vite · Tailwind CSS 4 · Recharts · Aladin Lite 3. About 8,000 lines in `src/`.

---

## Run it

You need Node.js and the backend (`spherex-api`) running on port 8000.

```bash
npm install
npm run dev          # http://localhost:5173
```

The dev server forwards `/api` and `/static` to `http://localhost:8000`, so no configuration is needed locally. To use another backend:

```bash
VITE_API_PROXY=http://localhost:8001 npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-checks and writes `dist/` |
| `npm run preview` | Serves the production build |
| `npm run lint` | Lints the code |

### Try phone mode on a real phone

Compass and location only work on a secure (`https`) page, so a plain `http://<your-ip>:5173` will not do. Put an https tunnel in front of the dev server, for example:

```bash
npx cloudflared tunnel --url http://localhost:5173   # or ngrok
```

Open the printed address on the phone. Inside **Point at the sky**, *Use my phone's sensors instead* appears on touch devices only. It needs motion and location permissions, and the phone must report a compass direction.

---

## Deploy

1. **Build with the backend's public address** (the value is baked in at build time):
   ```bash
   VITE_API_BASE_URL=https://your-backend.example.com npm run build
   ```
   You can also set it in `.env.production` (see `.env.example`).
2. **Publish `dist/`** on any static host.
3. **On the backend**, set `PUBLIC_BASE` to its own public URL (image links are absolute) and make sure `CORS_ORIGINS` allows this site. The chat needs `GROQ_API_KEY` or `DEEPSEEK_API_KEY`; without them it answers with pre-written texts. **API keys never go in this app.**

A free backend host may be asleep: the first request can take a while, and the app shows loading lines instead of an error meanwhile.

### Keeping it current

New SPHEREx data needs **no change** to the viewer; it renders whatever the backend serves. Three things are local snapshots and must be refreshed by hand if they change: the landing images (`public/landing/`) and texts (`src/data/landing.ts`), the credits (`src/data/credits.ts`), and the waiting lines (`src/lib/loadingPhrases.ts`).

---

## Project layout

| Path | What lives there |
|---|---|
| `src/App.tsx` | Landing page or viewer, decided by the URL |
| `src/Landing.tsx`, `src/landing/` | The landing page and its small demos |
| `src/Viewer.tsx` | Viewer shell: top bar, tool rail, views, dialogs |
| `src/components/` | Screens and panels; `ui.tsx` holds shared pieces |
| `src/hooks/` | URL state, sky patch, spectrum probe, chat, reports, phone sensors |
| `src/lib/` | Pure logic: coordinates, WCS, jobs, caveats, SIMBAD, astronomy maths, share cards |
| `src/api/` | HTTP client and backend endpoints |
| `src/data/` | Local copies: featured objects, credits, landing content |
| `public/` | Logo, favicon, landing images |

---

## Honest limits

We would rather tell you than have you find out.

- The "video" is **3 or 4 frames over about a year**, since SPHEREx revisits a spot every 5 to 7 months. It is a blink comparator, not a film.
- New positions take about a minute, because they are processed live.
- Live spectra of clicked points away from the featured objects are sparse (about one channel per detector) and are labelled as such.
- The sky map background is **AllWISE**, not SPHEREx.
- Phone compasses are off by several degrees, so phone aiming is marked *approximate*. It has been tested with simulated sensors, not yet on real Android and iPhone devices.
- There is no Gaia catalogue overlay; Gaia DR3 is used for positions, proper motions and distances.
- Share cards for places other than the five featured objects are text only.
- Testing has been done by hand in a real browser (desktop and phone size); there is no automated test suite yet.

---

## Data and credits

Open **data & credits** at the bottom-left of the app for the full, current list (also fetched from the backend, with a local copy as fallback).

- **SPHEREx** (NASA/JPL/Caltech), served by NASA/IPAC IRSA.
  *This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration.*
- **WISE / AllWISE** sky background, via NASA/IPAC IRSA.
- **Gaia DR3** (ESA) for positions, proper motions and distances.
- **SIMBAD**, operated at CDS, Strasbourg, France (Wenger et al. 2000, A&AS 143, 9).
- **DSS2** (visible-light sky), via IRSA.
- **Aladin Lite** (CDS) for the sky viewer.

Eskai is an independent project. It is not endorsed or approved by NASA, JPL or Caltech.

Want to keep going after the game? Real citizen-science searches for moving objects are happening at [Backyard Worlds](https://www.zooniverse.org/projects/marckuchner/backyard-worlds-planet-9).

---

<div align="center">

**Eskai · look up.**

</div>
