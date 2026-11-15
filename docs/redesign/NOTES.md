# Redesign notes

The screenshots that went with these notes were removed; what follows is what they showed.

## What was wrong with the old interface

- **Sky map**: six unrelated controls stacked in a floating column, each a
  translucent box. The primary action ("View SPHEREx data here") floated at the top with no
  relation to anything. Opening a tool made the column grow past the bottom of the screen (step 3 of the aim panel was cut off).
- **Data view**: the object card, the tool toggles, the layer buttons, the
  difference notice and the credits were five separate boxes in four corners. Two panels could
  open at once and overlap the picture.
- **Phone**: the layer buttons covered the object card and cut its text; the picture was pushed to the middle with dead space under it; the
  timeline wrapped ("2 / fps"); the credits sat on top of the timeline; panels covered the picture
  completely.
- **States**: a network failure showed the raw text `TypeError: Failed to fetch`
- **Style**: default blue on slate, every surface blurred and rounded, no type scale, emoji-like
  glyphs (`⚠ ✕ ◆ ⇆`) as icons, cautions in three different amber treatments.
- No landing page: a first visit opened a dark map with no explanation.

## Two directions considered

**A. Observatory logbook (chosen).** A warm near-black (`#0c0b09`), paper white text (`#ece6d6`),
hairline rules (`#2f2c25`), and one accent, verdigris (`#74c3b1`), for the primary action and the
active state. Spectral (a book serif) for names, headings and one-line stories; IBM Plex Sans for
text; IBM Plex Mono for coordinates and measured values. Square corners (3 px on controls only),
no blur, no shadows except under dialogs. Mood: a well-kept instrument and its notebook.

**B. Mission console.** A blue-black (`#0a0e14`), cool white (`#e6eaf0`), an ice-blue accent,
Archivo for headings and JetBrains Mono for values, 6 px radii. Mood: a control room.

A was chosen because the data already owns the cool colours: blue means "earlier visit" in every
difference image, the infrared map is teal, and the probe and filters are blue and cyan. A warm,
almost colourless interface lets those colours mean something, and the accent (a green-leaning
teal) is not used by any data colour. A serif with character also keeps it away from the usual
dark-dashboard look. Amber stays reserved for scientific cautions, red and blue for later/earlier.

## Structure

- **One chrome for both views**: a top bar (name = way back to the landing page, Sky map / SPHEREx
  data switch, coordinates search, credits), a tool rail (left on wide screens, a tab bar at the
  bottom on phones) and one dock that holds one panel at a time.
- **Sky map**: tools grouped as Explore / Play / Community, each with a one-line explanation. The
  dock opens beside the rail (a bottom sheet on phones). The primary action sits under the
  reticle it refers to.
- **Data view**: the object card heads the rail. The picture is a player: layers above it (two
  groups: one visit / between visits) with a plain-words caption of what is on screen, time below
  it. Spectrum, light curve, Ask and Community share the dock, so nothing covers the picture: on
  wide screens the dock pushes it, on phones the dock sits under it and can be minimised.
- **Primitives** (`src/components/ui.tsx`): Button, IconButton, Chip, Segmented, Field, Check,
  Callout (the one treatment for caveats, warnings and errors), Panel, Dialog, Dot. Tokens are in
  `src/index.css` (`@theme`).
- **Landing page** (`src/Landing.tsx`): shown when the URL carries no view state. It ships its own
  pictures (`public/landing/`, about 230 KB) and its own copy of the five story lines, makes no
  request, and never loads the viewer.

## Behaviour notes

Nothing under `src/api`, `src/hooks` or the logic in `src/lib` was changed. These small things did
change, all of them visible in the interface:

- Coordinates can now be edited in the data view too (the shared top bar). The view reloads for
  the new place.
- Spectrum used to open in its own floating box, beside another panel. It now shares the dock.
  A click on the picture opens the spectrum, unless the report form is open (the click is then
  the subject of the report, as before).
- Playback speed is a labelled menu instead of a button that cycled through values.
- A link can name a tool to open, `&tool=compare | aim | play | objects | sightings` on the sky
  map and `&tool=spectrum | lightcurve | ask | community` on the data view. The landing page uses
  it. The parameter is removed from the address once read.
- Style constants changed in `src/lib`: the colours and fonts of the two share cards
  (`shareCard.ts`, `hunterCard.ts`) and the colour and label font of the map markers
  (`markers.ts`).
