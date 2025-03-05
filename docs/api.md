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
Get system health status.

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
Generate database schema.

#### POST /ai/crud/generate
Generate CRUD configuration.

#### POST /ai/dashboard/suggest
Get AI suggestions for dashboard widgets.

#### POST /ai/provider/verify
Verify AI provider configuration.

#### POST /ai/message
Send message to AI system.

#### POST /ai/command
Execute AI command.

#### GET /ai/status
Get AI system status.

#### GET /ai/settings
Get AI system settings.

#### PUT /ai/settings
Update AI system settings.

### WebSocket Events

Connect to WebSocket at `ws://localhost:3000/ws`

#### Event Types

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

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per user
- WebSocket connections limited to 1 per user