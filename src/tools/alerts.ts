import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CustifyClient, CustifyApiError } from '../api/client.js';
import type { Segment } from '../api/types.js';

export function registerAlertTools(server: McpServer, client: CustifyClient): void {
  // get_alerts — out of scope for V1: the underlying Custify signal API may not
  // support this query reliably. Kept as a placeholder for future versions.
  server.tool(
    'get_alerts',
    '[V1 LIMITATION: This tool may not work as expected — the underlying alerts API has limited support. Out of scope for the current version.] Get alerts/signals from Custify for a specific account, optionally filtered by status.',
    {
      account_id: z.string().describe('The Custify company/account ID to get alerts for'),
      status: z.enum(['open', 'acknowledged']).optional().describe('Filter by alert status'),
      limit: z.number().min(1).max(100).default(25).optional().describe('Number of results (1-100, default 25)'),
      offset: z.number().min(0).default(0).optional().describe('Pagination offset (default 0)'),
    },
    async (params) => {
      try {
        const limit = params.limit ?? 25;
        const offset = params.offset ?? 0;
        const page = Math.floor(offset / limit) + 1;

        const filters: unknown[] = [];
        if (params.status) {
          if (params.status === 'acknowledged') {
            filters.push({ field: 'acknowledged', operator: 'eq', value: true });
          } else {
            filters.push({ field: 'acknowledged', operator: 'eq', value: false });
          }
        }

        const result = await client.getAlerts(
          {
            page,
            itemsPerPage: limit,
            filters: filters.length > 0 ? filters : undefined,
            customerType: 'Company',
            customerId: params.account_id,
          },
          { toolName: 'get_alerts', toolCategory: 'alerts' }
        );

        const alerts = result.signals || result.data || result.items || [];
        const formatted = alerts.map((a) => ({
          id: a.id,
          type: a.type ?? null,
          title: a.title ?? null,
          description: a.description ?? null,
          status: a.acknowledged ? 'acknowledged' : 'open',
          severity: a.severity ?? null,
          entity_name: a.entity_name ?? null,
          created_at: a.created_at ?? null,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                alerts: formatted,
                total: result.total ?? formatted.length,
                page: result.page ?? page,
                pages: result.pages ?? 1,
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

  // get_segment_membership
  server.tool(
    'get_segment_membership',
    'Get all segments that a specific Custify account belongs to.',
    {
      account_id: z.string().describe('The Custify company/account ID'),
    },
    async (params) => {
      try {
        const result = await client.getSegmentMembership(params.account_id, {
          toolName: 'get_segment_membership',
          toolCategory: 'alerts',
        });

        const segments: Segment[] = (result as any).segments || result.data || result.items || [];
        const formatted = segments.map((s: Segment) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? null,
          color: s.color ?? null,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                account_id: params.account_id,
                segments: formatted,
                total: formatted.length,
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
