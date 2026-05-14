import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CustifyClient } from '../api/client.js';
import type { CalculatedMetric } from '../api/types.js';

const PAGE_SIZE = 50;

function formatCalculatedMetric(metric: CalculatedMetric, fallbackType: 'company' | 'people') {
  return {
    id: metric.id,
    name: metric.name ?? null,
    description: metric.description ?? null,
    type: metric.type ?? fallbackType,
    frequency: metric.frequency ?? null,
    tags: metric.tags ?? [],
    created_at: metric.created_at ?? null,
    updated_at: metric.updated_at ?? null,
  };
}

async function listAllCalculatedMetricsByType(client: CustifyClient, type: 'company' | 'people'): Promise<CalculatedMetric[]> {
  const result = await client.listCalculatedMetrics(
    { type, page: 1, itemsPerPage: PAGE_SIZE },
    { toolName: 'calculated_metrics_resource', toolCategory: 'resources' }
  );
  const metrics: CalculatedMetric[] = result.calculated_metrics || result.data || result.items || [];
  const total = result.total ?? metrics.length;

  for (let page = 2; metrics.length < total; page++) {
    const nextResult = await client.listCalculatedMetrics(
      { type, page, itemsPerPage: PAGE_SIZE },
      { toolName: 'calculated_metrics_resource', toolCategory: 'resources' }
    );
    const nextMetrics: CalculatedMetric[] = nextResult.calculated_metrics || nextResult.data || nextResult.items || [];
    if (nextMetrics.length === 0) break;
    metrics.push(...nextMetrics);
  }

  return metrics;
}

export function registerCalculatedMetricsResource(server: McpServer, client: CustifyClient): void {
  server.resource(
    'calculated-metrics',
    'custify://calculated-metrics',
    {
      description: 'List of all Custify calculated metric definitions for companies and people',
      mimeType: 'application/json',
    },
    async () => {
      const [companyMetrics, peopleMetrics] = await Promise.all([
        listAllCalculatedMetricsByType(client, 'company'),
        listAllCalculatedMetricsByType(client, 'people'),
      ]);

      const formatted = [
        ...companyMetrics.map((metric) => formatCalculatedMetric(metric, 'company')),
        ...peopleMetrics.map((metric) => formatCalculatedMetric(metric, 'people')),
      ];

      return {
        contents: [
          {
            uri: 'custify://calculated-metrics',
            mimeType: 'application/json',
            text: JSON.stringify({
              calculated_metrics: formatted,
              total: formatted.length,
              by_type: {
                company: companyMetrics.length,
                people: peopleMetrics.length,
              },
            }),
          },
        ],
      };
    }
  );
}
