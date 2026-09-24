# Deadlock Rooms · play across your LAN

Requires Node.js 22 or newer on **one** computer. The two players need modern browsers and the same local network. No installation, account, database, internet connection, or paid service is required for the built release.

From the extracted `site` folder:

```sh
node deadlock-host.mjs
```

The terminal prints the host computer's local network address. Open that exact address with `/boxhead/` on **both** devices. For example, if the terminal prints `http://192.168.1.20:4173/boxhead/`, both players use it. Allow the local network connection if the operating system asks.

1. Player one chooses **LAN → CREATE ROOM**.
2. Player two chooses **LAN**, enters the six-character code, then **JOIN**.
3. Player one chooses co-op survival or first-to-five deathmatch, chooses a room, then **START TOGETHER**.
4. Both players use their own WASD/arrows, Space, mouse aim and Q/E or 1–8 weapon keys. Each device can use touch movement/fire and the toolbar WEAPON button instead.

Keep the host browser tab open. Its simulation is authoritative; the Node host relays state and player input at up to 20/30 updates per second. Losing focus pauses the match. Either player can pause; the host or guest can resume. A missing input stream stops player movement after 0.5 seconds and freezes the match after 2.5 seconds. Reconnecting within 30 seconds retains the room. Closing/leaving a room returns both players to the menu. There is no host migration or internet matchmaking.

Use another port if needed:

```sh
PORT=4180 node deadlock-host.mjs
```

On Windows PowerShell:

```powershell
$env:PORT=4180; node deadlock-host.mjs
```

The LAN host binds to all interfaces by default. For play on one computer only, set `HOST=127.0.0.1`. Serve a different extracted site folder with `node deadlock-host.mjs /path/to/site` or `SITE_ROOT=/path/to/site node deadlock-host.mjs`.

If a second device cannot reach the address, ensure it is on the same network and that the host's firewall allows the selected port. Guest Wi-Fi networks may isolate devices. A static web server supports solo and local two-player modes; the bundled host is needed for LAN.

Source checkout commands (after development dependencies have been installed):

```sh
npm run build
node tooling/deadlock-host.mjs
```
