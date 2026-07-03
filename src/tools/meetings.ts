import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CustifyClient, CustifyApiError } from '../api/client.js';
import type { Meeting, MeetingParticipant } from '../api/types.js';

function formatParticipant(p: MeetingParticipant) {
  return {
    name: p.name ?? null,
    email: p.email ?? null,
    contact_id: p.people ?? null,
    status: p.status ?? null,
    organizer: p.organizer ?? false,
    optional: p.optional ?? false,
  };
}

function formatMeeting(m: Meeting) {
  return {
    id: m.id ?? null,
    title: m.title ?? null,
    description: m.description ?? null,
    location: m.location ?? null,
    start_at: m.startAt ?? null,
    end_at: m.endAt ?? null,
    duration_seconds: m.duration ?? null,
    recurring: m.recurring ?? false,
    direction: m.direction ?? null,
    organizer: m.organizer ? formatParticipant(m.organizer) : null,
    participants: (m.participants ?? []).map(formatParticipant),
    account_ids: m.company ?? [],
    contact_ids: m.people ?? [],
    tag_ids: m.tags ?? [],
    external_id: m.externalId ?? null,
    created_at: m.created_at ?? null,
    updated_at: m.updated_at ?? null,
  };
}

export function registerMeetingTools(server: McpServer, client: CustifyClient): void {
  // list_meetings
  server.tool(
    'list_meetings',
    `List meetings imported into Custify (from Gmail/Outlook calendars, HubSpot, or the API), including past and upcoming ones. Scope with account_id to get meetings for one company, or omit it to list meetings across all accounts. Participants are matched to Custify contacts where possible (contact_id). Results are paginated; use total to page through.`,
    {
      account_id: z.string().optional().describe('Custify company/account ID — list meetings assigned to this account'),
      limit: z.number().min(1).max(50).default(25).optional().describe('Number of results (1-50, default 25)'),
      offset: z.number().min(0).default(0).optional().describe('Pagination offset (default 0)'),
    },
    async (params) => {
      try {
        const limit = params.limit ?? 25;
        const offset = params.offset ?? 0;
        const page = Math.floor(offset / limit) + 1;

        const result = await client.listMeetings(
          {
            companyId: params.account_id,
            page,
            itemsPerPage: limit,
          },
          { toolName: 'list_meetings', toolCategory: 'meetings' }
        );

        const meetings = (result.meetings ?? []).map(formatMeeting);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                meetings,
                total: result.total ?? meetings.length,
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
