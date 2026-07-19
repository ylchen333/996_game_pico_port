# 996 WebSpatial

A React + Vite port of the 996 narrative game for ordinary web browsers and the
PICO OS 6 WebSpatial runtime. Gemini validates answers and writes outcome text;
FLUX edits each action image. Provider credentials remain in the Node backend.

## Requirements

- Node.js 20 or newer
- The PICO OS 6 emulator for spatial preview
- `GEMINI_API_KEY` in `.env.local`

Copy `.env.example` to `.env.local` and add the key. Never add secrets to files
inside `src/` or `public/`.

## Install and run

```sh
npm install
npm run dev
```

`npm run dev` starts both processes:

- React/Vite frontend: <http://localhost:5173>
- Node API: <http://localhost:3000>

Vite proxies `/api` to Node, so the frontend remains same-origin from the
browser's point of view.

## PICO emulator

Start the emulator in another terminal:

```sh
cd "/Users/loriechen/Desktop/project_work/swan_spaceos_oversea_K_pico_emulator_mac_20260404"
./start-emulator.sh
```

Open <http://10.0.2.2:5173/> inside PICO, then choose **Run as a standalone
app** in the address bar to enable WebSpatial. `10.0.2.2` is the emulator's
route to the Mac host; Vite is already configured with `host: true`.

No WebSpatial Builder command is required for PICO OS 6. Its Web App Runtime
already contains WebSpatial Runtime.

## Verification

```sh
npm test
npm run build
```

After building, `npm start` serves the production `dist/` frontend and APIs from
port 3000. Open <http://localhost:3000/>.

## Project structure

- `src/App.tsx` — React UI and asynchronous game flow
- `src/app.css` — desktop presentation and WebSpatial depth/material rules
- `src/game/game-engine.js` — framework-independent game state machine
- `src/game/api.ts` — browser API client
- `server.js` — static production server, Gemini, FLUX, and story APIs
- `local/base_imgs/events.json` — story and prompt manifest
- `test/game-engine.test.js` — state-machine tests

## Spatial layout

The experience uses two WebSpatial window scenes:

- The start scene contains centered narrative text, input, and action buttons.
- The named `996ImageScene` popup contains only the current story image.

Choose **Start Game** in the main scene. The app calls `initScene` before
`window.open`, automatically creating a separate 960×540 image window. A
BroadcastChannel keeps both scenes synchronized, including generated FLUX image
blobs. Closing and reopening the image scene with **Open Image View** restores
the current image automatically.

The same two-window experience works in an ordinary desktop browser. If the
image does not open there, allow popups for the local development origin.
