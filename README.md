# Beacon Lab

A development fork of [Beacon](https://github.com/asachs01/beacon), maintained at
[chrisevans3d/beacon](https://github.com/chrisevans3d/beacon).

## Install alongside the original in Home Assistant

1. Back up the original Beacon add-on and the touchscreen browser profile.
2. In Settings → Apps/Add-ons → Store → ⋮ → Repositories, add
   `https://github.com/chrisevans3d/beacon`.
3. Refresh the store, select **Beacon Lab**, and install. Home Assistant builds
   the add-on locally from `beacon/`; no published GHCR image is required.
4. Start it, inspect its logs, and choose **Open Web UI**. Keep the original
   Beacon installed until the fork has been tested.
5. Configure and test the fork before changing the touchscreen kiosk URL.

Beacon Lab has its own `beacon_lab` slug, sidebar label, ingress route and
add-on data directory. Both instances use container port 3000 without a host
port conflict. Supported targets are amd64 and aarch64; 32-bit armv7 is not
advertised because the Node 24 build image does not support it.

The fork does not automatically install upstream voice files into Home
Assistant's shared configuration. Settings and browser-local data do not
migrate automatically. Both instances still access the same HA entities, so
calendar, task and service actions can affect real household data.

### Features in this fork

- **Grounded** in the sidebar: add, edit and restore per-child restrictions for
  iPad, PC gaming and Pouch time choosing, with distinct tablet/gamepad/TV icons.
  Set an optional local end time for automatic expiry, or restore manually.
  Add the **Grounded** card through the Advanced Dashboard card picker to show
  active restrictions. Existing parent PINs lock editing for two minutes per
  unlock; without a configured parent PIN, editing is available. This is a UI
  lock, not server authorization or actual device blocking. Add-on records are
  saved centrally, with other open displays refreshed every 15 seconds. Avoid
  simultaneous edits from multiple displays (the shared store has no locking).
- Display settings: optional scheduled screensaver, defaulting to midnight–7 AM
  in the device's local time. Touch to wake; idle timeout applies afterward.
- Appearance → Advanced Dashboard → Edit Dashboard → Add card:
  **Family Weather & Night Sky**, with three-day clothing advice, freezing
  temperature flags and hourly cloud outlooks for three nights. Availability
  depends on the HA weather provider. The 6 PM–6 AM planning window is not a
  calculation of astronomical darkness.

### Development and updates

Work in the existing checkout: `npm ci`, `npm test -- --maxWorkers=4`,
`npm run build`, and `npm run dev`. Source changes must also be mirrored into
`beacon/src/`; check with `bash scripts/check-beacon-sync.sh`.

For a new installable release, keep both config.yaml versions equal and bump
that version, push the changes to the repository's default branch, then refresh
Home Assistant's store and update Beacon Lab. Fork Actions must be enabled if
using the automated release workflow. Optional container publishing targets
`ghcr.io/chrisevans3d/beacon-lab`; installation does not depend on it.

---

## Upstream documentation



<p align="center">
  <img src="src/assets/beacon-logo-main.png" alt="Beacon" width="280" />
</p>

<h3 align="center">Your family's daily signal</h3>

<p align="center">
  <a href="https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fasachs01%2Fbeacon"><img src="https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg" alt="Add to Home Assistant" /></a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://github.com/asachs01/beacon/releases"><img src="https://img.shields.io/github/v/release/asachs01/beacon" alt="Version" /></a>
  <a href="https://github.com/asachs01/beacon/stargazers"><img src="https://img.shields.io/github/stars/asachs01/beacon" alt="Stars" /></a>
  <a href="https://github.com/sponsors/asachs01"><img src="https://img.shields.io/badge/sponsor-♥-ea4aaa.svg" alt="GitHub Sponsors" /></a>
  <a href="https://buymeacoffee.com/aaronsachs"><img src="https://img.shields.io/badge/buy%20me%20a%20coffee-☕-yellow.svg" alt="Buy Me A Coffee" /></a>
</p>

<p align="center">
  Beacon is a free, open-source family command center for wall-mounted displays. It runs as a Home Assistant add-on or standalone — turn any tablet or spare screen into a beautiful family dashboard with no subscription fees and no cloud dependency.
</p>

<p align="center">
  <img src="src/assets/beacon-mockup-dark-light.png" alt="Beacon screenshot showing dark and light themes" width="720" />
</p>

---

## Skylight alternative — without the subscription

Skylight is a polished wall calendar that charges for hardware **and** locks meal planning, photos, and other family features behind Calendar Plus (~$79/year). Beacon is the self-hosted answer: run it as a Home Assistant add-on (or standalone), keep data on your network, and use any tablet you already own.

→ [Getting started](https://beacon-family-docs.netlify.app/docs/getting-started/welcome/) · [Beacon vs Skylight](https://beacon-family-docs.netlify.app/docs/getting-started/skylight-alternative/) · Install with the Home Assistant badge above

## Features

- **Weekly Calendar** -- Beautiful week view with color-coded family members; supports HA calendar entities and a built-in local calendar
- **Grocery & Shopping Lists** -- AnyList, Home Assistant Shopping List, and local list support
- **Task / Todo Lists** -- Home Assistant todo entities and local task lists with dashboard integration
- **Chore Tracking** -- Assign chores, track streaks, and celebrate completions with a family leaderboard
- **Music Controls** -- Control Music Assistant, Home Assistant media players, and browse playlists from the display
- **Photo Slideshow** -- Display family photos between interactions
- **Timer / Countdown** -- On-screen timer for cooking, homework, and more
- **Screen Saver** -- Automatic screen saver with clock overlay
- **Weather** -- Real-time weather from your Home Assistant weather entity
- **8+ Themes** -- Skylight, Midnight, Midnight Light, Nord, Dracula, Monokai, Rose, Forest, and dark mode (automatic or manual)
- **Family Management** -- Per-member colors, calendar filtering, and PIN-based profiles
- **Meal Planning** -- Meal plan bar with weekly dinner overview
- **Standalone Mode** -- Works without Home Assistant using local calendars, lists, and tasks

## Installation

### Home Assistant Add-on (Recommended)

The fastest way to get started is the one-click button:

[![Add to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fasachs01%2Fbeacon)

Or install manually:

1. In Home Assistant, go to **Settings > Add-ons > Add-on Store**
2. Click the overflow menu (**...**) and select **Repositories**
3. Add: `https://github.com/asachs01/beacon`
4. Find **Beacon** in the store and click **Install**
5. Start the add-on and click **Open Web UI**

> **Tip:** For the best experience on a wall-mounted tablet, enable **Show in sidebar** in the add-on's Info tab so Beacon is one tap away.

### Standalone / Development

```bash
git clone https://github.com/asachs01/beacon.git
cd beacon
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Beacon works fully without Home Assistant — calendars, lists, and tasks are stored locally in the browser.

## Configuration

Beacon is configured through the Home Assistant add-on options panel:

| Option | Default | Description |
|--------|---------|-------------|
| `weather_entity` | `weather.home` | Home Assistant weather entity ID |

Additional settings (themes, family members, chores, calendar sources, list providers) are configured through the Beacon UI itself.

## Why Beacon?

- **Free & open source** — no subscriptions, no cloud accounts, no vendor lock-in
- **Private by design** — all data stays on your network; nothing phones home
- **Home Assistant native** — deep integration with calendars, media players, lists, weather, and more
- **Works standalone** — built-in local calendar, task lists, and shopping lists work without HA
- **Fully themeable** — 8+ themes with automatic dark mode
- **Voice & LLM ready** — MCP server, voice API, and HA custom sentences for hands-free control

## Built With

- [React 19](https://react.dev/) -- UI framework
- [TypeScript](https://www.typescriptlang.org/) -- Type safety
- [Vite](https://vitejs.dev/) -- Build tool
- [Home Assistant](https://www.home-assistant.io/) -- Smart home platform
- [Capacitor](https://capacitorjs.com/) -- Native iOS/Android builds
- [Lucide](https://lucide.dev/) -- Icons
- [date-fns](https://date-fns.org/) -- Date utilities

## Documentation

- [Getting Started Guide](docs/getting-started.md) -- full walkthrough with screenshots
- [AI and Voice Control](docs/ai-integration.md) -- voice API, MCP server for LLM agents, HA Assist custom sentences
- [Contributing Guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Security Policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [License](LICENSE)

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

## Support Beacon

Beacon is free and always will be. If it's useful to your family, consider supporting development:

<p>
  <a href="https://github.com/sponsors/asachs01"><img src="https://img.shields.io/badge/GitHub_Sponsors-♥_Sponsor-ea4aaa?style=for-the-badge&logo=github" alt="GitHub Sponsors" /></a>
  <a href="https://buymeacoffee.com/aaronsachs"><img src="https://img.shields.io/badge/Buy_Me_A_Coffee-☕_Support-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee" /></a>
</p>

## License

Beacon is [MIT licensed](LICENSE). Copyright 2026 Aaron Sachs.
