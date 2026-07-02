#!/usr/bin/env node
import type { Request, Response } from 'express';
import { loadConfig } from './config.js';
import { createServer } from './server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const config = loadConfig();

if (config.transport === 'stdio') {
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
} else {
  const express = (await import('express')).default;
  const { StreamableHTTPServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/streamableHttp.js'
  );

  const app = express();
  app.use(express.json());

  // Stateless mode (sessionIdGenerator: undefined) requires a fresh Server +
  // Transport per request. A single shared instance can only field one
  // request before erroring on every subsequent call, since the SDK does not
  // support reusing a stateless transport across requests.
  const handleStatelessRequest = async (req: Request, res: Response, body: unknown) => {
    const server = createServer(config);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  };

  app.post('/mcp', async (req, res) => {
    await handleStatelessRequest(req, res, req.body);
  });

  app.get('/mcp', async (req, res) => {
    await handleStatelessRequest(req, res, undefined);
  });

  app.delete('/mcp', async (req, res) => {
    await handleStatelessRequest(req, res, undefined);
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', server: 'custify-mcp-server', version: '1.0.0' });
  });

  app.listen(config.port, () => {
    console.log(`Custify MCP Server listening on port ${config.port}`);
  });
}
