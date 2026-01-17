import type { z } from "zod";
import type {
  CollectionSchema,
  HighlightSchema,
  MediaSchema,
  RaindropSchema,
  RaindropUserSchema,
  TagSchema,
  UserStatsSchema,
} from "./schemas";

export type RaindropUser = z.infer<typeof RaindropUserSchema>;
export type Collection = z.infer<typeof CollectionSchema>;
export type Highlight = z.infer<typeof HighlightSchema>;
export type Media = z.infer<typeof MediaSchema>;
export type Raindrop = z.infer<typeof RaindropSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;

export interface CollectionCreate {
  title: string;
  parent?: { $id: number };
  public?: boolean;
  view?: "list" | "simple" | "grid" | "masonry";
  sort?: number;
  cover?: string[];
  color?: string;
}

export interface CollectionUpdate {
  title?: string;
  parent?: { $id: number };
  public?: boolean;
  view?: "list" | "simple" | "grid" | "masonry";
  sort?: number;
  cover?: string[];
  color?: string;
  expanded?: boolean;
}

export interface RaindropCreate {
  link: string;
  title?: string;
  excerpt?: string;
  tags?: string[];
  collection?: { $id: number };
  type?: string;
  important?: boolean;
  cover?: string;
  note?: string;
  highlights?: Highlight[];
}

export interface RaindropUpdate {
  title?: string;
  excerpt?: string;
  tags?: string[];
  collection?: { $id: number };
  cover?: string;
  important?: boolean;
  note?: string;
  link?: string;
  order?: number;
  pleaseParse?: boolean;
}

export interface ApiResponse<T> {
  result: boolean;
  item?: T;
  items?: T[];
  count?: number;
  user?: RaindropUser;
  errorMessage?: string;
}
