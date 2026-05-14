import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CustifyClient } from '../api/client.js';
import type { Tag } from '../api/types.js';

const PAGE_SIZE = 100;

function formatTag(tag: Tag) {
  return {
    id: tag.id,
    name: tag.name ?? null,
    description: tag.description ?? null,
    category: tag.category ?? null,
    color: tag.color ?? null,
    color_text: tag.color_text ?? null,
    position: tag.position ?? null,
    created_at: tag.created_at ?? null,
    updated_at: tag.updated_at ?? null,
  };
}

async function listAllTags(client: CustifyClient): Promise<{ tags: Tag[]; total: number }> {
  const result = await client.listTags(
    { page: 1, itemsPerPage: PAGE_SIZE },
    { toolName: 'tags_resource', toolCategory: 'resources' }
  );
  const tags: Tag[] = result.tags || [];
  const total = result.total ?? tags.length;

  for (let page = 2; tags.length < total; page++) {
    const nextResult = await client.listTags(
      { page, itemsPerPage: PAGE_SIZE },
      { toolName: 'tags_resource', toolCategory: 'resources' }
    );
    const nextTags: Tag[] = nextResult.tags || [];
    if (nextTags.length === 0) break;
    tags.push(...nextTags);
  }

  return { tags, total };
}

export function registerTagsResource(server: McpServer, client: CustifyClient): void {
  server.resource(
    'tags',
    'custify://tags',
    {
      description: 'List of all Custify tags grouped by category',
      mimeType: 'application/json',
    },
    async () => {
      const { tags, total } = await listAllTags(client);
      const formatted = tags.map(formatTag);
      const byCategory = formatted.reduce<Record<string, typeof formatted>>((acc, tag) => {
        const category = tag.category || 'uncategorized';
        acc[category] = acc[category] || [];
        acc[category].push(tag);
        return acc;
      }, {});

      return {
        contents: [
          {
            uri: 'custify://tags',
            mimeType: 'application/json',
            text: JSON.stringify({
              tags: formatted,
              by_category: byCategory,
              total,
            }),
          },
        ],
      };
    }
  );
}
