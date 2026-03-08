export interface Config {
  apiKey: string;
  apiBaseUrl: string;
  transport: 'stdio' | 'streamable-http';
  port: number;
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
    transport: (process.env.MCP_TRANSPORT as 'stdio' | 'streamable-http') || 'stdio',
    port: parseInt(process.env.PORT || '3000', 10),
  };
}
