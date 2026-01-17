import { tmpdir } from "node:os";
import { join } from "node:path";

export function getTempFilePath(prefix: string, ext: string): string {
  return join(tmpdir(), `${prefix}-${crypto.randomUUID()}${ext}`);
}
