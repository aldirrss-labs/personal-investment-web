/** Terima string datetime-local ("YYYY-MM-DDTHH:mm[:ss]"), perlakukan eksplisit sebagai WIB (UTC+7). */
export function parseWibDatetimeLocal(value: string): Date {
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}+07:00`);
}

/** Format Date (tersimpan UTC-internal) kembali ke tampilan WIB, deterministik lintas locale. */
export function formatWib(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} WIB`;
}
