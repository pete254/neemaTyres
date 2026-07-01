function isDecimalLike(val: unknown): val is { toFixed: (dp: number) => string } {
  return (
    val !== null &&
    typeof val === "object" &&
    "s" in val && "e" in val && "d" in val &&
    typeof (val as Record<string, unknown>).toFixed === "function"
  );
}

export function toJSON(data: unknown): unknown {
  if (isDecimalLike(data)) return data.toFixed(2);
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
