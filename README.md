# Mindful Momentum

A mobile-first habit tracker for daily rituals, foods to avoid, books, stats, and achievements.

The app works in two modes:

- Local-only: data stays in the current browser through `localStorage`.
- Homelab sync: data is saved to a JSON file on your self-hosted server through `/api/state`.

## Run Locally

Open `index.html` directly for local-only mode, or run the Node server:

```bash
node server.js
```

Then visit:

```text
http://localhost:8080
```

## Self-Host On A Homelab

The Docker setup serves the app and persists data in a Docker volume. There is no sync token; anyone who can reach the app URL can read and write the habit data, so keep it on your private LAN or Tailscale network.

1. Copy or clone this repository onto the Minisforum.
2. Create `.env` from the example:

```bash
cp .env.example .env
```

Optional `.env` value:

```text
APP_PORT=8080
```

3. Start the app:

```bash
docker compose up -d --build
```

4. Open the app from your laptop or phone:

```text
http://<minisforum-ip>:8080
```

The server data is stored in the `habit-data` Docker volume at `/data/state.json` inside the container.

## Tailscale Access

For private mobile access outside your home network:

1. Install Tailscale on the Minisforum and your phone.
2. Keep the compose app running on the Minisforum.
3. Open:

```text
http://<tailscale-device-name>:8080
```

No Supabase or public database is required.

## GitHub Pages

The repo includes `.github/workflows/deploy-pages.yml`, which deploys the static mobile app to GitHub Pages on every push to `main`.

GitHub Pages runs without the Node persistence server, so this version uses browser-local storage only. For cross-device sync, use the homelab URL instead.

One-time repository setting:

1. Open GitHub repo `Settings` -> `Pages`.
2. Under `Build and deployment`, set `Source` to `GitHub Actions`.
3. Push to `main`, then open the `Actions` tab and select `Deploy To GitHub Pages`.

Published URL:

```text
https://<your-github-username>.github.io/<repository-name>/
```

## Useful Commands

```bash
docker compose up -d --build
docker compose logs -f
docker compose down
```

Use a different host port:

```bash
APP_PORT=3000 docker compose up -d --build
```

## GitHub Actions VM Deploy

This repo includes `.github/workflows/deploy-vm.yml`. It runs manually from `Actions` -> `Deploy To VM`.

One-time VM setup:

1. Install Docker and the Docker Compose plugin on the VM.
2. Create a deploy directory or let the workflow use:

```text
$HOME/apps/mindful-momentum
```

3. Add an SSH public key to the VM user's `~/.ssh/authorized_keys`.

Required GitHub repository secrets:

- `VM_HOST` - VM IP address, DNS name, or Tailscale hostname.
- `VM_USER` - SSH user on the VM.
- `VM_SSH_KEY` - private key matching the public key on the VM.

Optional GitHub repository secrets/variables:

- Secret `VM_PORT` - SSH port. Defaults to `22`.
- Variable `APP_PORT` - host port for the app. Defaults to `8080`.
- Variable `DEPLOY_PATH` - remote app path. Defaults to `$HOME/apps/mindful-momentum`.

The workflow uploads the current repository files, writes `.env` on the VM, and runs:

```bash
docker compose up -d --build
```

Your habit data stays in the Docker volume named `habit-data`; deploying new code does not remove that volume.

## Files

- `index.html` - app shell and screens
- `styles.css` - responsive visual system and card layout
- `script.js` - habit state, local persistence, sync client, stats, and interactions
- `server.js` - self-hosted static server and JSON persistence API
- `manifest.webmanifest` - mobile install metadata
- `Dockerfile` - Node image for self-hosting
- `docker-compose.yml` - container runtime config with persistent data volume
- `.github/workflows/deploy-vm.yml` - SSH deployment workflow for your VM
- `.github/workflows/deploy-pages.yml` - static mobile deployment workflow for GitHub Pages
