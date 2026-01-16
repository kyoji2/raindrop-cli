import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { output } from "../src/utils/output";

describe("output", () => {
  let consoleLogs: string[] = [];
  const originalLog = console.log;

  beforeEach(() => {
    consoleLogs = [];
    console.log = mock((msg: string) => {
      consoleLogs.push(msg);
    });
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test("outputs JSON format", () => {
    output({ test: "value" }, "json");
    expect(consoleLogs[0]).toContain('"test"');
    expect(consoleLogs[0]).toContain('"value"');
  });

  test("outputs TOON format", () => {
    output({ test: "value" }, "toon");
    expect(consoleLogs[0]).toBe("test: value");
  });
});
