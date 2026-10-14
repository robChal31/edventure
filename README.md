This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Learning World

A learning platform for schools. Staff build quizzes from a shared question bank, and
students play them as quests in an activity map. The first activity is a fishing map
(one of several planned activities, not the theme of the product).

Run `npm run dev` and open `http://localhost:3000`:
- **Student** → `/student`, log in with a secret code (demo codes `TUNA11`, `CRAB22`, `SEAL33`, `OTTER44`).
- **Staff** → `/login`, log in with a username and password (demo accounts below).

Demo data is seeded on first run (students also include `OTTER44`). Passwords are stored in plain text: this is a prototype.

### Roles

| Role | Sees | Can do |
| --- | --- | --- |
| **Super admin / developer** (`dev` / `dev12345`) | All schools, classes, staff, students | Create and remove schools; create classes, staff and students in any school; manage the **global** question/quiz bank |
| **School admin** (`admin.harapan` / `admin123`, `admin.cendekia` / `admin123`) | All classes, students and teachers of its school | Manage teacher and student accounts and class membership; write questions and quizzes for its school; pick from the global bank |
| **Teacher** (`bu.sari` / `guru123`, `pak.budi` / `guru123`) | Students of its own class | Write questions and quizzes for the school; view reports for its students |
| **Student** | Its own quests and results | Play assigned quizzes |

Question and quiz **ownership**: `schoolId = null` means the global bank (shared with everyone,
read-only for non-super staff, who can **Copy to my school** to edit it). A string `schoolId`
means that school's own content.

### Labels (data processing)
Every question and quiz is labelled with **grade** (1–12, stage derived), **subject**,
**topic**, **curriculum** (Kurikulum Merdeka, K13, Cambridge, IB, general), **difficulty**,
**thinking level** and free **tags**. These labels power bank filters, reports and CSV
exports. The question bank flags items that are missing labels. Taxonomy lives in
`src/quiz/taxonomy.ts`.

### Activities (maps)
Activities are game worlds that a quiz creator picks after composing questions (the
**Activity (map)** picker in the quiz editor). The quiz stores `activityId`; the activity
registry (`src/game/activities/activity-registry.ts`) maps it to a map. Adding an activity
means: implement the activity, register it in `src/quiz/activities.ts` and the game
registry, and set `available: true`.

Students who play a quiz travel to its activity map. Currently available: **fishing** (on the
beach map).

### Quiz assignment
A quiz is assigned to **everyone** in its scope, to whole **classes**, or to hand-picked
**students**. A school quiz only reaches students of its own school.

### Student flow
1. `/student` — type your login code.
2. `/student/play` — you start in the village (`VILLAGE_MAP`). Walk with the arrow keys,
   press **Q** (or the 📜 button) for the quest board and pick a quiz.
3. The game fades to the quiz's activity map. For fishing (`BEACH_MAP`): face the water and press
   **F** (or **Space**, or tap **CAST**). There are no fixed fishing spots: the cast counts wherever you stand,
   as long as the float lands on a water layer. Sand, the pier or the boat → a friendly
   "missed" message and you reel back in.
4. A fish swims to the float and bites → the question appears automatically.
   Multiple choice (tap or `1–4` / `A–D`), true/false (`T` / `F`) or short answer (type + Enter).
5. Correct → the fish is caught. Wrong → it escapes and the right answer is shown.
6. Results screen → **Back to village** or **Play again** (fishing: **Fish again**). Finished attempts are saved for the teacher.
   Press **F** while waiting to reel in early; **🏡 Leave** abandons a quest (not saved).

### Staff LMS (`/teacher`)
- **Dashboard** — totals, quiz completion, recent attempts (live, also across tabs).
- **Schools** (super admin) — create and remove schools.
- **Classes** — classes per school with grade level and member counts.
- **Staff** (super admin, school admin) — teacher and school-admin accounts.
- **Questions** — question bank with three types: multiple choice (2–6 options),
  true/false, short answer (several accepted answers; forgiving matching of case, spaces,
  accents and punctuation; optional strict mode). Filters by type, grade, subject,
  curriculum, difficulty, source and "missing labels". Optional explanation shown after answering.
  Every question can be tried in the real student card.
- **Quizzes** — pick and order questions, shuffle, publish/draft, choose the activity map,
  assign to everyone / classes / students, **Preview** (plays the quiz on its map, nothing is saved).
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
Six 64×64 Aseprite sets live in `public/assets/animations/player/fishing/` (`casting`,
`fishing_idle`, `fishing_hooked`, `fishing_roll`, `captured_fish`, `captured_no_fish`), each a
`*_animation.json` plus sheet. They are registered in `public/assets/data/assets.json` and
`src/game/common/assets.ts` (`ASSET_KEYS.PLAYER_FISHING_*`).

- Each state's animations are named `<state>_<down|back|side>`: `cast_*`, `fishing_idle_*`,
  `fishing_hooked_*`, `fishing_roll_*`, `captured_fish_*`, `captured_no_fish_*`.
- Frame 10 of `cast_*` is the splash (`FISHING_SHEET.splashFrame`).
- A miss throws `cast_miss_*`, derived from `cast_*` frames 0–9 (the bait flies but does not
  reach the water). The reel-back uses `fishing_roll_*`.
- `game-objects/player/player-fishing-animations.ts` creates the animations at boot;
  `game-objects/player/player.ts` exposes the state API (`castLine`, `playFishingIdle`,
  `playFishingBite`, `showCatch`, `reelIn`, `stopFishing`).

### Data
Everything is stored in the browser. Keys in `localStorage`:
`learning-world.lms.schools.v1`, `learning-world.lms.classes.v1`, `learning-world.lms.staff.v1`,
`learning-world.lms.students.v1`, `learning-world.lms.quizzes.v1`, `learning-world.lms.questions.v1`,
`learning-world.lms.attempts.v1` (results), and the one-time migration flag `learning-world.lms.migration.v2`.
The signed-in staff member and student live in `sessionStorage` (`learning-world.staff-session.v1`,
`learning-world.student-session.v1`).
Data from before the roles update is migrated once on load (legacy students go to the first seeded
school, `sample-*` questions and quizzes become global). All access goes through
`src/lms/storage/local-collection.ts` and the repositories in `src/lms/repositories/`, so a
real backend can replace them without touching the UI. Quiz rooms from the first prototype
(`learning-world.rooms.v1`) are imported automatically.

### Architecture
- `src/quiz/` — activity-agnostic quiz domain: question types, grading, `QuizSession`, sample bank.
- `src/lms/` — teacher data: types, role scope rules (`access.ts`), storage, repositories,
  staff/student sessions, migrations, report/CSV services, React hooks, seed.
- `src/game/` — Phaser game:
  - `scenes/` (map chosen per run, travel = fade + `scene.restart`), `world/` (maps, layers),
    `world/water/` (water grid + surface probe + debug overlay),
  - `activities/` (activity interface + registry), `activities/fishing/` (state machine,
    `cast/`, `fish/`, `effects/`, config, messages),
  - `game-objects/player/` (player + fishing animations), `components/input/`, `systems/`, `config/`.
- `src/components/` — `student/` (game screen, quest board, question cards), `teacher/`
  (shell, dashboard, organisation, questions, quizzes, students, reports, preview,
  classification fields), `staff/` (login, route gate), `ui/` (shared primitives).
- `src/app/` — routes: `/`, `/login`, `/student`, `/student/play`, `/teacher/*`,
  `/teacher/preview/[quizId]`.

Tests: `npm test` (quiz session, grading, question validation, the water model — including the
real `beach_map.json` — LMS reports and role scope).

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
