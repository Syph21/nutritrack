# NutriTrack Offline

A single-file, offline-first calorie & macro tracker. Zero API keys, zero hosting costs.

Runs as a **website (PWA)** and can be packaged for the **App Store / Play Store** via Capacitor.

## Usage

Open `index.html` in any modern browser. All data is stored locally via `localStorage`.

- **Set Goals**: Click "Set Goals" to run the TDEE calculator (Mifflin-St Jeor).
- **Log Food**: Search the local food database, choose a quantity multiplier and meal, then click "+".
- **Custom Foods**: Add your own items via "Custom Food".
- **Export**: Download today's log as CSV.
- **Reset Day**: Clear today's log.

## Testing

### Quick (no build)
```bash
# Serve the folder over HTTP (service worker needs http/https, not file://)
python3 -m http.server 5173
# then open http://localhost:5173
```
Or: `npm run dev` (uses `serve`).

### What to verify
- Goal calculator saves and updates the summary bars.
- Adding/removing foods updates calories & macros; data persists after reload.
- Custom food CRUD works; delete only on custom items.
- Reset Day clears log; Export CSV downloads a file.
- Offline: DevTools → Network → Offline, reload — app still loads (service worker).
- Install: Chrome address bar "Install" icon appears; installs as standalone window.
- Mobile: DevTools device emulation (iPhone/Android) — layout, safe areas, tap targets.

### Automated sanity check
```bash
npm run lint
```

### PWA audit
Run Lighthouse (Chrome DevTools → Lighthouse → Progressive Web App) on the served URL. Target: installable, offline-capable.

## Building for the App Store (iOS / Android)

Prereqs: Node 18+, Xcode (iOS) / Android Studio (Android), Apple Developer / Google Play accounts.

```bash
npm install
npm run cap:add:ios        # once
npm run cap:add:android    # once
npm run cap:sync           # build web + sync to native projects
npm run cap:open:ios       # open in Xcode -> Archive -> App Store Connect
npm run cap:open:android   # open in Android Studio -> Generate Signed Bundle
```

Native app icons/splash: replace `resources/` assets and run `npx capacitor-assets generate` (see Capacitor docs).

## Building the website
Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages). Deploy the repo root (or `www/` after `npm run build:web`). Ensure HTTPS so the service worker + install prompt work.

## Keyboard Shortcuts
- `/` — focus search
- `Esc` — close modals

## Force-refresh the service worker cache
After deploying changes, the old cache may persist. To force an update:
- Bump `CACHE_NAME` in `sw.js` (already done for this release).
- In Chrome: DevTools → Application → Service Workers → "Unregister", then reload.
- Or DevTools → Application → Storage → "Clear site data", then reload.
- On a phone PWA, uninstall and reinstall, or wait for the new SW to activate (it calls `skipWaiting()`).
Stored in browser `localStorage` under keys `nutri_user_goals`, `nutri_custom_foods`, `nutri_daily_logs`, `nutri_log_history`. Clearing browser data resets everything.

## Data
Stored in browser `localStorage` under keys `nutri_user_goals`, `nutri_custom_foods`, `nutri_daily_logs`, `nutri_log_history`, `nutri_theme`. Clearing browser data resets everything.

## Cloud sync (Supabase) - optional
1. Create a free project at https://supabase.com (sign in with GitHub).
2. In the SQL editor, run:
```sql
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
create policy "users read own" on public.user_data for select using (auth.uid() = user_id);
create policy "users write own" on public.user_data for insert with check (auth.uid() = user_id);
create policy "users update own" on public.user_data for update using (auth.uid() = user_id);
```
3. In Project Settings -> API, copy the Project URL and anon public key.
4. In the app, click Settings (gear) -> paste URL + key -> Save.
5. Sign up / log in. Data syncs to Supabase and pulls on login.

Without Supabase configured, the app works fully offline with local accounts.

