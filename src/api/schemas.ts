import { z } from "zod";

export const RaindropUserSchema = z.object({
  _id: z.number(),
  fullName: z.string(),
  email: z.string().nullish(),
  avatar: z.string().nullish(),
  pro: z.boolean().nullish(),
});

export const CollectionSchema = z.object({
  _id: z.number(),
  title: z.string(),
  count: z.number(),
  parent: z.object({ $id: z.number() }).nullish(),
  cover: z.array(z.string()).nullish(),
  color: z.string().nullish(),
  view: z.enum(["list", "simple", "grid", "masonry"]).nullish(),
  public: z.boolean().nullish(),
  expanded: z.boolean().nullish(),
  lastUpdate: z.string().nullish(),
  created: z.string().nullish(),
  sort: z.number().nullish(),
});

export const HighlightSchema = z.object({
  _id: z.string(),
  text: z.string(),
  note: z.string().nullish(),
  color: z.string().nullish(),
  created: z.string().nullish(),
});

export const MediaSchema = z.object({
  link: z.string(),
  type: z.string(),
});

export const RaindropSchema = z.object({
  _id: z.number(),
  title: z.string(),
  link: z.string(),
  excerpt: z.string().nullish(),
  note: z.string().nullish(),
  type: z.enum(["link", "article", "image", "video", "document", "audio"]).nullish(),
  tags: z.array(z.string()),
  cover: z.string().nullish(),
  domain: z.string().nullish(),
  created: z.string().nullish(),
  lastUpdate: z.string().nullish(),
  collection: z.object({ $id: z.number() }).nullish(),
  highlights: z.array(HighlightSchema).nullish(),
  important: z.boolean().nullish(),
  removed: z.boolean().nullish(),
  media: z.array(MediaSchema).nullish(),
});

export const TagSchema = z.object({
  _id: z.string(),
  count: z.number().nullish(),
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
  count: z.number().nullish(),
});

export const SuggestionsResponseSchema = z.object({
  result: z.boolean(),
  item: z
    .object({
      tags: z.array(z.string()).nullish(),
      collections: z.array(CollectionSchema).nullish(),
    })
    .nullish(),
});

export const CoversResponseSchema = z.object({
  result: z.boolean(),
  items: z.array(
    z.object({
      icons: z.array(z.object({ png: z.string() })).nullish(),
    }),
  ),
});
