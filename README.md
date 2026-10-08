# Corrective

A mobile-first PWA built around one loop:

**Problem → Cause → Correction → Scheduled Action → Execution → Result → Review**

It is not a habit tracker. It exists to record whether a specific corrective
behaviour actually happened, and whether the problem it targets got smaller.

> Thinking about changing is not changing.
> Writing a corrective measure is not executing it.

It also contains a full daily-budget tracker, ported from
[Buckwheat](https://github.com/danilkinkin/buckwheat) — because the money a
problem costs you is often the clearest evidence that it is a problem.

---

## Contents

- [The idea](#the-idea)
- [The four screens](#the-four-screens)
- [Money](#money)
- [Running it](#running-it)
- [Stack](#stack)
- [Project layout](#project-layout)
- [Design decisions worth knowing](#design-decisions-worth-knowing)
- [Checking the real thing](#checking-the-real-thing)
- [Credits and licence](#credits-and-licence)

---

## The idea

Most self-improvement software measures *intention*. You write down what you
want to do, and the app congratulates you for having written it down.

Corrective measures the gap between intention and behaviour. The central
object is a **Correction**, which is a causal chain:

| Field | The question it answers |
| --- | --- |
| **Problem** | What went wrong? |
| **Cause** | Why did it happen? |
| **Cost** | What did it cause? |
| **Correction** | What specific behaviour replaces the old one? |
| **Measurement** | What evidence shows it was performed? |
| **Status** | Testing / Active / Improved / Solved / Abandoned |

A correction with no schedule is an intention, so corrections get
**Schedules**, which generate **Executions** — the record of whether the thing
actually happened, with an optional note about what followed.

Three rules the product holds to:

1. **Untouched past actions are settled as missed.** `rollover()` runs on load
   and writes a `missed` execution for anything that came due before today and
   was never acted on. The numbers only mean something if ignoring an action
   counts against you.
2. **Execution and effect are separate questions.** Whether the behaviour
   happened and whether the problem shrank are different facts. Completion is
   never treated as proof of effect.
3. **No vanity metrics.** Review states counts you can go and verify —
   *"Completed 13 times, and you wrote down what happened on 7 of them"* — not
   scores, percentages dressed as achievement, or encouragement.

---

## The four screens

### Today

Answers one question: what has to be executed now. Rows lead with the time and
carry Start / Done / Skip inline — the moment you have to navigate somewhere to
record a result is the moment you stop recording results.

It also holds the scheduler. A day strip selects any day, and a view toggle
swaps the list for a **draggable timeline** where blocks can be moved to a new
time (5-minute snapping, with the landing time shown while you hold). There is
no separate Schedule tab; it showed the same data at a different zoom.

### Corrections

Every correction, plus an inbox of **quick captures** — unstructured problems
dumped in one sentence in the moment, to be turned into full corrections later.
The moment just after a failure is when you know most about what happened and
have the least patience for a form.

### Money

The daily-budget tracker. See [below](#money).

### Review

A computed summary — there is nothing to fill in. It leads with **wins**
(a count of what you actually did, plus your most recent written result quoted
back), then groups corrections by what the record supports:

- **Working** — the problem is measurably smaller
- **Being done, not working** — the correction itself is the suspect
- **Not being executed** — the schedule or the plan is the suspect
- **Not enough evidence yet**

---

## Money

A faithful port of Buckwheat's daily-budget model. A budget is an **amount**
and an **end date**; everything else is derived. You never set a per-day
number by hand.

```
restDays         = days from today to the finish date, inclusive
whatBudgetForDay = (budget - spentBefore - spentToday) / max(restDays, 1)
budgetRest       = budget - spentBefore - spentToday
```

- **The "For today" pill** — a stadium whose own background fills with the
  proportion of today's allowance still unspent.
- **The spend editor** — oversized figure, category chips (with a *New* chip
  for your own), and a circular four-column keypad.
- **Budget summary** — what is left (with the proportion carried by the card's
  fill), the starting budget and its date range, and days remaining.
- **Rest distribution** — what happens to money left at a day boundary:
  *spread over the rest*, *add to the next day*, or *always ask*.
- **History** — grouped by day, amount leading, each day closing with its own
  total.

### How it links to the rest of the app

This is the part that makes it belong here rather than being a second app
sharing a shell.

Any correction whose **Metric** carries the budget's currency feeds the budget
automatically. A correction can measure a number — `{ unit, currency, target,
direction }` — and when it does, completing its action opens the keypad instead
of three verdict buttons, and the verdict is *derived* from the figure against
the target.

Those figures become spends by **derivation, not duplication**
(`spendsFromCorrections`). So:

- Recording £7.40 on *"Pack tomorrow's lunch"* from Today moves the budget
  immediately
- Undoing that execution moves it back
- There is no second row to keep in sync, and no way for the two to disagree
- Those rows link back to their correction and cannot be deleted from the
  spend history — the execution owns them

Leave the metric off and nothing changes. Most corrections are a yes or a no,
and a number nobody will record is worse than no number.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build && npm start   # production - required to test the service worker
npm run lint
npm run icons        # regenerate the PWA icons
```

The service worker only registers in production builds, so offline behaviour
and installability must be checked against `npm start`.

First launch seeds realistic demo data — teaching prep, procrastination, deep
work, exercise, study, sleep, and a money-measured lunch correction, plus a
budget part-way through its period.

**Review → Settings** has both **Reset to demo data** and **Clear everything** —
the latter empties the app in one go and does not let the samples come back,
so you are not deleting them one at a time to start clean.

### Opening it from your phone

`next dev` is reachable on your LAN, and `next.config.ts` detects this
machine's addresses so Next 16's cross-origin dev check does not block the
JavaScript. Without that, the page loads and then hangs on its skeleton,
because only the HTML gets through.

Note that a service worker will not register over plain `http://` on a bare IP,
so installing the PWA from a LAN address will not work — that needs HTTPS or a
tunnel.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Zustand ·
Motion · Lucide.

There is no backend. All state lives in `localStorage` behind the action API in
`lib/store.ts`, so introducing a real one is a change to that file rather than
to the interface.

---

## Project layout

```
app/                  routes: Today (/), Corrections, Money, Review
components/
  shell/              AppShell, navigation, PageHeader, theme
  ui/                 Button, Sheet, Field, Keypad, Segmented, Surface
  today/              ActionRow, CompletionControl, DayRail
  corrections/        CorrectionCard, CausalChain, ExecutionHistory, ValueTrend
  money/              RestBudgetPill, SpendEditor, BudgetSheet,
                      SpendHistory, BudgetSetup
  schedule/           Timeline (drag), TimeSelector, RecurrenceSelector
  review/             ReviewMetric, WinsSummary
  capture/            QuickCapture
lib/                  types, store, budget, metric, schedule, stats,
                      seed, date, motion, hooks
scripts/              make-icons.mjs, probe.mjs
```

---

## Design decisions worth knowing

**Anchored schedules.** `{ kind: "before" }` means *"20 minutes before
teaching"*: the anchor carries its own time and days, and the due time is
derived. Dragging such a block changes its **offset**, never its anchor, and
the offset cannot go negative — a correction that happens after the event it
corrects is not the same correction.

**No server rendering of page content.** Every screen depends on the current
date and on `localStorage`, both client facts — the day boundary depends on the
viewer's timezone, not the server's. The shell renders a skeleton until the
store is read. This is why `cacheComponents` and `partialPrefetching` are off
in `next.config.ts`; turn them on when a real backend arrives.

**No `* { border-color }` reset.** Tailwind v4 emits utilities into the
`utilities` cascade layer, while rules written in `app/globals.css` land
*unlayered* — and unlayered beats every layer regardless of specificity. A bare
`*` selector silently overrides `border-accent`, `border-l-success` and every
other border colour in the app. Each border names its own colour instead.

**Top spacing does not rely on `env(safe-area-inset-top)`.** That resolves to
`0px` in a browser; it only has a value in an installed PWA on a notched
device. The shell uses `calc(env(safe-area-inset-top) + 1.75rem)` so there is a
real gap either way, and it is the only place that owns top spacing.

**Charts carry no meaning in colour alone.** The value trend uses one hue with
the target as a dashed reference line, because red and green separate by only
ΔE 5 under deuteranopia — encoding over/under budget by colour would hide it
from some readers. Over and under are read from position. Chart marks have
their own tokens (`--chart-bar`, `--chart-grid`), validated per mode against
the chart surface.

**Demo data arrives additively.** The store records which samples it has ever
been offered (`knownSeedIds`); a migration appends only ones it has never seen.
Nothing you wrote is touched, and a demo correction you delete stays deleted.

---

## Checking the real thing

`scripts/probe.mjs` drives headless Chrome over the DevTools Protocol with no
extra dependencies — screenshots, in-page assertions and real offline testing:

```bash
node scripts/probe.mjs http://localhost:3000/ --w 390 --h 844 --shot out.png
node scripts/probe.mjs http://localhost:3000/ --dark --shot dark.png
node scripts/probe.mjs http://localhost:3000/ --eval "document.title"
```

Set `CHROME_PATH` if Chrome is not at the default Windows location.

One caveat if you use the `--offline` flag: CDP's network emulation applies to
the page target, **not** to the service worker's own target, so the worker will
happily keep fetching. To test offline honestly, stop the server.

---

## Not built

Deliberately out of scope: authentication, sync, payments, social features, AI
coaching, notifications. From Buckwheat specifically: the analytics suite
(spend charts, category donut, min/max and average cards) and CSV export.

---

## Credits and licence

The visual language and the whole Money section derive from
**[Buckwheat](https://github.com/danilkinkin/buckwheat)** by
**[Danil Kinkin](https://github.com/danilkinkin)**. The budget algorithms in
`lib/budget.ts` were translated from its GPL-3.0 Kotlin source.

**[ATTRIBUTION.md](ATTRIBUTION.md) lists exactly what was taken** — the ported
functions line by line, the colour seed, the shape scale, the typography
treatment and the interaction patterns. Please read it; it is the honest
version of "inspired by".

Because those algorithms were translated from GPL-3.0 source, **this project is
licensed [GPL-3.0](LICENSE)** as well.

If you like what Money does here, go and use the original — it is a genuinely
excellent app, and it is where these ideas came from.
