/** Общие хелперы для полей произвольного JSON-объекта (attributes/settings/address/options). */

export function isValidJsonObject(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

export function parseJsonObject(text: string): Record<string, unknown> | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function stringifyJsonObject(value: Record<string, unknown> | null | undefined): string {
  if (!value || Object.keys(value).length === 0) return '';
  return JSON.stringify(value, null, 2);
}
