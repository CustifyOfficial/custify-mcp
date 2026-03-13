import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CustifyClient } from '../api/client.js';
import type { Playbook } from '../api/types.js';

export function registerPlaybooksResource(server: McpServer, client: CustifyClient): void {
  server.resource(
    'playbooks',
    'custify://playbooks',
    {
      description: 'List of all Custify playbooks for companies',
      mimeType: 'application/json',
    },
    async () => {
      const result = await client.listPlaybooks({
        toolName: 'playbooks_resource',
        toolCategory: 'resources',
      });

      const playbooks: Playbook[] = result.playbooks || result.data || result.items || [];
      const formatted = playbooks.map((p: Playbook) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        type: p.type ?? null,
        status: p.status ?? null,
      }));

      return {
        contents: [
          {
            uri: 'custify://playbooks',
            mimeType: 'application/json',
            text: JSON.stringify({ playbooks: formatted, total: formatted.length }),
          },
        ],
      };
    }
  );
}
