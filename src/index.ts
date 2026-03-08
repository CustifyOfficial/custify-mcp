#!/usr/bin/env node
import { loadConfig } from './config.js';
import { createServer } from './server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const config = loadConfig();
const server = createServer(config);

if (config.transport === 'stdio') {
  const transport = new StdioServerTransport();
  await server.connect(transport);
} else {
  const express = (await import('express')).default;
  const { StreamableHTTPServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/streamableHttp.js'
  );

  const app = express();
  app.use(express.json());

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  app.post('/mcp', async (req, res) => {
    await transport.handleRequest(req, res, req.body);
  });

  app.get('/mcp', async (req, res) => {
    await transport.handleRequest(req, res);
  });

  app.delete('/mcp', async (req, res) => {
    await transport.handleRequest(req, res);
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', server: 'custify-mcp-server', version: '1.0.0' });
  });

  await server.connect(transport);

  app.listen(config.port, () => {
    console.log(`Custify MCP Server listening on port ${config.port}`);
  });
}
