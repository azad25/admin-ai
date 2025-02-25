# API Documentation

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

All API endpoints require authentication using JWT tokens.

### Headers

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

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
    "role": "admin"
  }
}
```

### System Metrics

#### GET /metrics
Get system metrics.

**Response:**
```json
{
  "cpuUsage": 45.2,
  "memoryUsage": 78.5,
  "activeUsers": 125,
  "totalRequests": 1500,
  "averageResponseTime": 250
}
```

### AI Analysis

#### POST /ai/analyze
Request AI analysis of system state.

**Request:**
```json
{
  "timeRange": "1h",
  "metrics": ["cpu", "memory", "requests"]
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