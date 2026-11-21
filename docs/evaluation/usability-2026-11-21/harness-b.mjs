#!/usr/bin/env node
// Browser control for usability sessions. Every command acts on the participant's single open tab,
// then prints what is now on screen (accessibility tree, like a screen reader would read it).
//
//   node b.mjs <port> open <url>
//   node b.mjs <port> look [maxLines]          what is on screen now
//   node b.mjs <port> click <role> <name>      role: button | link | checkbox | radio | tab | option | textbox | combobox | row | heading
//   node b.mjs <port> clicktext <visible text>
//   node b.mjs <port> fill <label> <text>
//   node b.mjs <port> select <label> <option>
//   node b.mjs <port> press <key>              e.g. ArrowDown, Enter, j, k
//   node b.mjs <port> upload <n> <path>        n = which file picker on screen (1 = top)
//   node b.mjs <port> wait <text> [seconds]    waits until the text is visible
//   node b.mjs <port> scroll <down|up>
//   node b.mjs <port> shot <name>              saves a screenshot to shots/<name>.png and prints the path
import { chromium } from 'playwright';
import { appendFileSync, mkdirSync } from 'node:fs';
const here = (p) => new URL(p, import.meta.url).pathname;
const [port, cmd, ...args] = process.argv.slice(2);
if (!port || !cmd) { console.log('usage: node b.mjs <port> <command> [...]'); process.exit(1); }
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const ctx = browser.contexts()[0];
const page = ctx.pages().at(-1) ?? (await ctx.newPage());
page.setDefaultTimeout(8000);
const t0 = Date.now();
let result = 'ok';
const log = (o) => appendFileSync(here(`./logs/${port}.jsonl`), JSON.stringify({ at: new Date().toISOString(), port, cmd, args, ...o }) + '\n');

async function withDownload(action) {
  const dl = page.waitForEvent('download', { timeout: 2500 }).catch(() => null);
  await action();
  const d = await dl;
  if (d) {
    mkdirSync(here('./downloads'), { recursive: true });
    const path = here(`./downloads/${port}-${d.suggestedFilename()}`);
    await d.saveAs(path);
    result = `downloaded ${path}`;
  }
}

try {
  switch (cmd) {
    case 'open': await page.goto(args[0], { waitUntil: 'networkidle' }); break;
    case 'look': break;
    case 'click': {
      const [role, ...rest] = args; const name = rest.join(' ');
      await withDownload(() => page.getByRole(role, { name }).first().click());
      break;
    }
    case 'clicktext': await withDownload(() => page.getByText(args.join(' ')).first().click()); break;
    case 'fill': await page.getByLabel(args[0]).first().fill(args.slice(1).join(' ')); break;
    case 'select': await page.getByLabel(args[0]).first().selectOption({ label: args.slice(1).join(' ') }); break;
    case 'press': await page.keyboard.press(args[0]); break;
    case 'upload': {
      // upload <n> <path>: n = which file picker on the screen, counting from 1 (top to bottom)
      const n = Number(args[0]);
      const path = args.slice(1).join(' ');
      await page.locator('input[type=file]').nth(n - 1).setInputFiles(path);
      break;
    }
    case 'wait': await page.getByText(args[0]).first().waitFor({ state: 'visible', timeout: (Number(args[1]) || 90) * 1000 }); break;
    case 'scroll': await page.mouse.wheel(0, args[0] === 'up' ? -600 : 600); break;
    case 'shot': {
      mkdirSync(here('./shots'), { recursive: true });
      const path = here(`./shots/${port}-${args[0] ?? Date.now()}.png`);
      await page.screenshot({ path });
      result = `screenshot ${path}`;
      break;
    }
    default: result = `unknown command ${cmd}`;
  }
} catch (e) {
  result = `FAILED: ${String(e.message).split('\n')[0]}`;
}
await page.waitForTimeout(cmd === 'look' || cmd === 'shot' ? 0 : 600);
const max = cmd === 'look' ? Number(args[0]) || 400 : 160;
let tree = '';
try { tree = await page.locator('body').ariaSnapshot(); } catch (e) { tree = `(could not read the page: ${e.message})`; }
const lines = tree.split('\n');
console.log(`[${cmd}] ${result}  (${Date.now() - t0} ms)  url: ${page.url()}`);
console.log(lines.slice(0, max).join('\n') + (lines.length > max ? `\n… ${lines.length - max} more lines (use: look ${lines.length})` : ''));
log({ result, ms: Date.now() - t0, url: page.url() });
await browser.close().catch(() => {}); // disconnects only; the browser keeps running
