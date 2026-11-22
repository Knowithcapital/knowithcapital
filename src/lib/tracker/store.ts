import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  applyUpdate, emptyLibrary, libraryFromJson, summarize, totals, SECTIONS,
  type Library, type UpdateInput, type UpdateOutcome,
} from '@/lib/tracker/merge';

const ID = 'library';

export type TrackerSummary = ReturnType<typeof summarize>;

/** The whole library, or null if nothing has been loaded yet (or the table does not exist yet). */
export async function loadLibrary(): Promise<Library | null> {
  try {
    const row = await prisma.trackerData.findUnique({ where: { id: ID }, select: { data: true } });
    if (!row) return null;
    const lib = row.data as unknown as Library;
    return { ...emptyLibrary(), ...lib, quarters: lib.quarters ?? {} };
  } catch (error) {
    console.error('[Tracker] Load failed:', (error as Error).message);
    return null;
  }
}

/** Just the small summary (for the Insights card). */
export async function loadSummary(): Promise<TrackerSummary | null> {
  try {
    const row = await prisma.trackerData.findUnique({ where: { id: ID }, select: { summary: true } });
    return (row?.summary as TrackerSummary | null) ?? null;
  } catch {
    return null;
  }
}

/** Recent updates, newest first. */
export async function loadHistory(limit = 20) {
  try {
    return await prisma.trackerUpdate.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
  } catch {
    return [];
  }
}

async function save(outcome: UpdateOutcome, mode: 'merge' | 'replace', who: string | null, fileName?: string) {
  const lib = outcome.library;
  const summary = summarize(lib) as unknown as Prisma.InputJsonValue;
  const data = lib as unknown as Prisma.InputJsonValue;
  await prisma.$transaction([
    prisma.trackerData.upsert({
      where: { id: ID },
      create: { id: ID, data, summary, updatedBy: who },
      update: { data, summary, updatedBy: who },
    }),
    prisma.trackerUpdate.create({
      data: {
        mode,
        fileName: fileName?.slice(0, 200) ?? null,
        added: outcome.added,
        replaced: outcome.replaced,
        skipped: outcome.skipped.length,
        totals: totals(lib),
        updatedBy: who,
      },
    }),
  ]);
}

/** Merges an update file into the stored library (items with a matching key are replaced). */
export async function mergeUpdate(input: UpdateInput, who: string | null, fileName?: string): Promise<UpdateOutcome> {
  const current = (await loadLibrary()) ?? emptyLibrary();
  const outcome = applyUpdate(current, input);
  // An update that changed nothing and was entirely rejected should not be reported as a success
  const accepted = SECTIONS.reduce((n, s) => n + outcome.added[s] + outcome.replaced[s], 0);
  if (accepted === 0 && !input.meta && !input.quarter_notes) throw new Error(outcome.skipped.length ? `Nothing could be added: ${outcome.skipped[0].reason}` : 'The file has no new items');
  await save(outcome, 'merge', who, fileName);
  return outcome;
}

/** Replaces the whole library with a library.json (used to load or restore the full file). */
export async function replaceLibrary(input: unknown, who: string | null, fileName?: string): Promise<UpdateOutcome> {
  const outcome = libraryFromJson(input);
  await save(outcome, 'replace', who, fileName);
  return outcome;
}
