const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** Terima string datetime-local ("YYYY-MM-DDTHH:mm[:ss]"), perlakukan eksplisit sebagai WIB (UTC+7). */
export function parseWibDatetimeLocal(value: string): Date {
  if (!value || !DATETIME_LOCAL_RE.test(value)) {
    throw new Error("invalid datetime-local value: " + JSON.stringify(value));
  }
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}+07:00`);
}

type WibParts = { year: string; month: string; day: string; hour: string; minute: string };

function wibParts(date: Date): WibParts {
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
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** Format Date (tersimpan UTC-internal) kembali ke tampilan WIB, deterministik lintas locale. */
export function formatWib(date: Date): string {
  const { year, month, day, hour, minute } = wibParts(date);
  return `${year}-${month}-${day} ${hour}:${minute} WIB`;
}

/** Format Date ke string kompatibel input datetime-local ("YYYY-MM-DDTHH:mm") dalam WIB. */
export function formatWibForInput(date: Date): string {
  const { year, month, day, hour, minute } = wibParts(date);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
