import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../src/fixtures';

// Automated scans catch part of WCAG (contrast, labels, landmarks, ARIA misuse). They run on every
// build so regressions surface early; they don't replace a manual keyboard and screen reader pass.
//
// `known` lists violations already found and written up in README > Findings. They're reported as
// annotations instead of failing the build, so the scan still fails on anything new. Remove an
// entry once the app fixes it.
const pages = [
  { name: 'home', path: '/', ready: 'a[data-test^="product-"]', known: ['list'] },
  { name: 'login', path: '/auth/login', ready: '[data-test="login-form"]', known: ['button-name'] },
  { name: 'contact', path: '/contact', ready: '[data-test="contact-submit"]', known: [] },
];

for (const { name, path, ready, known } of pages) {
  test(`the ${name} page has no new serious or critical WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    await page.locator(ready).first().waitFor();

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

    for (const v of blocking.filter((v) => known.includes(v.id))) {
      test.info().annotations.push({ type: 'known a11y issue', description: `${v.id}: ${v.help}` });
    }
    const unexpected = blocking
      .filter((v) => !known.includes(v.id))
      .map((v) => `${v.id} (${v.nodes.length} element(s)): ${v.help}`);
    expect(unexpected).toEqual([]);
  });
}
