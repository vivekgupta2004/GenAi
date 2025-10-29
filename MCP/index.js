import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'Weather Data Fetcher',
  version: '1.0.0',
});

async function getWeatherByCity(city = '') {
  if (city.toLowerCase() === 'patiala') {
    return { temp: '30C', forecast: 'chances of high rain' };
  }

  if (city.toLowerCase() === 'delhi') {
    return { temp: '40C', forecast: 'chances of high warm winds' };
  }

  return { temp: null, error: 'Unable to get data' };
}

server.tool(
  'getWeatherDataByCityName',
  {
    city: z.string(),
  },
  async ({ city }) => {
    return {
      content: [
        { type: 'text', text: JSON.stringify(await getWeatherByCity(city)) },
      ],
    };
  }
);

async function init() {
  // ✅ Pass configuration options here
  const transport = new StreamableHTTPServerTransport({
    port: 3000, // you can change this
    sessionIdGenerator: () => Math.random().toString(36).slice(2),
  });

  await server.connect(transport);
  console.log('✅ MCP server running at http://localhost:3000');
}

init();
