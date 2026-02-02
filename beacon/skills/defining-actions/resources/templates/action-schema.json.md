# Template: Action JSON Schema

> JSON Schema template for x402 endpoint request/response.

## Template

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "{{SCHEMA_ID}}",
  "title": "{{TITLE}}",
  "description": "{{DESCRIPTION}}",
  "type": "object",
  "properties": {
    {{PROPERTIES}}
  },
  "required": [{{REQUIRED}}],
  "additionalProperties": {{ADDITIONAL_PROPERTIES}}
}
```

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{SCHEMA_ID}}` | Unique schema identifier | `"https://api.example.com/schemas/generate-image-request.json"` |
| `{{TITLE}}` | Human-readable title | `"Generate Image Request"` |
| `{{DESCRIPTION}}` | Schema description | `"Request body for AI image generation"` |
| `{{PROPERTIES}}` | Property definitions | See below |
| `{{REQUIRED}}` | Required property names | `"prompt"` |
| `{{ADDITIONAL_PROPERTIES}}` | Allow extra fields | `false` |

## Property Definitions

### String Property

```json
"prompt": {
  "type": "string",
  "description": "Text prompt for image generation",
  "minLength": 1,
  "maxLength": 1000
}
```

### Optional String with Enum

```json
"style": {
  "type": "string",
  "description": "Art style for generation",
  "enum": ["realistic", "artistic", "anime", "sketch"],
  "default": "artistic"
}
```

### Number Property

```json
"width": {
  "type": "integer",
  "description": "Image width in pixels",
  "minimum": 256,
  "maximum": 2048,
  "default": 1024
}
```

### Boolean Property

```json
"mintable": {
  "type": "boolean",
  "description": "Whether the image can be minted as NFT",
  "default": true
}
```

## Example Schemas

### Generate Image Request

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "generate-image-request",
  "title": "Generate Image Request",
  "description": "Request body for AI image generation endpoint",
  "type": "object",
  "properties": {
    "prompt": {
      "type": "string",
      "description": "Text prompt describing the image to generate",
      "minLength": 1,
      "maxLength": 1000
    },
    "style": {
      "type": "string",
      "description": "Art style for the generated image",
      "enum": ["realistic", "artistic", "anime", "abstract"],
      "default": "artistic"
    },
    "width": {
      "type": "integer",
      "description": "Image width in pixels",
      "minimum": 256,
      "maximum": 2048,
      "default": 1024
    },
    "height": {
      "type": "integer",
      "description": "Image height in pixels",
      "minimum": 256,
      "maximum": 2048,
      "default": 1024
    }
  },
  "required": ["prompt"],
  "additionalProperties": false
}
```

### Generate Image Response

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "generate-image-response",
  "title": "Generate Image Response",
  "description": "Response from AI image generation endpoint",
  "type": "object",
  "properties": {
    "image": {
      "type": "string",
      "format": "uri",
      "description": "IPFS URI of the generated image"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "prompt": {
          "type": "string",
          "description": "The prompt used for generation"
        },
        "style": {
          "type": "string"
        },
        "generatedAt": {
          "type": "string",
          "format": "date-time"
        }
      }
    },
    "mintable": {
      "type": "boolean",
      "description": "Whether this image can be minted as an NFT"
    }
  },
  "required": ["image", "mintable"],
  "additionalProperties": false
}
```

### Mint Request

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "mint-request",
  "title": "Mint NFT Request",
  "description": "Request body for minting an image as NFT",
  "type": "object",
  "properties": {
    "imageId": {
      "type": "string",
      "description": "ID of the image to mint"
    },
    "recipient": {
      "type": "string",
      "pattern": "^0x[a-fA-F0-9]{40}$",
      "description": "Ethereum address to receive the NFT"
    }
  },
  "required": ["imageId", "recipient"],
  "additionalProperties": false
}
```

## Output Location

`app/api/{endpoint-name}/schema.json`

Example: `app/api/generate-image/schema.json`
