import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const activities = JSON.parse(
  readFileSync(
    new URL('../public/activites.json', import.meta.url),
    'utf8'
  )
);

const types = new Set([
  'atelier',
  'evenement',
  'gym-social',
]);

const statuses = new Set([
  'announced',
  'open',
  'full',
  'cancelled',
]);

const requiredStrings = [
  'slug',
  'title',
  'summary',
  'description',
  'startsAt',
  'endsAt',
  'timezone',
  'location',
  'host',
];

function validate(data) {
  assert.ok(Array.isArray(data), 'Activities must be an array');

  const slugs = new Set();

  for (const activity of data) {
    assert.ok(
      activity && typeof activity === 'object',
      'Invalid activity'
    );

    for (const field of requiredStrings) {
      assert.ok(
        typeof activity[field] === 'string' &&
        activity[field].trim().length > 0,
        `Missing field: ${field}`
      );
    }

    assert.match(
      activity.slug,
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    );

    assert.ok(!slugs.has(activity.slug), 'Duplicate slug');
    slugs.add(activity.slug);

    assert.ok(types.has(activity.type), 'Invalid type');
    assert.ok(statuses.has(activity.status), 'Invalid status');

    assert.equal(activity.timezone, 'America/Toronto');

    for (const field of ['startsAt', 'endsAt']) {
      assert.match(
        activity[field],
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/
      );

      assert.ok(
        Number.isFinite(Date.parse(activity[field])),
        `Invalid date: ${field}`
      );
    }

    assert.ok(
      Date.parse(activity.endsAt) >
      Date.parse(activity.startsAt),
      'End must follow start'
    );

    assert.ok(
      Number.isInteger(activity.priceCents) &&
      activity.priceCents >= 0,
      'Invalid price'
    );

    assert.ok(
      Number.isInteger(activity.capacity) &&
      activity.capacity > 0,
      'Invalid capacity'
    );
  }

  return true;
}

assert.equal(validate([]), true);

assert.throws(() => validate([
  { slug: 'invalid activity' }
]));

validate(activities);

console.log(
  `Redux V1 validation OK: ${activities.length} activities`
);