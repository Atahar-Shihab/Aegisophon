import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function main() {
  const outDir = path.join(process.cwd(), 'docs', 'screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const routes = [
    { url: 'http://localhost:3000/dashboard', name: '01-dashboard-dag-topology.png' },
    { url: 'http://localhost:3000/traces', name: '02-trace-waterfall.png' },
    { url: 'http://localhost:3000/playground', name: '03-time-travel-playground.png' },
    { url: 'http://localhost:3000/policies', name: '04-finops-policies.png' },
    { url: 'http://localhost:3000/security', name: '05-security-keys-audit.png' },
    { url: 'http://localhost:3000/docs', name: '06-api-reference-docs.png' },
  ];

  for (const r of routes) {
    console.log(`Capturing ${r.url} -> ${r.name}...`);
    await page.goto(r.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, r.name), fullPage: false });
  }

  await browser.close();
  console.log('All screenshots captured successfully into docs/screenshots/!');
}

main().catch(console.error);
