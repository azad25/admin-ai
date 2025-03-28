# AdminAI Backend

The backend service for AdminAI, providing AI-powered system analysis, monitoring, and management capabilities.

## Features

- AI-powered system health analysis
- Real-time metrics monitoring
- Automated suggestions and recommendations
- System diagnostics and troubleshooting
- Event-driven architecture with Kafka
- Caching with Redis
- PostgreSQL database for persistent storage
- RESTful API with Swagger documentation

## Prerequisites

- Node.js (v16 or later)
- PostgreSQL
- Redis
- Kafka

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/admin-ai.git
cd admin-ai
```

2. Install dependencies:
```bash
yarn install
```

3. Create a `.env` file in the `packages/backend` directory with the following variables:
```env
# Application
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=admin_ai

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_SSL=false
KAFKA_SASL=false
KAFKA_USERNAME=
KAFKA_PASSWORD=

# AI Provider
AI_PROVIDER_TYPE=openai
AI_PROVIDER_API_KEY=your-api-key
AI_PROVIDER_MODEL=gpt-4
AI_PROVIDER_MAX_TOKENS=2000
AI_PROVIDER_TEMPERATURE=0.7
```

4. Start the development server:
```bash
cd packages/backend
yarn dev
```

The application will be available at `http://localhost:3000` and the Swagger documentation at `http://localhost:3000/api`.

## API Endpoints

### AI Analysis

- `POST /ai/analyze` - Analyze system health
- `POST /ai/suggestions` - Generate AI suggestions
- `POST /ai/actions` - Execute AI action
- `POST /ai/diagnostics` - Generate system diagnostics
- `GET /ai/suggestions` - Get active suggestions
- `GET /ai/diagnostics` - Get active diagnostics
- `PUT /ai/suggestions/:id/implement` - Mark suggestion as implemented
- `PUT /ai/diagnostics/:id/resolve` - Mark diagnostic as resolved
- `GET /ai/diagnostics/category/:category` - Get diagnostics by category

## Architecture

The backend is built using:

- NestJS - A progressive Node.js framework
- TypeORM - Object-Relational Mapping (ORM)
- Redis - In-memory data store for caching
- Kafka - Distributed event streaming platform
- PostgreSQL - Relational database
- OpenAI - AI provider for analysis and recommendations

## Development

### Running Tests

```bash
yarn test
```

### Linting

```bash
yarn lint
```

### Building

```bash
yarn build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 