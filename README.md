# SPHEREx Sky Explorer

A citizen-science viewer for the infrared sky, built for the NASA Space Apps challenge
**Planet X and SPHEREx**. It takes real images from the SPHEREx space telescope and lets anyone
explore them: compare the sky with what the eye sees, watch fast nearby stars move between
visits, and play a short game that teaches how that movement is found.

Everything the app marks is a *candidate*: nothing here is presented as a discovery, and anything
the detector finds says that it needs human verification.

## What you can do

- **Sky map** – an all-sky infrared map (AllWISE) with editable coordinates and field of view, a
  mini-map, and a list of **points of interest**: the five objects of the challenge.
- **Point at the sky** – *what is above you?* Say where you are (your location, or type latitude and
  longitude) and choose a direction and a height with two sliders: the map shows that part of the sky
  right now, and suggests the nearest of the five objects. Works on any computer. On a phone you can
  let the sensors do the aiming instead (compass, tilt and location, which never leave the device);
  that mode is approximate, because phone compasses are off by several degrees.
- **Eye vs infrared** – a draggable bar that shows the same sky in visible light (DSS2) on one side
  and in infrared on the other.
- **SPHEREx data** – for any position: the timelapse of SPHEREx visits, chemical filters (H₂O, CO₂,
  CO), the difference between visits (what changed) and software-assisted detections (beta), with
  rings for where a known mover should be. Positions outside the five cached objects are processed
  live by the backend and take about a minute.
- **Spectrum and light curve** – for the object on screen, always with the scientific caveats the
  data team attaches (saturated cores, unvalidated blends).
- **Ask** – a chat that explains what is on screen in plain or technical language, and lists
  catalogued objects around a position (SIMBAD).
- **Find what moves** – a game: two real images flicker, click where something moved.
  Scored on the server; there is a leaderboard and a shareable *Star hunter* card.
- **Community** – reports from other people, with a shareable card.

## Run it

You need Node.js and the backend (`spherex-api`) running on port 8000.

```bash
npm install
npm run dev          # http://localhost:5173
```

The dev server forwards `/api` and `/static` to `http://localhost:8000`, so no configuration is
needed locally. To use another backend: `VITE_API_PROXY=http://localhost:8001 npm run dev`.

Other scripts: `npm run build` (type-checks and writes `dist/`), `npm run preview` (serves the
build) and `npm run lint`.

### Trying the phone mode on a real phone

The compass and the location only work on a secure (`https`) page, so a plain `http://<your-ip>:5173`
address will not do. Put an https tunnel in front of the dev server, for example
`npx cloudflared tunnel --url http://localhost:5173` (or ngrok), and open the address it prints on
the phone. Inside *Point at the sky*, the option *Use my phone's sensors instead* appears on touch
devices only. It needs the motion and location permissions, and the phone must report a compass
direction.

## Deploy

1. Build with the backend's public address:

   ```bash
   VITE_API_BASE_URL=https://your-backend.example.com npm run build
   ```

   (or put it in `.env.production`; see `.env.example`). Vite writes the value into the build, so
   it has to be set at build time.
2. Publish the `dist/` folder on any static host.
3. On the backend, set `PUBLIC_BASE` to its own public URL (image links are absolute) and make
   sure `CORS_ORIGINS` allows the address of this site. The chat needs `GROQ_API_KEY` or
   `DEEPSEEK_API_KEY` on the backend; without them it answers with pre-written texts. API keys
   never go in this app.

A free backend host may be asleep: the first request can take a while, and the app shows loading
lines instead of an error meanwhile.

## Data and credits

Open **data & credits** at the bottom-left of the app for the full, current list (it is also
fetched from the backend). In short:

- SPHEREx (NASA/JPL/Caltech), served by NASA/IPAC IRSA. *This publication makes use of data
  products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and
  Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the
  California Institute of Technology, and is funded by the National Aeronautics and Space
  Administration.*
- WISE / AllWISE sky background, via NASA/IPAC IRSA.
- Gaia DR3 (ESA) for positions, proper motions and distances.
- SIMBAD, operated at CDS, Strasbourg, France (Wenger et al. 2000, A&AS 143, 9).
- DSS2 (visible-light sky), via IRSA.
- Aladin Lite (CDS) for the sky viewer.

## Built with

React 19, TypeScript, Vite, Tailwind CSS, Recharts and Aladin Lite.
