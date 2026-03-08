import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CustifyClient } from './api/client.js';
import { Config } from './config.js';
import { registerAccountTools } from './tools/accounts.js';
import { registerContactTools } from './tools/contacts.js';
import { registerHealthTools } from './tools/health.js';
import { registerAlertTools } from './tools/alerts.js';
import { registerActionTools } from './tools/actions.js';
import { registerSegmentsResource } from './resources/segments.js';
import { registerPlaybooksResource } from './resources/playbooks.js';
import { registerHealthScoresResource } from './resources/health-scores.js';

export function createServer(config: Config): McpServer {
  const client = new CustifyClient(config.apiKey, config.apiBaseUrl);

  const server = new McpServer({
    name: 'custify',
    version: '1.0.0',
    description: 'Connect AI tools to Custify customer success data',
  });

  // Register tools
  registerAccountTools(server, client);
  registerContactTools(server, client);
  registerHealthTools(server, client);
  registerAlertTools(server, client);
  registerActionTools(server, client);

  // Register resources
  registerSegmentsResource(server, client);
  registerPlaybooksResource(server, client);
  registerHealthScoresResource(server, client);

  return server;
}
