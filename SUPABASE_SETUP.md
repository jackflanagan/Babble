# Supabase leaderboard setup

`src/sdk.js` already has the client code for this (`submitScore`, `fetchLeaderboard`) — it's just pointed at an empty `LB_URL`/`LB_KEY`, which makes `lbEnabled()` return `false` and everything no-op (the leaderboard UI shows "⚠ Leaderboard not configured yet."). This doc covers what to create in Supabase so those two lines can actually be filled in.

## 1. Schema

`submitScore(locationId, playerName, scoreVal, cb)` POSTs `{ location_id, player_name, score }` to `{LB_URL}/rest/v1/scores`. `fetchLeaderboard(locationId, cb)` GETs the same table filtered by `location_id`, ordered by `score.desc`, limited to 15, selecting `player_name, score, created_at`. Run this in the Supabase SQL editor:

```sql
create table scores (
  id bigint generated always as identity primary key,
  location_id text not null,
  player_name text not null,
  score integer not null check (score >= 0 and score <= 50000),
  created_at timestamptz not null default now()
);

alter table scores enable row level security;

-- anon can insert a score...
create policy "anon insert" on scores
  for insert to anon
  with check (true);

-- ...and read the leaderboard...
create policy "anon select" on scores
  for select to anon
  using (true);

-- ...but never update or delete existing rows (no policies for those = denied by default under RLS).
```

The `location_id` values Babble sends are the location ids from `src/levels.js` (`glasgow`, `modena`, `paris`, `ireland`, `kenya`, `athens`, `tokyo`, `brazil`, `newyork`, `boss`) plus the literal string `'adventure'` for the whole-campaign leaderboard (see `main.js`'s `adventureComplete ? 'adventure' : state.currentLocationId'`).

## 2. Getting `LB_URL` / `LB_KEY`

In your Supabase project: Project Settings → API. `LB_URL` is the "Project URL" (e.g. `https://xyzxyz.supabase.co`). `LB_KEY` is the `anon` `public` key (**not** the `service_role` key — never put that one in client code, it bypasses RLS entirely).

## 3. Wiring it in

Just paste both into `src/sdk.js`:

```js
var LB_URL  = 'https://xyzxyz.supabase.co';
var LB_KEY  = 'eyJ...';   // the anon/public key
```

**On "not hardcoded/committed":** Supabase's anon key is *designed* to be exposed in client code — that's the standard Supabase model. It isn't a secret the way a database password or `service_role` key is; the actual security boundary is the RLS policies above, not keeping this key hidden. Committing it alongside the URL is normal practice for a public Supabase project, and is what's recommended here. If you'd still rather keep your specific instance out of the public repo (e.g. to stop randos who clone the repo from hitting your exact database), the lightweight option is a gitignored local file you import instead of hardcoding — happy to wire that up if you want it, but it's extra indirection for a value that isn't actually sensitive, so it's not built by default.

After filling these in: `node build.js`, then test in a browser — clear a level, confirm the name-entry row appears (it's hidden whenever `lbEnabled()` is false), submit a name, and check `#winScoreSubmit` reports success. Open `#overlayLeaderboard` (the 🏆 button) and confirm scores round-trip.

## 4. Abuse-prevention — what's covered and what isn't

**Confirmed: yes, a client can submit an arbitrary score today.** `submitScore()` sends whatever `scoreVal` the caller passes with zero server-side validation of whether that score is plausible for the location/run.

What the schema above does about it:
- `check (score >= 0 and score <= 50000)` — a sanity ceiling, sized well above the highest real single-level target in the game (`levelPerfTarget` tops out around 5400 for Athens per `CLAUDE.md`'s balance notes) with a wide margin for the cumulative `'adventure'` board. This stops garbage/negative/absurd values, nothing more.
- No `update`/`delete` policies for `anon` — existing rows can't be tampered with or wiped by a client, only new rows inserted.

**What this does *not* solve** — a determined client can still POST any score under 50000 directly to the REST endpoint with the anon key (which, as above, is meant to be public) — there's no way to verify a submitted score actually came from a real playthrough without either (a) a Supabase Edge Function that receives a signed/hashed summary of the run and validates it server-side before insert, or (b) rate-limiting/CAPTCHA in front of the endpoint. Neither is built here — flagging it as a known, unsolved limitation for a casual leaderboard, not a guarantee of integrity. If this becomes a real problem (obviously fake top scores), an Edge Function is the right next step, not a bigger `check` constraint.
