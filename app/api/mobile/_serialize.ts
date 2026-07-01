import Decimal from "decimal.js";

export function toJSON(data: unknown): unknown {
  if (data instanceof Decimal) return data.toFixed(2);
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(toJSON);
  if (data !== null && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, toJSON(v)])
    );
  }
  return data;
}

export function ok(data: unknown) {
  return Response.json(toJSON(data));
}
