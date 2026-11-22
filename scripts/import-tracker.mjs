#!/usr/bin/env node
// Loads a Quarterly Results Tracker file into the database, using the same rules as Admin → Results Tracker.
//
//   npm run tracker:import -- <path to library.json>            replaces the whole tracker
//   npm run tracker:import -- <path to new.json> --merge        adds / replaces matching items
//
// Uses the database in POSTGRES_PRISMA_URL (.env / .env.local). Needs Node 22.18+ (it reads the TypeScript rules directly).
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { applyUpdate, emptyLibrary, libraryFromJson, summarize, totals } from '../src/lib/tracker/merge.ts';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const merge = args.includes('--merge');
if (!file) {
  console.error('Usage: npm run tracker:import -- <file.json> [--merge]');
  process.exit(1);
}

const input = JSON.parse(fs.readFileSync(file, 'utf8'));
const prisma = new PrismaClient();
try {
  let outcome;
  if (merge) {
    const row = await prisma.trackerData.findUnique({ where: { id: 'library' }, select: { data: true } });
    outcome = applyUpdate(row ? { ...emptyLibrary(), ...row.data } : emptyLibrary(), input);
  } else {
    outcome = libraryFromJson(input);
  }
  const lib = outcome.library;
  await prisma.$transaction([
    prisma.trackerData.upsert({
      where: { id: 'library' },
      create: { id: 'library', data: lib, summary: summarize(lib), updatedBy: 'import script' },
      update: { data: lib, summary: summarize(lib), updatedBy: 'import script' },
    }),
    prisma.trackerUpdate.create({
      data: {
        mode: merge ? 'merge' : 'replace', fileName: file.split(/[\/]/).pop(),
        added: outcome.added, replaced: outcome.replaced, skipped: outcome.skipped.length,
        totals: totals(lib), updatedBy: 'import script',
      },
    }),
  ]);
  console.log('Done.', merge ? 'Merged.' : 'Library replaced.');
  console.log('Added:', outcome.added, '\nReplaced:', outcome.replaced, '\nSkipped:', outcome.skipped.length);
  console.log('Totals:', totals(lib));
  for (const s of outcome.skipped.slice(0, 10)) console.log('  skipped', s.section, '-', s.reason, s.sample);
} finally {
  await prisma.$disconnect();
}
