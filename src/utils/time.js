export function parseTime(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

export function formatTime(str) {
  const [h, m] = str.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export function formatTime24(str) {
  return str;
}

export function getDurationMinutes(start, end) {
  return parseTime(end) - parseTime(start);
}

export function getDurationLabel(start, end) {
  const mins = getDurationMinutes(start, end);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function getTodayName() {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
}

export function minutesToTime(totalMinutes) {
  const clamped = Math.max(0, Math.min(1439, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function snapTo(minutes, grid = 5) {
  return Math.round(minutes / grid) * grid;
}

export function getWeeklyHours(schedule, categoryKeys) {
  let total = 0;
  for (const day of Object.values(schedule)) {
    for (const block of day) {
      if (categoryKeys.includes(block.category)) {
        total += getDurationMinutes(block.start, block.end);
      }
    }
  }
  return Math.round((total / 60) * 10) / 10;
}
