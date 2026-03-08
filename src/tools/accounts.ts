import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CustifyClient, CustifyApiError } from '../api/client.js';

export function registerAccountTools(server: McpServer, client: CustifyClient): void {
  // list_accounts
  server.tool(
    'list_accounts',
    'List Custify accounts/companies with optional filters for segment, health score, CSM, and lifecycle stage.',
    {
      segment_id: z.string().optional().describe('Filter by segment ID'),
      health_score_min: z.number().optional().describe('Minimum health score (0-100)'),
      health_score_max: z.number().optional().describe('Maximum health score (0-100)'),
      csm_email: z.string().optional().describe('Filter by CSM email address'),
      lifecycle_stage: z.string().optional().describe('Filter by lifecycle stage'),
      limit: z.number().min(1).max(100).default(25).optional().describe('Number of results (1-100, default 25)'),
      offset: z.number().min(0).default(0).optional().describe('Pagination offset (default 0)'),
    },
    async (params) => {
      try {
        const filters: unknown[] = [];

        if (params.health_score_min !== undefined) {
          filters.push({
            field: 'metrics.health_scores.global.value',
            operator: 'gte',
            value: params.health_score_min,
          });
        }
        if (params.health_score_max !== undefined) {
          filters.push({
            field: 'metrics.health_scores.global.value',
            operator: 'lte',
            value: params.health_score_max,
          });
        }
        if (params.csm_email) {
          filters.push({
            field: 'owners_csm',
            operator: 'eq',
            value: params.csm_email,
          });
        }
        if (params.segment_id) {
          filters.push({
            field: 'buckets',
            operator: 'contains',
            value: params.segment_id,
          });
        }
        if (params.lifecycle_stage) {
          filters.push({
            field: 'lifecycle_stage',
            operator: 'eq',
            value: params.lifecycle_stage,
          });
        }

        const limit = params.limit ?? 25;
        const offset = params.offset ?? 0;
        const page = Math.floor(offset / limit) + 1;

        const result = await client.listCompanies(
          { page, itemsPerPage: limit, filters },
          { toolName: 'list_accounts', toolCategory: 'accounts' }
        );

        const companies = result.data || result.items || [];
        const formatted = companies.map((c) => ({
          id: c.id,
          name: c.name,
          health_score: c.metrics?.health_scores?.global?.value ?? null,
          mrr: c.mrr ?? null,
          csm: c.owners_csm ?? null,
          lifecycle_stage: c.lifecycle_stage ?? null,
          domain: c.domain ?? null,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                accounts: formatted,
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

  // get_account
  server.tool(
    'get_account',
    'Get detailed information about a specific Custify account/company by ID.',
    {
      account_id: z.string().describe('The Custify company/account ID'),
    },
    async (params) => {
      try {
        const company = await client.getCompany(params.account_id, {
          toolName: 'get_account',
          toolCategory: 'accounts',
        });

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(company) }],
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

  // search_accounts
  server.tool(
    'search_accounts',
    'Search Custify accounts/companies by name.',
    {
      query: z.string().describe('Search query to match against account names'),
      limit: z.number().min(1).max(100).default(25).optional().describe('Max results to return (1-100, default 25)'),
    },
    async (params) => {
      try {
        const result = await client.searchCompanies(
          params.query,
          params.limit ?? 25,
          { toolName: 'search_accounts', toolCategory: 'accounts' }
        );

        const companies = result.data || result.items || [];
        const formatted = companies.map((c) => ({
          id: c.id,
          name: c.name,
          domain: c.domain ?? null,
          health_score: c.metrics?.health_scores?.global?.value ?? null,
          mrr: c.mrr ?? null,
          csm: c.owners_csm ?? null,
          lifecycle_stage: c.lifecycle_stage ?? null,
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                accounts: formatted,
                total: result.total ?? formatted.length,
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
