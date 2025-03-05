# Architecture Overview

## System Architecture

AdminAI follows a modern microservices architecture with three main packages:

```
packages/
├── frontend/    # React-based UI
├── backend/     # Node.js API server
└── shared/      # Shared types and utilities
```

### Frontend Architecture

The frontend is built with React and TypeScript, utilizing:

- **Vite** for fast development and optimized builds
- **React Router** for client-side routing
- **Material-UI** for consistent UI components
- **Socket.IO Client** for real-time WebSocket communication
- **Redux** for state management with Redux Toolkit
- **React Context** for component-level state management
- **TypeScript** for type safety and better developer experience
- **Custom Hooks** for reusable logic

#### Frontend Structure

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── AIAssistant/      # AI assistant components
│   │   ├── widgets/          # Dashboard widgets
│   │   └── ...
│   ├── contexts/             # React context providers
│   │   ├── AIMessagesContext.tsx
│   │   ├── AuthContext.tsx
│   │   ├── SocketContext.tsx
│   │   └── ...
│   ├── hooks/                # Custom React hooks
│   │   ├── useAIServices.ts
│   │   ├── useAuth.ts
│   │   └── ...
│   ├── pages/                # Page components
│   │   ├── Dashboard.tsx
│   │   ├── AISettings.tsx
│   │   ├── Login.tsx
│   │   └── ...
│   ├── providers/            # Provider components
│   │   ├── ThemeProvider.tsx
│   │   └── ...
│   ├── services/             # API service clients
│   │   ├── ai.service.ts
│   │   ├── auth.service.ts
│   │   ├── websocket.service.ts
│   │   └── ...
│   ├── store/                # Redux store
│   │   ├── slices/
│   │   │   ├── aiSlice.ts
│   │   │   └── ...
│   │   ├── hooks.ts
│   │   └── index.ts
│   ├── types/                # TypeScript type definitions
│   │   ├── ai.ts
│   │   ├── websocket.ts
│   │   └── ...
│   ├── utils/                # Utility functions
│   │   ├── logger.ts
│   │   └── ...
│   ├── App.tsx               # Main application component
│   ├── main.tsx              # Application entry point
│   └── theme.ts              # Theme configuration
```

### Backend Architecture

The backend uses a modular architecture with:

- **Express.js** for HTTP API
- **Socket.IO** for WebSocket communication
- **TypeORM** for database operations with PostgreSQL
- **Redis** for caching and session management
- **Kafka** for event streaming (optional)
- **Bull** for job queues and background processing

#### Backend Structure

```
backend/
├── src/
│   ├── controllers/          # Request handlers
│   │   ├── ai.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── metrics.controller.ts
│   │   └── ...
│   ├── core/                 # Core application logic
│   │   └── AdminAI.ts        # Main application class
│   ├── database/             # Database configuration
│   │   ├── entities/         # TypeORM entities
│   │   │   ├── User.ts
│   │   │   ├── ApiKey.ts
│   │   │   └── ...
│   │   ├── migrations/       # Database migrations
│   │   └── index.ts          # Database connection setup
│   ├── engine/               # Core engine components
│   │   ├── AppEngine.ts      # Application engine
│   │   ├── ErrorMonitor.ts   # Error monitoring
│   │   └── HealthCheck.ts    # Health checking
│   ├── middleware/           # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── cache.middleware.ts
│   │   ├── rate-limiter.middleware.ts
│   │   └── ...
│   ├── routes/               # API route definitions
│   │   ├── ai.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── metrics.routes.ts
│   │   └── ...
│   ├── services/             # Business logic services
│   │   ├── ai.service.ts
│   │   ├── aiSettings.service.ts
│   │   ├── websocket.service.ts
│   │   └── ...
│   ├── types/                # TypeScript type definitions
│   │   ├── metrics.ts
│   │   ├── websocket.ts
│   │   └── ...
│   ├── utils/                # Utility functions
│   │   ├── logger.ts
│   │   ├── encryption.ts
│   │   └── ...
│   ├── workers/              # Background workers
│   │   ├── aiWorker.ts
│   │   └── tableWorker.ts
│   ├── app.ts                # Express application setup
│   └── index.ts              # Application entry point
```

### Shared Package

The shared package contains common types, utilities, and constants used by both frontend and backend:

```
shared/
├── src/
│   ├── types/                # Shared TypeScript types
│   │   ├── ai.ts
│   │   ├── logs.ts
│   │   ├── metrics.ts
│   │   ├── websocket.ts
│   │   └── ...
│   └── index.ts              # Package entry point
```

## Communication Architecture

### REST API

The system uses a RESTful API for most operations:

1. Client sends HTTP request to server
2. Server processes request through middleware pipeline
3. Controller handles request and calls appropriate services
4. Services perform business logic and database operations
5. Response is sent back to client

### WebSocket Communication

Real-time communication is handled through WebSocket using Socket.IO:

1. Client establishes WebSocket connection with authentication token
2. Server validates token and registers client in connection pool
3. Server emits events to client for real-time updates
4. Client emits events to server for real-time actions
5. Connection is maintained with automatic reconnection

#### WebSocket Service Architecture

The WebSocket service follows a singleton pattern:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  HTTP Server    │────▶│  WebSocket      │◀───▶│  Client         │
│                 │     │  Server         │     │  Connections    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │  ▲                     ▲
                               │  │                     │
                               ▼  │                     │
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Controllers    │────▶│  WebSocket      │────▶│  Event          │
│                 │     │  Service        │     │  Handlers       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │  ▲
                               │  │
                               ▼  │
                        ┌─────────────────┐
                        │                 │
                        │  Message        │
                        │  Queue          │
                        │                 │
                        └─────────────────┘
```

