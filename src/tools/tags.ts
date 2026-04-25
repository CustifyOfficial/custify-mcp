import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CustifyClient, CustifyApiError } from '../api/client.js';
import type { Tag } from '../api/types.js';

function formatTag(t: Tag) {
  return {
    id: t.id,
    name: t.name ?? null,
    category: t.category ?? null,
    color: t.color ?? null,
    color_text: t.color_text ?? null,
  };
}

export function registerTagTools(server: McpServer, client: CustifyClient): void {
  server.tool(
    'list_tags',
    `List Custify tags, optionally scoped to one category. Use this to resolve a human-readable tag name (e.g. "onboarding follow up") to the tag ID needed by other tools like list_tasks.

Common categories: "task" (task labels), "company", "customer", "note".`,
    {
      category: z.string().optional().describe('Tag category to filter by (e.g. "task", "company", "customer", "note"). Omit to list all tags.'),
      limit: z.number().min(1).max(100).default(50).optional().describe('Number of results (1-100, default 50)'),
      offset: z.number().min(0).default(0).optional().describe('Pagination offset (default 0)'),
    },
    async (params) => {
      try {
        const limit = params.limit ?? 50;
        const offset = params.offset ?? 0;
        const page = Math.floor(offset / limit) + 1;

        const result = await client.listTags(
          { category: params.category, page, itemsPerPage: limit },
          { toolName: 'list_tags', toolCategory: 'tags' }
        );

        const tags = (result.tags ?? []).map(formatTag);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                tags,
                total: result.total ?? tags.length,
                page,
                limit,
                offset,
              }),
            },
          ],
        };
      } catch (error) {
        if (error instanceof CustifyApiError) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: error.code, message: error.message, statusCode: error.statusCode }) }],
            isError: true,
          };
        }
        throw error;
      }
    }
  );
}
