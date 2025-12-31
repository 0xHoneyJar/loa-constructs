/**
 * API Documentation Routes
 * @see sprint.md T12.3: Documentation
 */

import { Hono } from 'hono';
import { openApiSpec } from '../docs/openapi.js';

const docsRouter = new Hono();

/**
 * GET /v1/docs/openapi.json
 * OpenAPI specification in JSON format
 */
docsRouter.get('/openapi.json', (c) => {
  return c.json(openApiSpec);
});

/**
 * GET /v1/docs/openapi.yaml
 * OpenAPI specification in YAML format
 */
docsRouter.get('/openapi.yaml', (c) => {
  // Convert to YAML (basic implementation)
  const yaml = jsonToYaml(openApiSpec);
  c.header('Content-Type', 'text/yaml');
  return c.text(yaml);
});

/**
 * GET /v1/docs
 * Swagger UI HTML page
 */
docsRouter.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loa Skills Registry API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 30px 0; }
    .swagger-ui .info .title { font-size: 2rem; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/v1/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: 'BaseLayout',
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
      });
    };
  </script>
</body>
</html>`;

  c.header('Content-Type', 'text/html');
  return c.html(html);
});

/**
 * Simple JSON to YAML converter
 * Note: For production, use a proper yaml library
 */
function jsonToYaml(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);

  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (typeof obj === 'string') {
    // Handle multiline strings
    if (obj.includes('\n')) {
      const lines = obj.split('\n');
      return '|\n' + lines.map(line => spaces + '  ' + line).join('\n');
    }
    // Quote strings that need it
    if (obj.match(/^[0-9]/) || obj.includes(':') || obj.includes('#') || obj.includes("'") || obj === '') {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj
      .map(item => {
        const value = jsonToYaml(item, indent + 1);
        if (typeof item === 'object' && item !== null) {
          return spaces + '- ' + value.trim().replace(/^\s*/, '');
        }
        return spaces + '- ' + value;
      })
      .join('\n');
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';
    return entries
      .map(([key, value]) => {
        const yamlValue = jsonToYaml(value, indent + 1);
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return spaces + key + ':\n' + yamlValue;
        }
        if (Array.isArray(value)) {
          return spaces + key + ':\n' + yamlValue;
        }
        return spaces + key + ': ' + yamlValue;
      })
      .join('\n');
  }

  return String(obj);
}

export { docsRouter };
