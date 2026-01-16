import { describe, expect, mock, test } from "bun:test";
import { RaindropAPI, RaindropError } from "../src/api/client";

const mockLogger = {
  log: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
};

describe("RaindropAPI", () => {
  describe("dry run mode for write operations", () => {
    test("logs and returns mock for POST", async () => {
      const api = new RaindropAPI("test-token", true, mockLogger);
      const result = await api.addRaindrop({ link: "https://example.com" });

      expect(result).toBeDefined();
      expect(result._id).toBe(0);
      expect(mockLogger.log).toHaveBeenCalled();
    });

    test("logs and returns mock for PUT", async () => {
      const api = new RaindropAPI("test-token", true, mockLogger);
      const result = await api.updateRaindrop(123, { title: "New Title" });

      expect(result).toBeDefined();
      expect(result._id).toBe(0);
    });

    test("returns success for DELETE in dry run", async () => {
      const api = new RaindropAPI("test-token", true, mockLogger);
      const result = await api.deleteRaindrop(123);

      expect(result).toBe(true);
    });

    test("returns success for batch delete in dry run", async () => {
      const api = new RaindropAPI("test-token", true, mockLogger);
      const result = await api.batchDeleteRaindrops(0, [1, 2, 3]);

      expect(result).toBe(true);
    });

    test("returns mock collection for create", async () => {
      const api = new RaindropAPI("test-token", true, mockLogger);
      const result = await api.createCollection({ title: "Test" });

      expect(result).toBeDefined();
      expect(result._id).toBe(0);
    });

    test("returns success for delete tags", async () => {
      const api = new RaindropAPI("test-token", true, mockLogger);
      const result = await api.deleteTags(["old-tag"]);

      expect(result).toBe(true);
    });

    test("returns success for rename tag", async () => {
      const api = new RaindropAPI("test-token", true, mockLogger);
      const result = await api.renameTag("old", "new");

      expect(result).toBe(true);
    });
  });
});

describe("RaindropError", () => {
  test("creates error with message and status", () => {
    const error = new RaindropError("Test error", 404);

    expect(error.message).toBe("Test error");
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe("RaindropError");
  });

  test("creates error with hint", () => {
    const error = new RaindropError("Test error", 400, "Try again");

    expect(error.hint).toBe("Try again");
  });

  test("defaults to 500 status", () => {
    const error = new RaindropError("Test error");

    expect(error.statusCode).toBe(500);
  });

  test("is instanceof Error", () => {
    const error = new RaindropError("Test error");

    expect(error instanceof Error).toBe(true);
    expect(error instanceof RaindropError).toBe(true);
  });
});
