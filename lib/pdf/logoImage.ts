import { readFileSync } from "fs";
import { join } from "path";

let _cached: string | null = null;

export function getLogoDataUri(): string {
  if (!_cached) {
    const buf = readFileSync(join(process.cwd(), "public", "tyre-logo.jpg"));
    _cached = `data:image/jpeg;base64,${buf.toString("base64")}`;
  }
  return _cached;
}
