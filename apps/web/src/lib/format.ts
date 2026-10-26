export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/** For YYYY-MM-DD dates, avoiding timezone shifts. */
export const formatDay = (day: string | null | undefined) =>
  day
    ? new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

export const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

export const daysSince = (day: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(`${day}T00:00:00`).getTime()) / 86_400_000));

export const agoText = (days: number) =>
  days === 0
    ? 'today'
    : days === 1
      ? 'yesterday'
      : days < 60
        ? `${days} days ago`
        : `${Math.round(days / 30)} months ago`;

export const uniqueSorted = (values: (string | null | undefined)[]) =>
  [...new Set(values.map((v) => (v ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
