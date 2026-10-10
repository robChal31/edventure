This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Learning World — Fishing Activity

Learning World lets teachers build quizzes that students play as games. The first
activity is **Fishing**: every selected question becomes one fishing challenge —
a correct answer catches a fish, an incorrect answer lets it escape, and the final
score reflects real quiz performance.

> Note: in this repository the Next.js app + Phaser game live at the repo root
> (`src/app` for the UI shell, `src/game` for Phaser), not under `apps/web`.

### Teacher flow
1. **Create Quiz Room** — name the room.
2. Add your own multiple-choice questions, and/or pick from the sample question bank.
3. Choose which questions to include and the activity (Fishing).
4. **Save** or **Save & Play**. Rooms persist in `localStorage`.

### Student flow (Fishing)
1. Stand at the glowing spot by the river and press **Space**/**X** (or tap **CAST**).
2. When a fish bites, answer the multiple-choice question (click, or keys `1-4`).
3. Correct → fish is caught (+1). Incorrect → it escapes. No retries; one attempt per question.
4. The number of challenges always equals the number of selected questions.
5. At the end you see the score, caught/escaped counts, and a per-question review, with **Play Again**.

Controls: arrows / WASD or the on-screen pad to move, Space/X or CAST to fish, `1-4` to answer.

### Architecture
- Quiz domain (activity-agnostic): `src/quiz/*` — types, sample bank, `QuizSession`, storage.
- Activity registration: `src/quiz/activities.ts` (Fishing is the first activity).
- Fishing gameplay: `src/game/activities/fishing/*` — state machine, spot, bobber, fish, procedural pixel-art textures, ambient fish.
- Reuses the existing player, world map, object, collision and interaction systems in `src/game`.
- React/Phaser bridge: `src/game/PhaserGame.tsx` + `src/game/game-options.ts`.

Run `npm run dev` and open `http://localhost:3000`. Unit tests: `npm test`.

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
