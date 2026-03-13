import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CustifyClient, CustifyApiError } from '../api/client.js';

export function registerContactTools(server: McpServer, client: CustifyClient): void {
  // get_contacts
  server.tool(
    'get_contacts',
    'Get contacts/people associated with a Custify account.',
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

        const contactsPage = Array.isArray(result) ? result[0] : result;
        const contacts = contactsPage?.people || contactsPage?.data || contactsPage?.items || [];
        const formatted = contacts.map((c) => ({
          id: c.id,
          email: c.email ?? null,
          first_name: c.first_name ?? null,
          last_name: c.last_name ?? null,
          name: c.name ?? null,
          title: c.title ?? null,
          role: c.role ?? null,
          last_seen_at: c.last_seen_at ?? null,
        }));

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
    'Get detailed information about a specific Custify contact by ID.',
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
