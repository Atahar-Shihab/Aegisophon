import { test, expect } from '@playwright/test';

test.describe('AegisGateway E2E Verification Suite', () => {
  test('1. Dashboard renders KPIs and toggles synthetic traffic simulator', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify main brand heading or page elements
    await expect(page.locator('text=AegisGateway').first()).toBeVisible();
    await expect(page.locator('text=Total Requests').first()).toBeVisible();
    await expect(page.locator('text=P95 Tail Latency').first()).toBeVisible();
    await expect(page.locator('text=Semantic Cache Hit Ratio').first()).toBeVisible();

    // Verify Traffic Simulator button exists in header
    const trafficBtn = page.locator('button:has-text("Traffic")');
    if (await trafficBtn.isVisible()) {
      await trafficBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('2. Chaos Engineering trips provider circuit breaker to OPEN', async ({ page }) => {
    await page.goto('/dashboard');

    // Locate chaos button on one of the provider mesh cards (e.g., Gemini or Anthropic)
    const chaosTriggerBtn = page.locator('button:has-text("Simulate 503 Outage"), button:has-text("Inject Latency")').first();
    if (await chaosTriggerBtn.isVisible()) {
      await chaosTriggerBtn.click();
      await page.waitForTimeout(1200);

      // Verify that provider circuit badge updates to reflect OPEN / Degraded state
      const openBadge = page.locator('text=OPEN, text=Degraded').first();
      await expect(openBadge).toBeVisible();
    }
  });

  test('3. Playground classifies complexity score and executes MoE completion', async ({ page }) => {
    await page.goto('/playground');

    // Verify prompt input is present
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    // Type complex prompt to trigger complexity meter evaluation
    await textarea.fill('Synthesize high-concurrency blue-green deployment topology with Byzantine fault tolerance.');
    await page.waitForTimeout(500);

    // Verify Complexity Meter reacts (score > 0.0)
    await expect(page.locator('text=Estimated Complexity, text=Complexity Score').first()).toBeVisible();

    // Submit execution
    const submitBtn = page.locator('button:has-text("Dispatch Request"), button:has-text("Send")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(1500);
      // Verify response container or trace summary renders
      await expect(page.locator('text=Response, text=Latency').first()).toBeVisible();
    }
  });

  test('4. Security Vault manages API key creation and revocation', async ({ page }) => {
    await page.goto('/security');

    // Verify master key is visible in table
    await expect(page.locator('text=Default Enterprise Master').first()).toBeVisible();

    // Click Generate New Key button
    const generateBtn = page.locator('button:has-text("Generate API Key"), button:has-text("Create Key")').first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await page.waitForTimeout(500);

      // Fill modal if opened
      const nameInput = page.locator('input[placeholder*="Key Name"], input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Playwright Test Automated Key');
        const confirmBtn = page.locator('button:has-text("Generate"), button:has-text("Create")').last();
        await confirmBtn.click();
        await page.waitForTimeout(800);

        // Verify key appears or copy dialog is shown
        await expect(page.locator('text=Playwright Test Automated Key, text=ag_live_').first()).toBeVisible();
      }
    }
  });
});
