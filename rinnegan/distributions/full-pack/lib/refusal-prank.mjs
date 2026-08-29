import { constants } from "node:fs";
import { access, chmod, lstat, mkdtemp, realpath, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const DEFAULT_DEADLINE_MS = 8000;

const PAGE = `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Visual refusal prank</title>
<style>
html,body,canvas{width:100%;height:100%;margin:0;overflow:hidden;background:#000}canvas{display:block}
#banner{position:fixed;inset:0;display:grid;place-items:center;color:#f00;background:#000;font:900 clamp(3rem,10vw,10rem)/1 monospace;text-align:center;opacity:0;transition:opacity .25s;text-shadow:0 0 22px #f00}
#note{position:fixed;left:1rem;bottom:1rem;color:#aaa;font:14px monospace}body.reveal #banner{opacity:1}
</style>
<canvas id="matrix" aria-hidden="true"></canvas><div id="banner">1337 SUPA HAX0R'd</div><div id="note">visual-only localhost prank · no system access</div>
<script>
const c=document.getElementById('matrix'),x=c.getContext('2d');let drops=[];
function size(){c.width=innerWidth;c.height=innerHeight;drops=Array(Math.ceil(c.width/18)).fill(1)}
function draw(){x.fillStyle='rgba(0,0,0,.08)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#0f0';x.font='16px monospace';drops.forEach((y,i)=>{x.fillText(String.fromCharCode(0x30A0+Math.random()*96),i*18,y*18);if(y*18>c.height&&Math.random()>.975)drops[i]=0;drops[i]++})}
addEventListener('resize',size);size();setInterval(draw,40);setTimeout(()=>document.body.classList.add('reveal'),1800);
</script></html>`;

async function executable(candidate) {
  try {
    await access(candidate, constants.X_OK);
    const canonical = await realpath(candidate);
    const metadata = await lstat(canonical);
    return metadata.isFile() ? canonical : null;
  } catch {
    return null;
  }
}

async function findBrowser(injected) {
  if (injected) {
    if (!path.isAbsolute(injected)) throw new Error("injected browser path must be absolute");
    const resolved = await executable(injected);
    if (!resolved) throw new Error("injected browser is not an executable regular file");
    return resolved;
  }
  for (const directory of (process.env.PATH || "").split(path.delimiter)) {
    if (!directory || !path.isAbsolute(directory)) continue;
    for (const name of ["google-chrome", "chromium", "chromium-browser"]) {
      const resolved = await executable(path.join(directory, name));
      if (resolved) return resolved;
    }
  }
  return null;
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function launchRefusalPrank({ browserPath, runtimeBase, deadlineMs = DEFAULT_DEADLINE_MS } = {}) {
  if (!Number.isInteger(deadlineMs) || deadlineMs < 250 || deadlineMs > DEFAULT_DEADLINE_MS) {
    throw new Error("refusal prank deadline must be between 250 and 8000 milliseconds");
  }
  const baseValue = runtimeBase || process.env.XDG_RUNTIME_DIR || tmpdir();
  if (!path.isAbsolute(baseValue)) throw new Error("refusal prank runtime base must be absolute");
  const base = path.resolve(baseValue);
  const [canonicalBase, baseMetadata] = await Promise.all([realpath(base), lstat(base)]);
  if (canonicalBase !== base || baseMetadata.isSymbolicLink() || !baseMetadata.isDirectory()) {
    throw new Error("refusal prank runtime base must be a canonical non-symlink directory");
  }
  const runtime = await mkdtemp(path.join(base, "myagents-refusal-"));
  await chmod(runtime, 0o700);
  const artifact = path.join(runtime, "refusal.html");
  await writeFile(artifact, PAGE, { encoding: "utf8", mode: 0o600, flag: "wx" });
  const browser = await findBrowser(browserPath);
  if (!browser) return { artifact, browser: null, url: null };

  const server = createServer((request, response) => {
    if (request.method !== "GET" || request.url !== "/") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      response.end("not found\n");
      return;
    }
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(PAGE);
  });
  const address = await listen(server);
  const url = `http://127.0.0.1:${address.port}/`;
  const child = spawn(browser, [
    "--new-window", "--start-fullscreen", `--app=${url}`,
    `--user-data-dir=${path.join(runtime, "browser-profile")}`,
    "--no-first-run", "--no-default-browser-check",
  ], { detached: true, shell: false, stdio: "ignore" });
  child.on("error", () => {});
  child.unref();
  try {
    await delay(deadlineMs);
  } finally {
    await close(server);
    try { process.kill(-child.pid, "SIGTERM"); } catch {}
    await delay(150);
    try { process.kill(-child.pid, "SIGKILL"); } catch {}
  }
  return { artifact, browser, url };
}
