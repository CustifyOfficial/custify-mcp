import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CustifyClient, CustifyApiError } from '../api/client.js';

function formatHealthScores(healthScores?: Record<string, { score?: number; absolute_value?: number } | undefined>): Record<string, number | null> | null {
  if (!healthScores) return null;
  const result: Record<string, number | null> = {};
  for (const [key, entry] of Object.entries(healthScores)) {
    if (entry) result[key] = entry.score ?? null;
  }
  return Object.keys(result).length > 0 ? result : null;
}

function formatCompany(c: Record<string, unknown>) {
  return {
    id: c.id,
    company_id: c.company_id ?? null,
    name: c.name,
    health_scores: formatHealthScores(c.metrics && typeof c.metrics === 'object' ? (c.metrics as Record<string, unknown>).health_scores as Record<string, { score?: number; absolute_value?: number }> : undefined),
    mrr: c.monthly_revenue ?? c.mrr ?? null,
    plan: c.plan ?? null,
    status: c.status ?? null,
    churned: c.churned ?? null,
    csm: c.owners_csm_name ?? c.owners_csm ?? null,
    csm_email: c.owners_csm_email ?? null,
    domain: c.domain ?? c.website ?? null,
    signed_up_at: c.signed_up_at ?? null,
    last_seen_at: c.last_seen_at ?? c.last_request_at ?? null,
    people_count: c.metrics && typeof c.metrics === 'object' ? (c.metrics as Record<string, unknown>).people_count ?? null : null,
  };
}

export function registerAccountTools(server: McpServer, client: CustifyClient): void {
  // list_accounts
  server.tool(
    'list_accounts',
    `List Custify accounts/companies with optional filters. Filters use Custify's filter format: each filter is an object with fieldName, fieldType, filterType, and filterValue. Use the list_attributes tool to discover available fields and their types. Common examples:
- Churned accounts: {"fieldName":"churned","fieldType":"Boolean","filterType":"true"}
- Name contains: {"fieldName":"name","fieldType":"String","filterType":"contains","filterValue":"acme"}
- Health score > 50: {"fieldName":"metrics.health_scores.<score_id>","fieldType":"Number","filterType":"greater","filterValue":"50"}
- In segment: {"fieldName":"metrics.health_scores.<score_id>","fieldType":"Segment","filterType":"is_any_of","filterValue":["<segment_id>"]}`,
    {
      filters: z.array(z.object({
        fieldName: z.string().describe('The attribute field name (e.g. "name", "churned", "metrics.health_scores.<id>")'),
        fieldType: z.string().describe('The field type: String, Number, Boolean, Date, Dropdown, User, Segment, Tag, Currency'),
        filterType: z.string().describe('The filter operator. Boolean: true/false. Number: greater/lower/between. String: contains/starts_with/ends_with/does_not_contain. Date: more_than/less_than/after/before/between/on/last_week/this_month etc. Dropdown/Segment/Tag: is_any_of/is_all_of/is_none_of. General: is_unknown/any_value'),
        filterValue: z.unknown().optional().describe('The filter value. Type depends on filterType.'),
      })).optional().describe('Array of filter objects. Use list_attributes to discover available fields.'),
      sorting_field: z.string().optional().describe('Field name to sort by (e.g. "name", "signed_up_at", "metrics.health_scores.<id>")'),
      sorting_direction: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc)'),
      limit: z.number().min(1).max(100).default(25).optional().describe('Number of results (1-100, default 25)'),
      offset: z.number().min(0).default(0).optional().describe('Pagination offset (default 0)'),
    },
    async (params) => {
      try {
        const limit = params.limit ?? 25;
        const offset = params.offset ?? 0;
        const page = Math.floor(offset / limit) + 1;

        const sorting = params.sorting_field ? {
          field: params.sorting_field,
          direction: params.sorting_direction ?? 'desc',
        } : undefined;

        const result = await client.listCompanies(
          { page, itemsPerPage: limit, filters: params.filters ?? [], sorting },
          { toolName: 'list_accounts', toolCategory: 'accounts' }
        );

        const companies = result.companies || result.data || result.items || [];
        const formatted = companies.map((c) => formatCompany(c as unknown as Record<string, unknown>));

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
    'Search Custify accounts/companies by name or domain.',
    {
      query: z.string().describe('Search query to match against account names and domains'),
      limit: z.number().min(1).max(100).default(25).optional().describe('Max results to return (1-100, default 25)'),
    },
    async (params) => {
      try {
        const result = await client.searchCompanies(
          params.query,
          params.limit ?? 25,
          { toolName: 'search_accounts', toolCategory: 'accounts' }
        );

        const companies = result.companies || result.data || result.items || [];
        const formatted = companies.map((c) => formatCompany(c as unknown as Record<string, unknown>));

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

  // list_attributes
  server.tool(
    'list_attributes',
    'List all available company/account attributes that can be used for filtering and sorting. Returns field names, display names, and field types. Use this to discover which fields are available before building filters for list_accounts.',
    {
      entity_type: z.enum(['account', 'contact']).default('account').optional().describe('Entity type to get attributes for (default: account)'),
    },
    async (params) => {
      try {
        const entityType = params.entity_type ?? 'account';
        const attributes = entityType === 'account'
          ? await client.getCompanyAttributes({ toolName: 'list_attributes', toolCategory: 'accounts' })
          : await client.getContactAttributes({ toolName: 'list_attributes', toolCategory: 'contacts' });

        const items = Array.isArray(attributes) ? attributes : [];
        const formatted = items.map((a: unknown) => {
          const attr = a as Record<string, unknown>;
          return {
            field_name: attr.name ?? null,
            display_name: attr.niceName ?? null,
            field_type: attr.fieldType ?? null,
          };
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                entity_type: entityType,
                attributes: formatted,
                total: formatted.length,
                filter_types_reference: {
                  Boolean: ['true', 'false'],
                  Number: ['greater', 'lower', 'between', 'is_unknown', 'any_value'],
                  String: ['contains', 'starts_with', 'ends_with', 'does_not_contain', 'is_unknown', 'any_value'],
                  Date: ['more_than', 'less_than', 'exactly', 'after', 'before', 'between', 'on', 'last_week', 'this_week', 'last_month', 'this_month', 'last_quarter', 'this_quarter', 'last_year', 'this_year', 'is_unknown', 'any_value'],
                  Dropdown: ['is_any_of', 'is_all_of', 'is_none_of', 'is_unknown', 'any_value'],
                  Segment: ['is_any_of', 'is_all_of', 'is_none_of'],
                  Tag: ['is_any_of', 'is_all_of', 'is_none_of', 'is_unknown', 'any_value'],
                  User: ['is_in', 'is_not_in', 'is_unknown', 'any_value'],
                  Currency: ['greater', 'lower', 'between', 'is_unknown', 'any_value'],
                },
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
