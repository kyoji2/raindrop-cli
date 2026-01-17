import { describe, expect, test } from "bun:test";
import {
  CollectionSchema,
  CollectionsResponseSchema,
  RaindropSchema,
  RaindropsResponseSchema,
  TagSchema,
  TagsResponseSchema,
  UserResponseSchema,
} from "../src/api/schemas";

describe("Schema validation with null values", () => {
  describe("CollectionSchema", () => {
    test("accepts null for optional parent field", () => {
      const data = {
        _id: 123,
        title: "Test Collection",
        count: 10,
        parent: null,
      };

      const result = CollectionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("accepts object for parent field", () => {
      const data = {
        _id: 123,
        title: "Test Collection",
        count: 10,
        parent: { $id: 456 },
      };

      const result = CollectionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("accepts undefined for optional fields", () => {
      const data = {
        _id: 123,
        title: "Test Collection",
        count: 10,
      };

      const result = CollectionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("accepts null for all optional fields", () => {
      const data = {
        _id: 123,
        title: "Test Collection",
        count: 10,
        parent: null,
        cover: null,
        color: null,
        view: null,
        public: null,
        expanded: null,
        lastUpdate: null,
        created: null,
        sort: null,
      };

      const result = CollectionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("CollectionsResponseSchema", () => {
    test("accepts collections with null parent values", () => {
      const data = {
        result: true,
        items: [
          { _id: 1, title: "Collection 1", count: 5, parent: null },
          { _id: 2, title: "Collection 2", count: 3, parent: null },
          { _id: 3, title: "Collection 3", count: 0, parent: { $id: 1 } },
        ],
      };

      const result = CollectionsResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("RaindropSchema", () => {
    test("accepts null for optional collection field", () => {
      const data = {
        _id: 123,
        title: "Test Raindrop",
        link: "https://example.com",
        tags: ["test"],
        collection: null,
      };

      const result = RaindropSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("accepts null for all optional fields", () => {
      const data = {
        _id: 123,
        title: "Test Raindrop",
        link: "https://example.com",
        tags: [],
        excerpt: null,
        note: null,
        type: null,
        cover: null,
        domain: null,
        created: null,
        lastUpdate: null,
        collection: null,
        highlights: null,
        important: null,
        removed: null,
        media: null,
      };

      const result = RaindropSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("RaindropsResponseSchema", () => {
    test("accepts raindrops with null optional fields", () => {
      const data = {
        result: true,
        items: [
          {
            _id: 1,
            title: "Raindrop 1",
            link: "https://example.com",
            tags: ["tag1"],
            collection: null,
            excerpt: null,
          },
        ],
      };

      const result = RaindropsResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("TagSchema", () => {
    test("accepts null for count field", () => {
      const data = {
        _id: "test-tag",
        count: null,
      };

      const result = TagSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("accepts number for count field", () => {
      const data = {
        _id: "test-tag",
        count: 42,
      };

      const result = TagSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("TagsResponseSchema", () => {
    test("accepts tags response with various count values", () => {
      const data = {
        result: true,
        items: [{ _id: "tag1", count: 10 }, { _id: "tag2", count: null }, { _id: "tag3" }],
      };

      const result = TagsResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("UserResponseSchema", () => {
    test("accepts user with null optional fields", () => {
      const data = {
        result: true,
        user: {
          _id: 123,
          fullName: "Test User",
          email: null,
          avatar: null,
          pro: null,
        },
      };

      const result = UserResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
