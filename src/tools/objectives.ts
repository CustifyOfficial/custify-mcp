import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CustifyApiError, CustifyClient } from '../api/client.js';
import type { Objective } from '../api/types.js';

function formatObjective(objective: Objective) {
  return {
    id: objective.id,
    account_id: objective.company ?? null,
    name: objective.name ?? null,
    description: objective.description ?? null,
    importance: objective.importance ?? null,
    risk: objective.risk ?? null,
    health: objective.health ?? null,
    completion_percentage: objective.completionPercentage ?? null,
    completion_type: objective.completionType ?? null,
    completion_attribute: objective.completionAttribute ?? null,
    value_baseline: objective.valueBaseline ?? null,
    value_target: objective.valueTarget ?? null,
    value_current: objective.valueCurrent ?? null,
    status: objective.objectiveStatus ?? null,
    start_at: objective.startAt ?? null,
    due_at: objective.dueAt ?? null,
    completed_at: objective.completedAt ?? null,
    tags: objective.tags ?? [],
    assignee_id: objective.assignedTo ?? null,
    assignee_name: objective.assignedToName ?? null,
    collaborators: objective.collaborators ?? [],
    created_at: objective.created_at ?? null,
    updated_at: objective.updated_at ?? null,
  };
}

export function registerObjectiveTools(server: McpServer, client: CustifyClient): void {
  server.tool(
    'get_account_objectives',
    'Fetch customer objectives/goals for one Custify account/company. Provide either account_id (Custify internal company ID) or external_account_id (your company_id). Use this for objective progress, risk, importance, due dates, and status.',
    {
      account_id: z.string().optional().describe('Custify internal company/account ID. Use this when you already have the account ID from search_accounts or get_account.'),
      external_account_id: z.string().optional().describe('Your external company_id. Use this if you do not have the Custify internal account ID.'),
      filters: z.array(z.object({
        fieldName: z.string().describe('Objective field name, e.g. "objectiveStatus", "importance", "risk", or "dueAt".'),
        fieldType: z.string().describe('Field type such as String, Date, Number, Dropdown, or Tag.'),
        filterType: z.string().describe('Filter operator supported by Custify filters, e.g. "is_any_of", "contains", "before", "after".'),
        filterValue: z.unknown().optional().describe('Filter value. Type depends on filterType.'),
      })).optional().describe('Optional Custify filter objects. Filters combine with AND.'),
      sort_by: z.enum(['created_at', 'updated_at', 'name', 'importance', 'risk', 'health', 'completionPercentage', 'objectiveStatus', 'startAt', 'dueAt', 'completedAt'])
        .default('created_at')
        .optional()
        .describe('Sort field (default: created_at).'),
      sort_direction: z.enum(['asc', 'desc']).default('desc').optional().describe('Sort direction (default: desc).'),
      limit: z.number().min(1).max(50).default(20).optional().describe('Number of objectives to return (1-50, default 20).'),
      offset: z.number().min(0).default(0).optional().describe('Pagination offset (default 0).'),
    },
    async (params) => {
      try {
        if (!params.account_id && !params.external_account_id) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: 'missing_account_identifier',
                  message: 'Provide either account_id or external_account_id.',
                }),
              },
            ],
            isError: true,
          };
        }

        const limit = params.limit ?? 20;
        const offset = params.offset ?? 0;
        const page = Math.floor(offset / limit) + 1;

        const result = await client.listObjectives(
          {
            company: params.account_id,
            company_id: params.external_account_id,
            page,
            itemsPerPage: limit,
            filters: params.filters,
            sort: params.sort_by ?? 'created_at',
            order: params.sort_direction ?? 'desc',
          },
          { toolName: 'get_account_objectives', toolCategory: 'objectives' }
        );

        const objectives = (result.objectives || result.data || result.items || []).map(formatObjective);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                account_id: params.account_id ?? null,
                external_account_id: params.external_account_id ?? null,
                objectives,
                total: result.total ?? objectives.length,
                page: result.page ?? page,
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
