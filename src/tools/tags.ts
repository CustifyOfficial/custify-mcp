import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CustifyClient, CustifyApiError } from '../api/client.js';
import type { Tag } from '../api/types.js';

function formatTag(t: Tag) {
  return {
    id: t.id,
    name: t.name ?? null,
    description: t.description ?? null,
    category: t.category ?? null,
    color: t.color ?? null,
    color_text: t.color_text ?? null,
  };
}

function mapEntityType(entityType: 'account' | 'contact'): 'company' | 'people' {
  return entityType === 'account' ? 'company' : 'people';
}

const entityTagToolSchema = {
  entity_type: z.enum(['account', 'contact']).describe('Entity type to update: account maps to Custify company tags, contact maps to Custify people tags.'),
  entity_ids: z.array(z.string()).min(1).max(100).describe('Custify internal IDs of the accounts or contacts to update.'),
  tag_id: z.string().describe('Custify internal ID of the existing tag to add or remove. Use list_tags or the tags resource to resolve names to IDs.'),
};

async function updateEntityTags(
  client: CustifyClient,
  params: { entity_type: 'account' | 'contact'; entity_ids: string[]; tag_id: string },
  operation: 'add' | 'remove',
  toolName: string
) {
  try {
    const category = mapEntityType(params.entity_type);
    const result = await client.updateTagsForEntities(
      {
        ids: params.entity_ids,
        type: operation,
        category,
        tag: params.tag_id,
      },
      { toolName, toolCategory: 'tags' }
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            operation,
            entity_type: params.entity_type,
            category,
            entity_ids: params.entity_ids,
            tag_id: params.tag_id,
            result,
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

export function registerTagTools(server: McpServer, client: CustifyClient): void {
  server.tool(
    'list_tags',
    `List Custify tag definitions, optionally scoped to one category. Use this to resolve a human-readable tag name (e.g. "onboarding follow up") to the tag ID needed by list_accounts, list_contacts, list_tasks, add_tag_to_entities, and remove_tag_from_entities.

Common categories: "task" (task labels), "company", "people", "note".`,
    {
      category: z.string().optional().describe('Tag category to filter by (e.g. "task", "company", "people", "note"). Omit to list all tags.'),
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

  server.tool(
    'add_tag_to_entities',
    'Add an existing Custify tag to one or more accounts or contacts by internal entity IDs. Use list_tags or custify://tags first; account tags use category "company", contact tags use category "people".',
    entityTagToolSchema,
    async (params) => updateEntityTags(client, params, 'add', 'add_tag_to_entities')
  );

  server.tool(
    'remove_tag_from_entities',
    'Remove an existing Custify tag from one or more accounts or contacts by internal entity IDs. Use list_tags or custify://tags first; account tags use category "company", contact tags use category "people".',
    entityTagToolSchema,
    async (params) => updateEntityTags(client, params, 'remove', 'remove_tag_from_entities')
  );
}
