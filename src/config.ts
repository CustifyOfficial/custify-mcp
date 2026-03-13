export interface Config {
  apiKey: string;
  apiBaseUrl: string;
  transport: 'stdio' | 'streamable-http';
  port: number;
}

function validateTransport(value?: string): 'stdio' | 'streamable-http' {
  const transport = value || 'stdio';
  if (transport !== 'stdio' && transport !== 'streamable-http') {
    console.error(`Error: Invalid MCP_TRANSPORT value "${transport}". Must be "stdio" or "streamable-http".`);
    process.exit(1);
  }
  return transport;
}

export function loadConfig(): Config {
  const apiKey = process.env.CUSTIFY_API_KEY;
  if (!apiKey) {
    console.error('Error: CUSTIFY_API_KEY environment variable is required.');
    process.exit(1);
  }
  return {
    apiKey,
    apiBaseUrl: process.env.CUSTIFY_API_URL || 'https://api.custify.com',
    transport: validateTransport(process.env.MCP_TRANSPORT),
    port: parseInt(process.env.PORT || '3000', 10),
  };
}
