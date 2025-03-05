# API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

All API endpoints require authentication using JWT tokens except for public routes.

### Headers

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "USER"
}
```

**Response:**
```json
{
  "token": "jwt.token.here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

#### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt.token.here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER"
  }
}
```

#### POST /auth/forgot-password
Request a password reset link.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account exists, a reset link will be sent"
}
```

#### POST /auth/reset-password
Reset password using reset token.

**Request:**
```json
{
  "token": "reset.token.here",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successful"
}
```

#### GET /auth/me
Get current user profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER"
}
```

#### POST /auth/change-password
Change user password.

**Request:**
```json
{
  "oldPassword": "currentpassword123",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password updated successfully"
}
```

#### POST /auth/logout
Logout current user.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### System Metrics

#### GET /metrics/health
Get system health status. This endpoint is public and does not require authentication.

**Response:**
```json
{
  "status": "healthy",
  "score": 100,
  "issues": [],
  "uptime": 3600,
  "cpu": {
    "usage": 45.2,
    "cores": 8,
    "model": "Intel(R) Core(TM) i7",
    "speed": 2.6
  },
  "memory": {
    "total": 16000000000,
    "free": 8000000000,
    "usage": 0.5
  },
  "database": {
    "status": "connected",
    "active_connections": 5,
    "size": 1024000,
    "tables": 10
  }
}
```

#### GET /metrics/system
Get detailed system metrics.

**Response:**
```json
{
  "timestamp": "2024-01-20T12:00:00Z",
  "cpuUsage": 45.2,
  "memoryUsage": 78.5,
  "activeUsers": 125,
  "totalRequests": 1500,
  "averageResponseTime": 250,
  "errorCount": 0,
  "warningCount": 0
}
```

#### GET /metrics/requests
Get request metrics data.

**Response:**
```json
{
  "totalRequests": 1500,
  "successRate": 99.5,
  "averageResponseTime": 250,
  "requestsPerMinute": 25,
  "topEndpoints": [
    { "path": "/api/auth/login", "count": 250 },
    { "path": "/api/metrics/health", "count": 200 }
  ],
  "requestsByMethod": {
    "GET": 1200,
    "POST": 250,
    "PUT": 50
  }
}
```

#### GET /metrics/locations
Get geographic location data for requests.

**Response:**
```json
{
  "locations": [
    { "country": "US", "count": 500, "lat": 37.09024, "lng": -95.712891 },
    { "country": "UK", "count": 200, "lat": 55.378051, "lng": -3.435973 }
  ],
  "topCountries": [
    { "country": "US", "count": 500 },
    { "country": "UK", "count": 200 }
  ]
}
```

#### GET /metrics/ai
Get AI usage metrics.

**Response:**
```json
{
  "totalRequests": 500,
  "averageResponseTime": 350,
  "tokensUsed": 25000,
  "costEstimate": 0.50,
  "topModels": [
    { "model": "gemini-2.0-flash", "count": 300 },
    { "model": "claude-3-sonnet", "count": 200 }
  ],
  "requestsByType": {
    "chat": 400,
    "analysis": 100
  }
}
```

#### GET /metrics/insights/performance
Get performance insights with optional real-time data.

**Query Parameters:**
- `realtime`: Set to `true` to bypass cache and get real-time data

**Response:**
```json
{
  "summary": "System performance is within normal parameters",
  "score": 85,
  "trends": {
    "cpu": [45.2, 46.1, 44.8, 45.5],
    "memory": [78.5, 79.2, 77.8, 78.1]
  },
  "recommendations": [
    "Consider scaling up during peak hours",
    "Optimize database queries"
  ]
}
```

#### GET /metrics/insights/security
Get security insights.

**Response:**
```json
{
  "score": 90,
  "vulnerabilities": [],
  "recentAttempts": [
    {
      "type": "login",
      "status": "failed",
      "ip": "192.168.1.1",
      "timestamp": "2024-01-20T12:00:00Z"
    }
  ],
  "recommendations": [
    "Enable two-factor authentication",
    "Review API key permissions"
  ]
}
```

#### GET /metrics/insights/usage
Get usage insights.

**Response:**
```json
{
  "activeUsers": {
    "daily": 125,
    "weekly": 500,
    "monthly": 1500
  },
  "topFeatures": [
    { "feature": "Dashboard", "usage": 450 },
    { "feature": "AI Assistant", "usage": 350 }
  ],
  "growthRate": 5.2,
  "retentionRate": 85.5
}
```

#### GET /metrics/logs/recent
Get recent system logs.

**Response:**
```json
{
  "logs": [
    {
      "level": "info",
      "message": "User logged in",
      "timestamp": "2024-01-20T12:00:00Z",
      "context": { "userId": "uuid" }
    },
    {
      "level": "warn",
      "message": "High CPU usage detected",
      "timestamp": "2024-01-20T11:55:00Z"
    }
  ],
  "total": 100
}
```

#### GET /metrics/logs/errors
Get recent error logs.

**Response:**
```json
{
  "errors": [
    {
      "level": "error",
      "message": "Database connection failed",
      "stack": "Error: Connection refused...",
      "timestamp": "2024-01-20T11:50:00Z"
    }
  ],
  "total": 5
}
```

#### GET /metrics/logs/auth
Get authentication logs.

**Response:**
```json
{
  "logs": [
    {
      "action": "login",
      "status": "success",
      "userId": "uuid",
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2024-01-20T12:00:00Z"
    }
  ],
  "total": 50
}
```

### AI Features

#### POST /ai/analyze
Analyze page data and provide insights.

**Request:**
```json
{
  "pageData": {
    "metrics": ["cpu", "memory", "requests"],
    "timeRange": "1h"
  }
}
```

**Response:**
```json
{
  "analysis": {
    "summary": "System performance is within normal parameters",
    "recommendations": [
      "Consider scaling up during peak hours",
      "Optimize database queries"
    ]
  }
}
```

#### POST /ai/schema/generate
Generate database schema based on description.

**Request:**
```json
{
  "description": "A blog system with users, posts, and comments",
  "options": {
    "dialect": "postgres",
    "includeTimestamps": true
  }
}
```

**Response:**
```json
{
  "schema": {
    "users": {
      "id": "uuid PRIMARY KEY",
      "email": "VARCHAR(255) UNIQUE NOT NULL",
      "password": "VARCHAR(255) NOT NULL",
      "name": "VARCHAR(100)",
      "createdAt": "TIMESTAMP",
      "updatedAt": "TIMESTAMP"
    },
    "posts": {
      "id": "uuid PRIMARY KEY",
      "title": "VARCHAR(255) NOT NULL",
      "content": "TEXT",
      "userId": "uuid REFERENCES users(id)",
      "createdAt": "TIMESTAMP",
      "updatedAt": "TIMESTAMP"
    },
    "comments": {
      "id": "uuid PRIMARY KEY",
      "content": "TEXT",
      "userId": "uuid REFERENCES users(id)",
      "postId": "uuid REFERENCES posts(id)",
      "createdAt": "TIMESTAMP",
      "updatedAt": "TIMESTAMP"
    }
  },
  "sql": "CREATE TABLE users (...);"
}
```

#### POST /ai/crud/generate
Generate CRUD configuration for a data model.

**Request:**
```json
{
  "model": {
    "name": "Product",
    "fields": [
      { "name": "name", "type": "string", "required": true },
      { "name": "price", "type": "number", "required": true },
      { "name": "description", "type": "string" },
      { "name": "category", "type": "string", "enum": ["Electronics", "Clothing", "Food"] }
    ]
  },
  "options": {
    "generateValidation": true,
    "includeSearch": true
  }
}
```

**Response:**
```json
{
  "config": {
    "endpoint": "/products",
    "model": "Product",
    "fields": [...],
    "validation": {...},
    "operations": ["create", "read", "update", "delete", "search"]
  },
  "code": {
    "controller": "...",
    "routes": "...",
    "model": "..."
  }
}
```

#### POST /ai/dashboard/suggest
Get AI suggestions for dashboard widgets.

**Request:**
```json
{
  "userRole": "ADMIN",
  "metrics": ["cpu", "memory", "requests", "errors"],
  "preferences": {
    "focus": "performance"
  }
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "type": "lineChart",
      "title": "CPU & Memory Usage",
      "metrics": ["cpu", "memory"],
      "refreshInterval": 60
    },
    {
      "type": "counter",
      "title": "Active Users",
      "metric": "activeUsers",
      "refreshInterval": 30
    },
    {
      "type": "table",
      "title": "Recent Errors",
      "metric": "errors",
      "limit": 5,
      "refreshInterval": 120
    }
  ]
}
```

#### POST /ai/provider/verify
Verify AI provider configuration.

**Request:**
```json
{
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-4"
}
```

**Response:**
```json
{
  "valid": true,
  "provider": "openai",
  "models": ["gpt-4", "gpt-3.5-turbo"],
  "capabilities": ["chat", "embeddings", "image-generation"]
}
```

#### POST /ai/message
Send message to AI system.

**Request:**
```json
{
  "content": "How can I optimize my database performance?",
  "context": {
    "previousMessages": [],
    "systemMetrics": {
      "database": {
        "queryTime": 250,
        "connections": 10
      }
    }
  }
}
```

**Response:**
```json
{
  "id": "msg_123",
  "content": "Based on your current metrics, I recommend...",
  "role": "assistant",
  "metadata": {
    "provider": "gemini",
    "model": "gemini-2.0-flash",
    "timestamp": "2024-01-20T12:00:00Z"
  }
}
```

#### POST /ai/command
Execute AI command.

**Request:**
```json
{
  "command": "analyze_performance",
  "parameters": {
    "timeRange": "24h",
    "metrics": ["cpu", "memory", "database"]
  }
}
```

**Response:**
```json
{
  "result": {
    "analysis": "...",
    "recommendations": [...]
  },
  "metadata": {
    "executionTime": 1.5,
    "timestamp": "2024-01-20T12:00:00Z"
  }
}
```

#### GET /ai/status
Get AI system status.

**Response:**
```json
{
  "status": "ready",
  "activeProviders": ["gemini", "claude"],
  "connected": true,
  "hasProviders": true,
  "initialized": true,
  "ready": true,
  "timestamp": "2024-01-20T12:00:00Z"
}
```

#### GET /ai/settings
Get AI system settings.

**Response:**
```json
{
  "providers": [
    {
      "name": "gemini",
      "enabled": true,
      "models": ["gemini-2.0-flash", "gemini-2.0-pro"],
      "defaultModel": "gemini-2.0-flash"
    },
    {
      "name": "claude",
      "enabled": true,
      "models": ["claude-3-sonnet", "claude-3-opus"],
      "defaultModel": "claude-3-sonnet"
    }
  ],
  "defaultProvider": "gemini",
  "maxTokens": 4000,
  "temperature": 0.7,
  "features": {
    "chat": true,
    "analysis": true,
    "codeGeneration": true
  }
}
```

#### PUT /ai/settings
Update AI system settings.

**Request:**
```json
{
  "defaultProvider": "claude",
  "temperature": 0.5,
  "features": {
    "codeGeneration": false
  }
}
```

**Response:**
```json
{
  "updated": true,
  "settings": {
    "defaultProvider": "claude",
    "temperature": 0.5,
    "features": {
      "chat": true,
      "analysis": true,
      "codeGeneration": false
    }
  }
}
```

### API Keys

#### GET /api-keys
Get all API keys for the current user.

**Response:**
```json
{
  "keys": [
    {
      "id": "key_123",
      "name": "Development Key",
      "prefix": "dev_",
      "createdAt": "2024-01-20T12:00:00Z",
      "lastUsed": "2024-01-20T12:30:00Z",
      "permissions": ["read", "write"]
    }
  ]
}
```

#### POST /api-keys
Create a new API key.

**Request:**
```json
{
  "name": "Production Key",
  "permissions": ["read"]
}
```

**Response:**
```json
{
  "id": "key_456",
  "name": "Production Key",
  "key": "prod_abcdef123456", // Full key, only shown once
  "prefix": "prod_",
  "createdAt": "2024-01-20T12:00:00Z",
  "permissions": ["read"]
}
```

#### DELETE /api-keys/:id
Delete an API key.

**Response:**
```json
{
  "success": true,
  "message": "API key deleted successfully"
}
```

### CRUD Pages

#### GET /crud/pages
Get all CRUD pages for the current user.

**Response:**
```json
{
  "pages": [
    {
      "id": "page_123",
      "name": "Products",
      "endpoint": "/products",
      "description": "Product management",
      "schema": {...},
      "config": {...},
      "createdAt": "2024-01-20T12:00:00Z",
      "updatedAt": "2024-01-20T12:30:00Z"
    }
  ],
  "total": 1
}
```

#### POST /crud/pages
Create a new CRUD page.

**Request:**
```json
{
  "name": "Customers",
  "endpoint": "/customers",
  "description": "Customer management",
  "schema": {...},
  "config": {...}
}
```

**Response:**
```json
{
  "id": "page_456",
  "name": "Customers",
  "endpoint": "/customers",
  "description": "Customer management",
  "schema": {...},
  "config": {...},
  "createdAt": "2024-01-20T12:00:00Z",
  "updatedAt": "2024-01-20T12:00:00Z"
}
```

#### GET /crud/pages/:id
Get a specific CRUD page.

**Response:**
```json
{
  "id": "page_123",
  "name": "Products",
  "endpoint": "/products",
  "description": "Product management",
  "schema": {...},
  "config": {...},
  "createdAt": "2024-01-20T12:00:00Z",
  "updatedAt": "2024-01-20T12:30:00Z"
}
```

#### PUT /crud/pages/:id
Update a CRUD page.

**Request:**
```json
{
  "name": "Updated Products",
  "description": "Updated product management"
}
```

**Response:**
```json
{
  "id": "page_123",
  "name": "Updated Products",
  "endpoint": "/products",
  "description": "Updated product management",
  "schema": {...},
  "config": {...},
  "createdAt": "2024-01-20T12:00:00Z",
  "updatedAt": "2024-01-20T13:00:00Z"
}
```

#### DELETE /crud/pages/:id
Delete a CRUD page.

**Response:**
```json
{
  "success": true,
  "message": "CRUD page deleted successfully"
}
```

### Settings

#### GET /settings/ai
Get AI settings.

**Response:**
```json
{
  "providers": [
    {
      "name": "gemini",
      "enabled": true,
      "apiKey": "••••••••", // Masked for security
      "models": ["gemini-2.0-flash", "gemini-2.0-pro"]
    }
  ],
  "defaultProvider": "gemini",
  "features": {
    "chat": true,
    "analysis": true
  }
}
```

#### PUT /settings/ai
Update AI settings.

**Request:**
```json
{
  "providers": [
    {
      "name": "gemini",
      "enabled": true,
      "apiKey": "new-api-key"
    }
  ]
}
```

**Response:**
```json
{
  "updated": true,
  "settings": {
    "providers": [
      {
        "name": "gemini",
        "enabled": true,
        "apiKey": "••••••••", // Masked for security
        "models": ["gemini-2.0-flash", "gemini-2.0-pro"]
      }
    ],
    "defaultProvider": "gemini"
  }
}
```

## WebSocket API

Connect to WebSocket at `ws://localhost:3000/ws`

