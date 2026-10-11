This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Learning World

Teachers build quizzes in a small LMS; students log in, arrive in the **village**,
pick a quest on the **quest board** and answer the questions by **fishing at the beach**.

Run `npm run dev` and open `http://localhost:3000` → choose *Student* or *Teacher*.
Demo students are seeded on first run (codes `TUNA11`, `CRAB22`, `SEAL33`).

### Student flow
1. `/student` — type your login code.
2. `/student/play` — you start in the village (`VILLAGE_MAP`). Walk with the arrow keys,
   press **Q** (or the 📜 button) for the quest board and pick a quiz.
3. The game fades to the beach (`BEACH_MAP`). Face the water and press **F** (or **Space**,
   or tap **CAST**). There are no fixed fishing spots: the cast counts wherever you stand,
   as long as the float lands on a water layer. Sand, the pier or the boat → a friendly
   "missed" message and you reel back in.
4. A fish swims to the float and bites → the question appears automatically.
   Multiple choice (tap or `1–4` / `A–D`), true/false (`T` / `F`) or short answer (type + Enter).
5. Correct → the fish is caught. Wrong → it escapes and the right answer is shown.
6. Results screen → **Back to village** or **Fish again**. Finished attempts are saved for the teacher.
   Press **F** while waiting to reel in early; **🏡 Leave** abandons a quest (not saved).

### Teacher LMS (`/teacher`)
- **Dashboard** — totals, quiz completion, recent attempts (live, also across tabs).
- **Questions** — question bank with three types: multiple choice (2–6 options),
  true/false, short answer (several accepted answers; forgiving matching of case, spaces,
  accents and punctuation; optional strict mode). Optional explanation shown after answering.
  Every question can be tried in the real student card ("Try" / live preview in the editor).
- **Quizzes** — pick and order questions, shuffle, publish/draft, assign to everyone or to
  selected students/classes, **Preview** (plays the quiz at the beach, nothing is saved).
- **Students** — add one by one or paste a whole class; kid-friendly unique login codes.
- **Reports** — per quiz (hardest questions first + most common wrong answer, per-student
  results), per student (accuracy by question type, quiz progress), every attempt with every
  answer, CSV export.

### Fishing rules (where fish may appear)
- Water = every layer the map definition lists as `water` / `shallow_water` / `deep_water`.
- Layers listed as `bridge` (piers) are walkable and **never** fishable, even over water.
- The painted-sand edge of shore tiles counts as sand.
- Objects drawn over the water (boat, canoe, rocks, house…) are checked pixel-precisely.
- Fish only use *open water* (water cells whose neighbours are water too, not under an
  object) and every swim path is checked, so a fish never crosses sand, a pier or the boat.
  Bridges also render above the fish layer as a second safety net.
- Add `?debug` to the URL to see the water mask, cast landing points, collision boxes and
  the player body (e.g. `/teacher/preview/quiz-sample-ocean?debug`).

To make another map fishable, list its layers in its `WorldMapDefinition`:

```ts
layers: {
    ground: "sand",
    shallow_water: "shallow_water",
    deep_water: "deep_water",
    bridge: "bridge",
},
spawn: { x: 392, y: 280, facing: "down" }, // optional, map pixels
```

and register the map in `src/game/world/maps/map-registry.ts`. Which map hosts an activity
is set in `src/game/activities/activity-registry.ts` (fishing → `beach`).

### Fishing animation
`public/assets/animations/player/fishing/fishing.{png,json}` is registered in
`public/assets/data/assets.json` as `PLAYER_FISHING`. Its `Down`/`Up`/`Right`/`Left` tags are
the throws (`PLAYER_ANIMATION_KEYS.FISHING_CAST_*`); miss / bite / reel variants are derived
from the same frames at boot (`game-objects/player/player-fishing-animations.ts`).
Frame 10 of each tag is the splash; the float rests on frame 14 while waiting.
Tip: Aseprite tag names are global animation keys in Phaser — consider renaming these generic
tags (e.g. `fishing_down`) and updating `PLAYER_ANIMATION_KEYS` to avoid future clashes.

### Data
Everything is stored in the browser (`localStorage`, keys `learning-world.lms.*.v1`; the
signed-in student lives in `sessionStorage`). All access goes through
`src/lms/storage/local-collection.ts` and the repositories in `src/lms/repositories/`, so a
real backend can replace them without touching the UI. Quiz rooms from the first prototype
(`learning-world.rooms.v1`) are imported automatically.

### Architecture
- `src/quiz/` — activity-agnostic quiz domain: question types, grading, `QuizSession`, sample bank.
- `src/lms/` — teacher data: types, storage, repositories, session, report/CSV services, React hooks, seed.
- `src/game/` — Phaser game:
  - `scenes/` (map chosen per run, travel = fade + `scene.restart`), `world/` (maps, layers),
    `world/water/` (water grid + surface probe + debug overlay),
  - `activities/` (activity interface + registry), `activities/fishing/` (state machine,
    `cast/`, `fish/`, `effects/`, config, messages),
  - `game-objects/player/` (player + fishing animations), `components/input/`, `systems/`, `config/`.
- `src/components/` — `student/` (game screen, quest board, question cards), `teacher/`
  (dashboard, questions, quizzes, students, reports, preview), `ui/` (shared primitives).
- `src/app/` — routes: `/`, `/student`, `/student/play`, `/teacher/*`, `/teacher/preview/[quizId]`.

Tests: `npm test` (quiz session, grading, question validation, the water model — including the
real `beach_map.json` — and LMS reports).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