### AI Integration Architecture

The system integrates with multiple AI providers:

1. Client sends message or command to server
2. Server routes request to AI service
3. AI service selects appropriate provider based on settings
4. Provider client sends request to external AI API
5. Response is processed and returned to client
6. Real-time updates are sent via WebSocket

## Data Flow

### Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │     │             │
│ Client  │────▶│ Auth        │────▶│ Auth        │────▶│ Database    │
│         │     │ Controller  │     │ Service     │     │             │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
    ▲                                      │
    │                                      │
    │                                      ▼
    │                               ┌─────────────┐
    │                               │             │
    └───────────────────────────────│ JWT Token   │
                                    │ Generation  │
                                    └─────────────┘
```

### WebSocket Message Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │     │             │
│ Client  │────▶│ WebSocket   │────▶│ AI          │────▶│ AI Provider │
│         │     │ Server      │     │ Service     │     │ API         │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
    ▲                 │                    │
    │                 │                    │
    │                 ▼                    ▼
    │          ┌─────────────┐     ┌─────────────┐
    │          │             │     │             │
    │          │ Message     │     │ Database    │
    │          │ Queue       │     │ Storage     │
    │          └─────────────┘     └─────────────┘
    │                 │
    │                 │
    └─────────────────┘
```

### Metrics Collection Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│ System      │────▶│ Monitoring  │────▶│ Database    │
│ Events      │     │ Service     │     │ Storage     │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          │
                          ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │
│ Client  │◀────│ WebSocket   │◀────│ Real-time   │
│         │     │ Server      │     │ Updates     │
└─────────┘     └─────────────┘     └─────────────┘
```

## Security Architecture

### Authentication and Authorization

- **JWT-based authentication** with secure token handling
- **Role-based access control** (ADMIN, USER roles)
- **API key authentication** for programmatic access
- **Token refresh** mechanism for extended sessions
- **Secure password storage** with bcrypt hashing

### Data Protection

- **Encryption** for sensitive data using AES-256
- **Input validation** with schema validation
- **SQL injection prevention** with parameterized queries
- **XSS protection** with content sanitization
- **CSRF protection** with token validation

### Network Security

- **CORS configuration** for controlled cross-origin access
- **Rate limiting** to prevent abuse
- **Secure WebSocket connections** with authentication
- **HTTPS** for encrypted communication
- **IP-based restrictions** for sensitive operations

## Monitoring and Logging

### System Metrics Collection

- **CPU and memory usage** monitoring
- **Request metrics** tracking
- **Database performance** monitoring
- **Error rate** tracking
- **User activity** monitoring

### Logging System

- **Structured logging** with contextual information
- **Log levels** (info, warn, error, debug)
- **Request logging** for API calls
- **Error logging** with stack traces
- **Authentication logging** for security events

### Real-time Monitoring

- **WebSocket-based real-time updates** for dashboards
- **Alert notifications** for critical events
- **Performance insights** with trend analysis
- **Security insights** with threat detection
- **Usage insights** with user behavior analysis

## Deployment Architecture

The system can be deployed using:

- **Docker containers** for consistent environments
- **Kubernetes orchestration** for scalability
- **Cloud provider services** (AWS, GCP, Azure)
- **Load balancers** for high availability
- **CDN** for static assets delivery

### Deployment Options

#### Development Environment

```
┌─────────────────────────────────────────┐
│                                         │
│  Local Development Machine               │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │         │  │         │  │         │  │
│  │ Frontend│  │ Backend │  │ Database│  │
│  │         │  │         │  │         │  │
│  └─────────┘  └─────────┘  └─────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

#### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Cloud Provider (AWS/GCP/Azure)                             │
│                                                             │
│  ┌─────────┐   ┌─────────────────────┐   ┌───────────────┐  │
│  │         │   │                     │   │               │  │
│  │   CDN   │   │  Load Balancer      │   │  Database     │  │
│  │         │   │                     │   │  Cluster      │  │
│  └─────────┘   └─────────────────────┘   └───────────────┘  │
│       │                   │                      │          │
│       ▼                   ▼                      │          │
│  ┌─────────┐   ┌─────────────────────┐           │          │
│  │         │   │                     │           │          │
│  │ Static  │   │  Kubernetes Cluster │           │          │
│  │ Assets  │   │                     │           │          │
│  └─────────┘   │  ┌─────┐  ┌─────┐   │           │          │
│                │  │     │  │     │   │           │          │
│                │  │ API │  │ API │◀──┼───────────┘          │
│                │  │     │  │     │   │                      │
│                │  └─────┘  └─────┘   │                      │
│                │                     │                      │
│                └─────────────────────┘                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Development Workflow

1. **Local Development Environment**
   - Frontend development with Vite dev server
   - Backend development with nodemon for auto-restart
   - Local database with Docker

2. **Testing Environment**
   - Automated tests with Jest
   - Integration tests with Supertest
   - End-to-end tests with Cypress

3. **Staging Environment**
   - Deployed to cloud provider
   - Mirrors production configuration
   - Used for final testing before release

4. **Production Environment**
   - Deployed to cloud provider
   - High availability configuration
   - Monitoring and alerting enabled

Each environment is isolated and configured separately with appropriate security measures and access controls. 