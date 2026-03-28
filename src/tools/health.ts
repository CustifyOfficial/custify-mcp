import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CustifyClient, CustifyApiError } from '../api/client.js';

export function registerHealthTools(server: McpServer, client: CustifyClient): void {
  // get_health_scores
  server.tool(
    'get_health_scores',
    'Get health scores for a specific Custify account, including global and individual score breakdowns.',
    {
      account_id: z.string().describe('The Custify company/account ID'),
    },
    async (params) => {
      try {
        const [company, definitions] = await Promise.all([
          client.getHealthScores(params.account_id, {
            toolName: 'get_health_scores',
            toolCategory: 'health',
          }),
          client.listHealthScoreDefinitions({
            toolName: 'get_health_scores',
            toolCategory: 'health',
          }),
        ]);

        const healthScores = company.metrics?.health_scores || {};
        const definitionMap = new Map(
          (Array.isArray(definitions) ? definitions : []).map((d) => [d.id, d])
        );

        const scores = Object.entries(healthScores).map(([key, entry]) => {
          const definition = definitionMap.get(key);
          const entryAny = entry as Record<string, unknown> | undefined;
          return {
            id: key,
            name: definition?.name || (key === 'global' ? 'Global Health Score' : key),
            score: entryAny?.score ?? entryAny?.value ?? null,
            absolute_value: entryAny?.absolute_value ?? null,
            label: entry?.label ?? null,
            color: entry?.color ?? null,
            updated_at: entry?.updated_at ?? null,
          };
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                account_id: params.account_id,
                account_name: company.name,
                health_scores: scores,
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

  // get_usage_data
  server.tool(
    'get_usage_data',
    'Get usage/event data for a Custify account, optionally filtered by event name and date range.',
    {
      account_id: z.string().describe('The Custify company/account ID'),
      event_name: z.string().optional().describe('Filter by specific event name'),
      start_date: z.string().optional().describe('Start date in ISO format (e.g. 2024-01-01)'),
      end_date: z.string().optional().describe('End date in ISO format (e.g. 2024-12-31)'),
      type: z
        .enum(['eventFrequency', 'eventCount', 'eventLastOccurrence'])
        .default('eventFrequency')
        .optional()
        .describe('Type of usage data to retrieve (default: eventFrequency)'),
    },
    async (params) => {
      try {
        const result = await client.getUsageData(
          params.account_id,
          {
            type: params.type ?? 'eventFrequency',
            startDate: params.start_date,
            endDate: params.end_date,
            eventName: params.event_name,
          },
          { toolName: 'get_usage_data', toolCategory: 'health' }
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                account_id: params.account_id,
                type: params.type ?? 'eventFrequency',
                usage_data: result,
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

  // get_usage_trends
  server.tool(
    'get_usage_trends',
    'Get historical health score values/trends over time for a specific health score metric. Optionally filter by account.',
    {
      health_score_id: z.string().describe('The health score definition ID'),
      account_id: z.string().optional().describe('Filter by specific Custify company/account ID'),
      limit: z.number().min(1).max(100).default(30).optional().describe('Number of data points to return (default 30)'),
    },
    async (params) => {
      try {
        const limit = params.limit ?? 30;
        const queryParams: { page?: number; itemsPerPage?: number; companyId?: string } = {
          page: 1,
          itemsPerPage: limit,
        };
        if (params.account_id) {
          queryParams.companyId = params.account_id;
        }
        const result = await client.getHealthScoreValues(
          params.health_score_id,
          queryParams,
          { toolName: 'get_usage_trends', toolCategory: 'health' }
        );

        const values = result.values || result.data || result.items || [];

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                health_score_id: params.health_score_id,
                account_id: params.account_id || null,
                data_points: values,
                total: result.total ?? values.length,
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
