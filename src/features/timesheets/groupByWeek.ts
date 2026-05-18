function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
}

function fmtRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, opt)} – ${end.toLocaleDateString(
    undefined,
    opt
  )}`;
}

export type WeekGroup<T> = { weekKey: string; label: string; items: T[] };

export function groupByWeek<T extends { date: string }>(
  items: readonly T[]
): WeekGroup<T>[] {
  const groups = new Map<string, WeekGroup<T>>();
  for (const item of items) {
    const d = new Date(item.date);
    if (Number.isNaN(d.getTime())) continue;
    const start = startOfWeek(d);
    const key = start.toISOString().slice(0, 10);
    let group = groups.get(key);
    if (!group) {
      group = { weekKey: key, label: fmtRange(start), items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  return [...groups.values()].sort((a, b) =>
    a.weekKey < b.weekKey ? 1 : -1
  );
}
