// Lightweight content-model guardrails — no dedicated test framework exists in this repo
// (package.json only has dev/build/preview), so this is a plain Node script rather than a new
// framework dependency. Run with `npm run validate`. Relies on Node's built-in TypeScript
// stripping (Node 23.6+) to import the .ts data files directly — no build step needed.
// ts-extension-loader.mjs lets those files import each other extensionlessly (the codebase's
// normal Vite/TS style) despite Node's native ESM resolver requiring extensions.

import { register } from 'node:module';
import { readFile } from 'node:fs/promises';

register('./ts-extension-loader.mjs', import.meta.url);

const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

// ── nextWorkshop: the single source of truth must stay internally consistent ──
const { nextWorkshop, workshopStatusCopy } = await import('../src/data/nextWorkshop.ts');

const validStatuses = ['building', 'date-announced', 'registration-open', 'sold-out', 'completed'];
check(validStatuses.includes(nextWorkshop.status), `nextWorkshop.status must be one of ${validStatuses.join(', ')}`);
check(typeof nextWorkshop.ctaLabel === 'string' && nextWorkshop.ctaLabel.length > 0, 'nextWorkshop.ctaLabel must be a non-empty string');
check(typeof nextWorkshop.price === 'string' && nextWorkshop.price.length > 0, 'nextWorkshop.price must be a non-empty string');
check(typeof nextWorkshop.capacity === 'string' && nextWorkshop.capacity.length > 0, 'nextWorkshop.capacity must be a non-empty string');
check(Object.keys(workshopStatusCopy).length === validStatuses.length, 'workshopStatusCopy must have an entry for every WorkshopStatus');

if (nextWorkshop.status === 'building') {
  check(nextWorkshop.date === null, 'While status is "building", date must be null — no fabricated date');
  check(nextWorkshop.registrationUrl === null, 'While status is "building", registrationUrl must be null');
}

// ── events.ts must derive from nextWorkshop, not hardcode a competing date/price ──
const { events } = await import('../src/data/events.ts');
check(Array.isArray(events) && events.length > 0, 'events.ts must export at least one event');
check(events[0].date === nextWorkshop.date, 'events[0].date must match nextWorkshop.date (single source of truth)');
check(events[0].price === nextWorkshop.price, 'events[0].price must match nextWorkshop.price (single source of truth)');

// ── offers.ts: the flagship offer must derive from nextWorkshop, not hardcode competing facts ──
const { offers } = await import('../src/data/offers.ts');
const flagship = offers.find((o) => o.id === 'atelier-decouverte');
check(!!flagship, 'offers.ts must include the atelier-decouverte flagship offer');
if (flagship) {
  check(flagship.price === nextWorkshop.price, 'the flagship offer\'s price must match nextWorkshop.price');
  check(flagship.groupSize === nextWorkshop.capacity, 'the flagship offer\'s groupSize must match nextWorkshop.capacity');
}

// ── faqs.ts sanity ──
const { faqs } = await import('../src/data/faqs.ts');
check(Array.isArray(faqs) && faqs.length >= 10, 'faqs.ts should have a substantial set of questions');
check(faqs.every((f) => f.question && f.answer), 'every FAQ entry needs both a question and an answer');

// ── testimonials.ts: every entry must be honestly labeled while unverified ──
const { testimonials } = await import('../src/data/testimonials.ts');
check(
  testimonials.every((t) => t.isPlaceholder === true),
  'every testimonial must currently be marked isPlaceholder — no real testimonials exist yet'
);

// ── No Event structured data should exist anywhere while status is 'building' ──
if (nextWorkshop.status === 'building') {
  const filesToScan = [
    'src/components/BaseLayout.astro',
    'src/pages/faq.astro',
    'src/pages/index.astro',
    'src/pages/reserver.astro',
    'src/pages/evenements.astro',
  ];
  for (const file of filesToScan) {
    const content = await readFile(new URL(`../${file}`, import.meta.url), 'utf-8');
    check(
      !/"@type":\s*"Event"/.test(content),
      `${file} must not emit Event structured data while nextWorkshop.status is 'building'`
    );
  }
}

// ── form endpoint: never hardcode a live-looking endpoint by accident ──
const formspreeLib = await readFile(new URL('../src/lib/formspree.ts', import.meta.url), 'utf-8');
check(
  !/formspree\.io\/f\/[a-zA-Z0-9]/.test(formspreeLib),
  'src/lib/formspree.ts must not hardcode a real Formspree endpoint — it must come from PUBLIC_FORM_ENDPOINT'
);

if (errors.length > 0) {
  console.error(`✗ ${errors.length} content-model check(s) failed:\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`✓ All content-model checks passed (nextWorkshop, events, faqs, testimonials, structured data, form config).`);
