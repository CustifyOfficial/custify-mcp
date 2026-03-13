import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CustifyClient } from '../api/client.js';

export function registerSegmentsResource(server: McpServer, client: CustifyClient): void {
  server.resource(
    'segments',
    'custify://segments',
    {
      description: 'List of all Custify segments (smart lists) for companies',
      mimeType: 'application/json',
    },
    async () => {
      const result = await client.listSegments({
        toolName: 'segments_resource',
        toolCategory: 'resources',
      });

      const segments = (result as any).segments || result.data || result.items || [];
      const formatted = segments.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description ?? null,
        type: s.type ?? null,
        color: s.color ?? null,
        companies_count: s.companies_count ?? null,
      }));

      return {
        contents: [
          {
            uri: 'custify://segments',
            mimeType: 'application/json',
            text: JSON.stringify({ segments: formatted, total: formatted.length }),
          },
        ],
      };
    }
  );
}
