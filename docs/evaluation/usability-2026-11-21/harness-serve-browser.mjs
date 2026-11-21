// Starts one long-lived Chromium for a test participant, reachable over CDP on the given port.
// usage: node serve-browser.mjs <name> <port>
import { chromium } from 'playwright';
const [name, port] = process.argv.slice(2);
const ctx = await chromium.launchPersistentContext(new URL(`./profiles/${name}`, import.meta.url).pathname, {
  headless: true,
  viewport: { width: 1366, height: 768 }, // a typical shared ward PC
  acceptDownloads: true,
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
  args: [`--remote-debugging-port=${port}`, '--disable-blink-features=AutomationControlled'],
});
if (!ctx.pages().length) await ctx.newPage();
console.log(`browser for ${name} ready on ${port}`);
await new Promise(() => {}); // keep running
