import { z } from "zod";

export const RaindropUserSchema = z.object({
  _id: z.number(),
  fullName: z.string(),
  email: z.string().optional(),
  avatar: z.string().optional(),
  pro: z.boolean().optional(),
});

export const CollectionSchema = z.object({
  _id: z.number(),
  title: z.string(),
  count: z.number(),
  parent: z.object({ $id: z.number() }).optional(),
  cover: z.array(z.string()).optional(),
  color: z.string().optional(),
  view: z.enum(["list", "simple", "grid", "masonry"]).optional(),
  public: z.boolean().optional(),
  expanded: z.boolean().optional(),
  lastUpdate: z.string().optional(),
  created: z.string().optional(),
  sort: z.number().optional(),
});

export const HighlightSchema = z.object({
  _id: z.string(),
  text: z.string(),
  note: z.string().optional(),
  color: z.string().optional(),
  created: z.string().optional(),
});

export const MediaSchema = z.object({
  link: z.string(),
  type: z.string(),
});

export const RaindropSchema = z.object({
  _id: z.number(),
  title: z.string(),
  link: z.string(),
  excerpt: z.string().optional(),
  note: z.string().optional(),
  type: z.enum(["link", "article", "image", "video", "document", "audio"]).optional(),
  tags: z.array(z.string()),
  cover: z.string().optional(),
  domain: z.string().optional(),
  created: z.string().optional(),
  lastUpdate: z.string().optional(),
  collection: z.object({ $id: z.number() }).optional(),
  highlights: z.array(HighlightSchema).optional(),
  important: z.boolean().optional(),
  removed: z.boolean().optional(),
  media: z.array(MediaSchema).optional(),
});

export const TagSchema = z.object({
  _id: z.string(),
  count: z.number().optional(),
});

export const UserStatsSchema = z.object({
  _id: z.number(),
  count: z.number(),
});

export const UserResponseSchema = z.object({
  result: z.boolean(),
  user: RaindropUserSchema,
});

export const CollectionResponseSchema = z.object({
  result: z.boolean(),
  item: CollectionSchema,
});

export const CollectionsResponseSchema = z.object({
  result: z.boolean(),
  items: z.array(CollectionSchema),
});

export const RaindropResponseSchema = z.object({
  result: z.boolean(),
  item: RaindropSchema,
});

export const RaindropsResponseSchema = z.object({
  result: z.boolean(),
  items: z.array(RaindropSchema),
});

export const TagsResponseSchema = z.object({
  result: z.boolean(),
  items: z.array(TagSchema),
});

export const StatsResponseSchema = z.object({
  result: z.boolean(),
  items: z.array(UserStatsSchema),
});

export const ResultResponseSchema = z.object({
  result: z.boolean(),
  count: z.number().optional(),
});

export const SuggestionsResponseSchema = z.object({
  result: z.boolean(),
  item: z
    .object({
      tags: z.array(z.string()).optional(),
      collections: z.array(CollectionSchema).optional(),
    })
    .optional(),
});

export const CoversResponseSchema = z.object({
  result: z.boolean(),
  items: z.array(
    z.object({
      icons: z.array(z.object({ png: z.string() })).optional(),
    }),
  ),
});
