# Attribution

## Buckwheat

This project's visual language and its entire Money section derive from
**[Buckwheat](https://github.com/danilkinkin/buckwheat)** by
**[Danil Kinkin (@danilkinkin)](https://github.com/danilkinkin)** — an
open-source Android daily-budget app, licensed GPL-3.0.

Buckwheat is not a dependency of this project and none of its code is bundled
here. What was taken is listed below, honestly and specifically.

### Algorithms ported from its source

The daily-budget model in [`lib/budget.ts`](lib/budget.ts) is a direct
translation of Buckwheat's budget logic, read from
`app/src/main/java/com/danilkinkin/buckwheat/di/SpendsRepository.kt` and
`.../data/SpendsViewModel.kt`:

| Buckwheat (Kotlin) | Here (TypeScript) |
| --- | --- |
| `whatBudgetForDay()` | `whatBudgetForDay()` |
| `howMuchBudgetRest()` | `budgetState().budgetRest` |
| `howMuchNotSpent()` | `howMuchNotSpent()` |
| `runChangeDayAction()` | `rollDay()` |
| `RestedBudgetDistributionMethod { REST, ADD_TODAY, ASK }` | `RestMethod = "rest" \| "addToday" \| "ask"` |

Specifically:

```
restDays         = days from today to the finish date, inclusive
whatBudgetForDay = (budget − spentBefore − spentToday) / max(restDays, 1)
budgetRest       = budget − spentBefore − spentToday
```

**Because these were translated from GPL-3.0 source, this project is also
licensed GPL-3.0.** See [LICENSE](LICENSE).

### Design language

Taken from Buckwheat's theme files and adapted rather than copied:

- **Colour seed `#CC4C08`**, and its semantic trio `colorGood #40AC02`,
  `colorNotGood #FABC20`, `colorBad #C70909` — from `ui/Color.kt`. The tonal
  ramps built from them here are this project's own.
- **Shape scale 4 / 8 / 12 / 16 / 28** — from `ui/Shape.kt`.
- **Manrope carried at heavy weights at compact sizes** (body copy at 700) —
  from `ui/Typography.kt`.
- **Tonal surfaces blended toward the background** rather than stacked with
  shadows — the `combineColors` approach in `ui/Color.kt`.

### Interaction and layout

- The **"For today" rest-budget pill**, whose own background fills to show the
  remaining share of the day's allowance.
- The **big-number editor**: an oversized right-aligned figure that steps down
  only when it would overflow, with per-character animation.
- The **circular four-column keypad**, backspace in the grid at the top right
  and a tall confirm key filling the column beneath it.
- The **budget summary**: a value card whose fill carries the proportion, the
  starting-budget card with its date range, and the days-left card.
- The **day-grouped spend history**: amount leading at display size, category
  muted beneath, time right-aligned, each day closing with its own total.

### Not taken

The product itself. Corrective is an execution-and-review system built around
Problem → Cause → Correction → Scheduled Action → Execution → Result → Review.
Buckwheat is a budgeting app. Everything outside the Money section — the
correction model, scheduling, execution tracking and review — is unrelated to
it.

---

## Other credits

- **[Manrope](https://github.com/sharanda/manrope)** by Mikhail Sharanda,
  SIL Open Font License 1.1, served via Google Fonts.
- **[Lucide](https://lucide.dev)** icons, ISC License.
- **[Next.js](https://nextjs.org)**, **[Tailwind CSS](https://tailwindcss.com)**,
  **[Zustand](https://github.com/pmndrs/zustand)** and
  **[Motion](https://motion.dev)** — see `package.json` for versions and their
  respective licences.

If you are Danil and would like the attribution worded differently, or any of
this removed, please open an issue.
