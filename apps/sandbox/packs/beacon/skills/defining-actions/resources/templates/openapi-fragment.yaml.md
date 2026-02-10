# Template: OpenAPI Fragment

> OpenAPI 3.0 specification fragment for x402 endpoints.

## Template

```yaml
openapi: 3.0.3
info:
  title: {{SERVICE_NAME}} API
  description: |
    {{SERVICE_DESCRIPTION}}

    ## Payment Protocol

    This API uses the x402 v2 payment protocol. All payment-enabled endpoints
    require an `X-Payment` header with a valid payment.

    **Supported Networks:** {{CHAIN_NAME}} ({{NETWORK_ID}})
    **Supported Tokens:** {{DEFAULT_TOKEN}}

    See /.well-known/x402 for discovery endpoint.
  version: '{{VERSION}}'
  contact:
    name: {{CONTACT_NAME}}
    url: {{CONTACT_URL}}

servers:
  - url: {{BASE_URL}}
    description: {{SERVER_DESCRIPTION}}

paths:
  {{PATHS}}

components:
  schemas:
    {{SCHEMAS}}
  securitySchemes:
    x402Payment:
      type: apiKey
      in: header
      name: X-Payment
      description: x402 v2 payment header (base64-encoded)

security:
  - x402Payment: []
```

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{SERVICE_NAME}}` | API title | `"Mibera Generator"` |
| `{{SERVICE_DESCRIPTION}}` | API description | `"AI image generation and NFT minting"` |
| `{{VERSION}}` | API version | `"1.0.0"` |
| `{{CONTACT_NAME}}` | Contact name | `"0xHoneyJar"` |
| `{{CONTACT_URL}}` | Contact URL | `"https://github.com/0xHoneyJar"` |
| `{{BASE_URL}}` | API base URL | `"https://api.mibera.com"` |
| `{{SERVER_DESCRIPTION}}` | Server description | `"Production"` |
| `{{PATHS}}` | Path definitions | See below |
| `{{SCHEMAS}}` | Schema definitions | See below |

## Path Template

```yaml
/api/generate-image:
  post:
    summary: Generate AI image
    description: |
      Generate an AI image from a text prompt.

      **Payment:** 1 {{DEFAULT_TOKEN}} (50% subsidized)
    operationId: generateImage
    x-payment:
      amount: '1'
      currency: {{DEFAULT_TOKEN}}
      subsidized: true
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/GenerateImageRequest'
    responses:
      '200':
        description: Image generated successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GenerateImageResponse'
      '402':
        description: Payment required
        headers:
          X-Payment-Required:
            description: Base64-encoded payment requirements
            schema:
              type: string
          X-Payment-Version:
            description: x402 protocol version
            schema:
              type: string
              enum: ['2']
          X-Payment-Token:
            description: Required payment token
            schema:
              type: string
              enum: ['{{DEFAULT_TOKEN}}']
      '429':
        description: Rate limit exceeded
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RateLimitError'
```

## Schema Template

```yaml
GenerateImageRequest:
  type: object
  required:
    - prompt
  properties:
    prompt:
      type: string
      description: Text prompt for image generation
      minLength: 1
      maxLength: 1000
    style:
      type: string
      description: Art style
      enum: [realistic, artistic, anime, abstract]
      default: artistic

GenerateImageResponse:
  type: object
  required:
    - image
    - mintable
  properties:
    image:
      type: string
      format: uri
      description: IPFS URI of generated image
    metadata:
      type: object
      properties:
        prompt:
          type: string
        style:
          type: string
        generatedAt:
          type: string
          format: date-time
    mintable:
      type: boolean
      description: Whether image can be minted as NFT

RateLimitError:
  type: object
  properties:
    error:
      type: string
      example: Rate limit exceeded
    retryAfter:
      type: integer
      description: Seconds until rate limit resets
```

## Complete Example

```yaml
openapi: 3.0.3
info:
  title: Mibera Generator API
  description: |
    AI image generation and NFT minting service for Mibera culture.

    ## Payment Protocol

    This API uses the x402 v2 payment protocol. All payment-enabled endpoints
    require an `X-Payment` header with a valid payment.

    **Supported Networks:** {{CHAIN_NAME}} ({{NETWORK_ID}})
    **Supported Tokens:** {{DEFAULT_TOKEN}}

    See /.well-known/x402 for discovery endpoint.
  version: '1.0.0'
  contact:
    name: 0xHoneyJar
    url: https://github.com/0xHoneyJar

servers:
  - url: https://mibera.com
    description: Production

paths:
  /api/generate-image:
    post:
      summary: Generate AI image
      description: Generate an AI image from a text prompt.
      operationId: generateImage
      x-payment:
        amount: '1'
        currency: {{DEFAULT_TOKEN}}
        subsidized: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GenerateImageRequest'
      responses:
        '200':
          description: Image generated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GenerateImageResponse'
        '402':
          description: Payment required

  /api/mint:
    post:
      summary: Mint NFT
      description: Mint a generated image as an NFT.
      operationId: mintNFT
      x-payment:
        amount: '5'
        currency: {{DEFAULT_TOKEN}}
        subsidized: false
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MintRequest'
      responses:
        '200':
          description: NFT minted successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MintResponse'
        '402':
          description: Payment required

components:
  schemas:
    GenerateImageRequest:
      type: object
      required: [prompt]
      properties:
        prompt:
          type: string
          minLength: 1
          maxLength: 1000
        style:
          type: string
          enum: [realistic, artistic, anime, abstract]

    GenerateImageResponse:
      type: object
      required: [image, mintable]
      properties:
        image:
          type: string
          format: uri
        mintable:
          type: boolean

    MintRequest:
      type: object
      required: [imageId, recipient]
      properties:
        imageId:
          type: string
        recipient:
          type: string
          pattern: '^0x[a-fA-F0-9]{40}$'

    MintResponse:
      type: object
      required: [tokenId, txHash, contractAddress]
      properties:
        tokenId:
          type: string
        txHash:
          type: string
        contractAddress:
          type: string

  securitySchemes:
    x402Payment:
      type: apiKey
      in: header
      name: X-Payment

security:
  - x402Payment: []
```

## Output Location

`grimoires/beacon/discovery/openapi.yaml`
