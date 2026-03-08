import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CustifyClient } from '../api/client.js';

export function registerHealthScoresResource(server: McpServer, client: CustifyClient): void {
  server.resource(
    'health-score-definitions',
    'custify://health-score-definitions',
    {
      description: 'List of all Custify health score definitions and their configurations',
      mimeType: 'application/json',
    },
    async () => {
      const definitions = await client.listHealthScoreDefinitions({
        toolName: 'health_scores_resource',
        toolCategory: 'resources',
      });

      const items = Array.isArray(definitions) ? definitions : [];
      const formatted = items.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description ?? null,
        type: d.type ?? null,
        weight: d.weight ?? null,
        ranges: d.ranges ?? null,
      }));

      return {
        contents: [
          {
            uri: 'custify://health-score-definitions',
            mimeType: 'application/json',
            text: JSON.stringify({ health_score_definitions: formatted, total: formatted.length }),
          },
        ],
      };
    }
  );
}
