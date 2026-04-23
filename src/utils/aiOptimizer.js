import { parseTime, minutesToTime } from './time';

const ACTIVE_HOURS = {
  normal: { start: 420, end: 1350 },  // 7:00 AM – 22:30
  exam:   { start: 420, end: 1380 },  // 7:00 AM – 23:00
  break:  { start: 480, end: 1350 },  // 8:00 AM – 22:30
};

const MIN_SLOT = 30;   // minimum gap worth filling (minutes)
const MAX_BLOCK = 60;  // cap a single AI block at 60 min
const BUFFER = 5;      // breathing room between consecutive AI blocks
const MAX_AI_BLOCKS = 8;

/**
 * Find free time slots between existing blocks within active hours.
 */
export function findFreeSlots(blocks, activeStart, activeEnd) {
  const sorted = blocks
    .map((b) => ({ start: parseTime(b.start), end: parseTime(b.end) }))
    .filter((b) => b.end > activeStart && b.start < activeEnd)
    .sort((a, b) => a.start - b.start);

  const slots = [];
  let cursor = activeStart;

  for (const block of sorted) {
    const gapStart = Math.max(cursor, activeStart);
    const gapEnd = Math.min(block.start, activeEnd);
    if (gapEnd - gapStart >= MIN_SLOT) {
      slots.push({ start: gapStart, end: gapEnd });
    }
    cursor = Math.max(cursor, block.end);
  }

  if (cursor < activeEnd && activeEnd - cursor >= MIN_SLOT) {
    slots.push({ start: cursor, end: activeEnd });
  }

  return slots;
}

/**
 * Pick the best suggestion that hasn't been over-used yet.
 */
function pickSuggestion(suggestions, usage) {
  const weighted = suggestions
    .map((s) => ({
      ...s,
      adjusted: s.score - (usage[s.course.id] || 0) * 25,
    }))
    .filter((s) => s.adjusted > 0)
    .sort((a, b) => b.adjusted - a.adjusted);

  return weighted[0] || null;
}

/**
 * Generate AI-optimised study blocks to fill free time.
 *
 * @param {Array} mergedBlocks  – current visible blocks for the day
 * @param {Array} suggestions   – output of generateStudySuggestions()
 * @param {string} phase        – 'normal' | 'exam' | 'break'
 * @returns {Array}             – new block objects (without id/custom/ai flags)
 */
export function generateAiBlocks(mergedBlocks, suggestions, phase) {
  const hours = ACTIVE_HOURS[phase] || ACTIVE_HOURS.normal;
  const freeSlots = findFreeSlots(mergedBlocks, hours.start, hours.end);

  if (!freeSlots.length || !suggestions.length) return [];

  const blocks = [];
  const usage = {};

  for (const slot of freeSlots) {
    let cursor = slot.start;

    while (cursor + MIN_SLOT <= slot.end && blocks.length < MAX_AI_BLOCKS) {
      const suggestion = pickSuggestion(suggestions, usage);
      if (!suggestion) break;

      const remaining = slot.end - cursor;
      const duration = Math.min(
        suggestion.suggestedMinutes || 45,
        remaining,
        MAX_BLOCK,
      );

      if (duration < MIN_SLOT) break;

      blocks.push({
        start: minutesToTime(cursor),
        end: minutesToTime(cursor + duration),
        category: 'study',
        note: `${suggestion.course.name} — ${suggestion.action}`,
      });

      usage[suggestion.course.id] = (usage[suggestion.course.id] || 0) + 1;
      cursor += duration + BUFFER;
    }
  }

  return blocks;
}
