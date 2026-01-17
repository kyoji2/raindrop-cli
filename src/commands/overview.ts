import { type GlobalOptions, output } from "../utils/output";
import { withSpinner } from "../utils/spinner";
import { getAuthenticatedAPI } from "./auth";

export async function cmdContext(options: GlobalOptions): Promise<void> {
  const api = getAuthenticatedAPI(options);

  const [user, stats, recent, collections] = await withSpinner("Loading account context...", () =>
    Promise.all([api.getUser(), api.getStats(), api.search("", 0, 5), api.getCollections()]),
  );

  const totalBookmarks = stats.find((s) => s._id === 0)?.count ?? 0;

  const contextData = {
    user: [{ id: user._id, name: user.fullName }],
    stats: [
      {
        total_bookmarks: totalBookmarks,
        total_collections: collections.length,
      },
    ],
    structure: {
      root_collections: collections
        .filter((c) => !c.parent)
        .map((c) => ({ id: c._id, title: c.title, count: c.count })),
    },
    recent_activity: recent.slice(0, 5).map((r) => ({
      id: r._id,
      title: r.title,
      created: r.created,
    })),
  };

  output(contextData, options.format);
}

export async function cmdStructure(options: GlobalOptions): Promise<void> {
  const api = getAuthenticatedAPI(options);

  const [collections, tags] = await withSpinner("Loading structure...", () =>
    Promise.all([api.getCollections(), api.getTags()]),
  );

  output(
    {
      collections: collections.map((c) => ({
        id: c._id,
        title: c.title,
        count: c.count,
        parent_id: c.parent?.$id ?? null,
        last_update: c.lastUpdate,
      })),
      tags: tags.map((t) => t._id),
    },
    options.format,
  );
}

export function cmdSchema(): void {
  const schemas = {
    Raindrop: {
      type: "object",
      properties: {
        link: { type: "string", required: true },
        title: { type: "string" },
        excerpt: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        collection: { type: "object", properties: { $id: { type: "number" } } },
        important: { type: "boolean" },
        cover: { type: "string" },
        note: { type: "string" },
      },
    },
    Collection: {
      type: "object",
      properties: {
        title: { type: "string", required: true },
        parent: { type: "object", properties: { $id: { type: "number" } } },
        public: { type: "boolean" },
        view: { type: "string", enum: ["list", "simple", "grid", "masonry"] },
      },
    },
  };

  const usageExamples = {
    patch_update_title_tags: 'raindrop patch <id> \'{"title": "New Title", "tags": ["ai", "cli"]}\'',
    move_single_bookmark: 'raindrop patch <id> \'{"collection": {"$id": <target_col_id>}}\'',
    move_batch_bookmarks:
      'raindrop batch update --ids 1,2 --collection <source_col_id> \'{"collection": {"$id": <target_col_id>}}\'',
    create_collection: 'raindrop collection create "Research" --public',
    search_with_tags: 'raindrop search "python tag:important"',
  };

  console.log(JSON.stringify({ schemas, usage_examples: usageExamples }, null, 2));
}
