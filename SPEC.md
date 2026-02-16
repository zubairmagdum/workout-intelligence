# Workout Intelligence MVP (Demo)

## Demo Script
1) User enters exercise name: "Back Squat"
2) User enters 4 weeks of training data (weight, reps, sets)
3) User clicks "Generate Week 5"
4) System outputs Week 5 prescription: weight, sets, reps + explanation

## Inputs
- exercise: string
- weeks[1..4]:
  - weight (lb, integer)
  - reps (integer)
  - sets (integer)

## Output
- week5:
  - weight (lb, rounded to 5)
  - reps (integer)
  - sets (integer)
- explanation: 2–4 bullets

## Algorithm v1 (deterministic)
- Compute volume for each week: volume = weight * reps * sets
- Compute trend:
  - If week4 volume >= week3 and week4 weight >= week3: progress => +5 lb
  - Else if week4 volume < week3 for 2 consecutive weeks: deload => -10% weight, same reps/sets
  - Else: hold weight, add 1 rep per set (cap reps at 8); if capped, add 1 set (cap sets at 5)
- Default target scheme: 3x5 unless user’s last week was higher reps, then preserve reps.
- Safety:
  - Max increase: +10 lb
  - Max decrease: -15%
  - Round weight to nearest 5 lb

## Pages
- / (landing with CTA -> /demo)
- /demo (the input form + output)

## Tech
- Next.js App Router + TypeScript + Tailwind
- No auth, no DB for MVP
- All logic runs client-side or in /api/recommend (either is fine)

