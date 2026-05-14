import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CustifyClient } from '../api/client.js';
import type { Lifecycle } from '../api/types.js';

const PAGE_SIZE = 100;

function formatLifecycle(lifecycle: Lifecycle) {
  return {
    id: lifecycle.id,
    name: lifecycle.name ?? null,
    description: lifecycle.description ?? null,
    start_condition: lifecycle.startCondition ?? null,
    start_condition_entity: lifecycle.startConditionEntity ?? null,
    start_condition_entity_name: lifecycle.startConditionEntityName ?? null,
    end_condition: lifecycle.endCondition ?? null,
    end_condition_entity: lifecycle.endConditionEntity ?? null,
    end_condition_entity_name: lifecycle.endConditionEntityName ?? null,
    days_to_complete: lifecycle.daysToComplete ?? null,
    days_to_stuck: lifecycle.daysToStuck ?? null,
    position: lifecycle.position ?? null,
    status: lifecycle.status ?? null,
    show_in_c360: lifecycle.showInC360 ?? null,
    tags: lifecycle.tags ?? [],
    goals: lifecycle.goals ?? [],
    tasks: lifecycle.tasks ?? [],
    settings: lifecycle.settings ?? {},
    created_by: lifecycle.created_by ?? null,
    created_by_name: lifecycle.created_by_name ?? null,
    updated_by: lifecycle.updated_by ?? null,
    updated_by_name: lifecycle.updated_by_name ?? null,
    created_at: lifecycle.created_at ?? null,
    updated_at: lifecycle.updated_at ?? null,
  };
}

async function listAllLifecycles(client: CustifyClient): Promise<{ lifecycles: Lifecycle[]; total: number }> {
  const result = await client.listLifecycles(
    { page: 1, itemsPerPage: PAGE_SIZE },
    { toolName: 'lifecycles_resource', toolCategory: 'resources' }
  );
  const lifecycles: Lifecycle[] = result.lifecycles || result.data || result.items || [];
  const total = result.total ?? lifecycles.length;

  for (let page = 2; lifecycles.length < total; page++) {
    const nextResult = await client.listLifecycles(
      { page, itemsPerPage: PAGE_SIZE },
      { toolName: 'lifecycles_resource', toolCategory: 'resources' }
    );
    const nextLifecycles: Lifecycle[] = nextResult.lifecycles || nextResult.data || nextResult.items || [];
    if (nextLifecycles.length === 0) break;
    lifecycles.push(...nextLifecycles);
  }

  return { lifecycles, total };
}

export function registerLifecyclesResource(server: McpServer, client: CustifyClient): void {
  server.resource(
    'lifecycles',
    'custify://lifecycles',
    {
      description: 'List of all Custify lifecycle definitions with goals and task templates',
      mimeType: 'application/json',
    },
    async () => {
      const { lifecycles, total } = await listAllLifecycles(client);
      const formatted = lifecycles.map(formatLifecycle);

      return {
        contents: [
          {
            uri: 'custify://lifecycles',
            mimeType: 'application/json',
            text: JSON.stringify({ lifecycles: formatted, total }),
          },
        ],
      };
    }
  );
}