### Authentication

Authentication is required to establish a WebSocket connection. Use the same JWT token as for REST API authentication.

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'jwt.token.here'
  }
});
```

### Events

#### Client to Server Events

| Event | Description | Payload |
|-------|-------------|---------|
| `connection` | Establish connection | Authentication token |
| `message` | Send a message to AI | `{ content: string, id?: string, metadata?: object }` |
| `read` | Mark message as read | `{ id: string }` |
| `typing` | Indicate user is typing | `{ typing: boolean }` |
| `command` | Execute a command | `{ command: string, parameters: object }` |

#### Server to Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `ai:message` | Receive AI message | `{ id: string, content: string, role: string, metadata: object }` |
| `message` | Receive any message | `{ id: string, content: string, role: string, metadata: object }` |
| `system:update` | System metrics update | `{ metrics: SystemMetrics, timestamp: string }` |
| `alert` | System alert | `{ level: string, message: string, timestamp: string }` |
| `status` | AI system status | `{ status: string, providers: string[], connected: boolean }` |

### Event Types

```typescript
interface SystemUpdate {
  type: 'SYSTEM_UPDATE';
  data: {
    metrics: SystemMetrics;
    timestamp: string;
  }
}

interface AlertNotification {
  type: 'ALERT';
  data: {
    level: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }
}

interface AIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  metadata: {
    type: 'chat' | 'notification';
    read: boolean;
    provider?: string;
    model?: string;
    timestamp: string;
  }
}
```

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input
- `INTERNAL_ERROR`: Server error
- `RATE_LIMITED`: Too many requests
- `TOKEN_REFRESH_REQUIRED`: JWT token needs to be refreshed
- `PROVIDER_ERROR`: AI provider error
- `WEBSOCKET_ERROR`: WebSocket connection error

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per user
- WebSocket connections limited to 1 per user
- AI requests limited based on user tier