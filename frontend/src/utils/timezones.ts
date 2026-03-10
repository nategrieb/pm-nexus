export const TIMEZONES = [
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
  { value: "America/Anchorage", label: "Alaska (AKST)" },
  { value: "America/Los_Angeles", label: "Pacific (PST)" },
  { value: "America/Denver", label: "Mountain (MST)" },
  { value: "America/Chicago", label: "Central (CST)" },
  { value: "America/New_York", label: "Eastern (EST)" },
  { value: "America/Sao_Paulo", label: "Brazil (BRT)" },
  { value: "Atlantic/Reykjavik", label: "GMT / Iceland" },
  { value: "Europe/London", label: "UK (GMT/BST)" },
  { value: "Europe/Paris", label: "Central Europe (CET)" },
  { value: "Europe/Helsinki", label: "Eastern Europe (EET)" },
  { value: "Asia/Dubai", label: "Gulf (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Australia/Sydney", label: "Australia Eastern (AEST)" },
  { value: "Pacific/Auckland", label: "New Zealand (NZST)" },
] as const;

const TZ_LABEL_MAP: Map<string, string> = new Map(
  TIMEZONES.map((tz) => [tz.value, tz.label])
);

/** Display label for an IANA timezone identifier. */
export function formatTzLabel(tz: string): string {
  return TZ_LABEL_MAP.get(tz) ?? tz;
}

/** Format the current local time in a given IANA timezone, e.g. "3:42 PM". */
export function currentTimeIn(tz: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
