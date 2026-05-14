import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CustifyClient, CustifyApiError } from '../api/client.js';
import type { Contact, PaginatedResponse } from '../api/types.js';
import { custifyFilterSchema, prepareEntityFilters, tagIdsSchema, tagMatchSchema, toolInputError } from './filter-utils.js';

function getContactsPage(result: PaginatedResponse<Contact> | PaginatedResponse<Contact>[]): PaginatedResponse<Contact> {
  return Array.isArray(result) ? result[0] ?? {} : result;
}

function getRawContacts(contactsPage: PaginatedResponse<Contact>): Array<Record<string, unknown>> {
  return (contactsPage.people || contactsPage.data || contactsPage.items || []) as unknown as Array<Record<string, unknown>>;
}

function formatContact(c: Record<string, unknown>) {
  const details = (c.details && typeof c.details === 'object' ? c.details : c) as Record<string, unknown>;
  const activity = (c.activity && typeof c.activity === 'object' && !Array.isArray(c.activity) ? c.activity : {}) as Record<string, unknown>;

  return {
    id: c.id ?? details.id ?? null,
    customer_id: details.customer_id ?? null,
    email: details.email ?? null,
    name: details.name ?? null,
    first_name: details.first_name ?? null,
    last_name: details.last_name ?? null,
    phone: details.phone ?? null,
    title: details.title ?? null,
    role: details.role ?? null,
    user_id: details.user_id ?? null,
    signed_up_at: details.signed_up_at ?? null,
    first_seen_at: details.first_seen_at ?? null,
    last_seen_at: activity.last_seen_at ?? details.last_seen_at ?? null,
    session_count: activity.session_count ?? null,
    account_ids: details.companies ?? details.company ?? null,
    account_names: details.companyNames ?? null,
    tag_ids: details.tags ?? [],
    tag_names: details.tagNames ?? null,
    custom_attributes: details.custom_attributes ?? null,
    created_at: details.created_at ?? null,
    updated_at: details.updated_at ?? null,
  };
}

export function registerContactTools(server: McpServer, client: CustifyClient): void {
  // list_contacts
  server.tool(
    'list_contacts',
    `List Custify contacts/people across the customer base. Use this for structured contact queries, including people tags, account membership, email/name searches, dates, and custom attributes. Use get_contacts only when you already have one account_id and want contacts linked to that account.

Prefer tag_ids for tag filters; call list_tags with category="people" first to resolve names to IDs. For other fields, filters use Custify's filter format: each filter is an object with fieldName, fieldType, filterType, and filterValue. Use list_attributes with entity_type="contact" to discover fields. Common examples:
- Email contains: {"fieldName":"email","fieldType":"String","filterType":"contains","filterValue":"@example.com"}
- Tagged contacts: {"tag_ids":["<people_tag_id>"],"tag_match":"any"}
- Contacts in an account: {"fieldName":"companies","fieldType":"Company","filterType":"is_in","filterValue":"<account_id>"}`,
    {
      filters: z.array(custifyFilterSchema).optional().describe('Advanced Custify filter objects. Filters combine with AND. For tags, prefer tag_ids; manual tag filters must use fieldName="tags", fieldType="Tag", filterType is_any_of/is_all_of/is_none_of/is_unknown/any_value, and filterValue as an array of tag IDs when IDs are needed.'),
      tag_ids: tagIdsSchema.describe('Filter contacts by people tag IDs. Use list_tags with category="people" to resolve names first.'),
      tag_match: tagMatchSchema,
      sorting_field: z.string().optional().describe('Field name to sort by (e.g. "name", "email", "signed_up_at", "last_seen_at")'),
      sorting_direction: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc)'),
      limit: z.number().min(1).max(100).default(25).optional().describe('Number of results (1-100, default 25)'),
      offset: z.number().min(0).default(0).optional().describe('Pagination offset (default 0)'),
    },
    async (params) => {
      try {
        const limit = params.limit ?? 25;
        const offset = params.offset ?? 0;
        const page = Math.floor(offset / limit) + 1;
        const filterResult = prepareEntityFilters({
          filters: params.filters,
          tagIds: params.tag_ids,
          tagMatch: params.tag_match,
        });
        if (filterResult.error) return toolInputError(filterResult.error);

        const sorting = params.sorting_field ? {
          field: params.sorting_field,
          direction: params.sorting_direction ?? 'desc',
        } : undefined;

        const result = await client.listContacts(
          { page, itemsPerPage: limit, filters: filterResult.filters, sorting },
          { toolName: 'list_contacts', toolCategory: 'contacts' }
        );

        const contactsPage = getContactsPage(result);
        const formatted = getRawContacts(contactsPage).map(formatContact);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                contacts: formatted,
                total: contactsPage.total ?? formatted.length,
                page: contactsPage.page ?? page,
                pages: contactsPage.pages ?? 1,
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

  // get_contacts
  server.tool(
    'get_contacts',
    'List contacts/people linked to one Custify account by account_id. Use list_contacts instead for contacts across all accounts or when you need filters such as tags, email, custom attributes, or account membership.',
    {
      account_id: z.string().describe('The Custify company/account ID'),
      limit: z.number().min(1).max(100).default(25).optional().describe('Number of results (1-100, default 25)'),
      offset: z.number().min(0).default(0).optional().describe('Pagination offset (default 0)'),
    },
    async (params) => {
      try {
        const limit = params.limit ?? 25;
        const offset = params.offset ?? 0;
        const page = Math.floor(offset / limit) + 1;

        const result = await client.getContacts(
          params.account_id,
          { page, itemsPerPage: limit },
          { toolName: 'get_contacts', toolCategory: 'contacts' }
        );

        const contactsPage = getContactsPage(result);
        const formatted = getRawContacts(contactsPage).map(formatContact);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                contacts: formatted,
                total: contactsPage?.total ?? formatted.length,
                page: contactsPage?.page ?? page,
                pages: contactsPage?.pages ?? 1,
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

  // get_contact
  server.tool(
    'get_contact',
    'Fetch one Custify contact/person by internal contact ID. Use list_contacts or get_contacts first if you need to find the contact ID.',
    {
      contact_id: z.string().describe('The Custify contact/customer ID'),
    },
    async (params) => {
      try {
        const contact = await client.getContact(params.contact_id, {
          toolName: 'get_contact',
          toolCategory: 'contacts',
        });

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(contact) }],
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
