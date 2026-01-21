# Brighton Backend

Senior-care backend - Secure orchestration layer for external APIs.

## Overview

This backend acts as a secure orchestration layer between mobile applications and external senior-care APIs (Account API, Device API, Reports API). It provides:

- **Secure Authentication**: JWT-based authentication for mobile apps
- **Access Control**: Enforces caregiver ↔ senior ↔ device access rules
- **Data Normalization**: Transforms external API responses for mobile consumption
- **Audit Logging**: Comprehensive logging for compliance
- **Rate Limiting**: Protects against abuse
- **Caching**: Reduces external API calls

## Architecture

The backend follows a layered architecture:

```
Routes → Controllers → Services → External APIs
         ↓
      Models (Database)
```

## Prerequisites

- Node.js (v14+)
- PostgreSQL (v12+)
- Redis (optional, for caching)

## Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Create database and run migrations:

   ```bash
   npm run migrate
   ```

   This will automatically create the database if it doesn't exist, then run all migrations.

   Or run separately:

   ```bash
   npm run create-db    # Create database only
   npm run migrate      # Run migrations (includes create-db)
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:

- `DB_*`: Database configuration
- `JWT_SECRET_KEY`: JWT signing key
- `EXTERNAL_API_BASE_URL`: Base URL for external APIs
- `EXTERNAL_API_USERNAME`, `EXTERNAL_API_PASSWORD`: Shared credentials for all external APIs (Account, Device, Reports)
- `ENCRYPTION_KEY`: 32-byte hex key for token encryption
- `REDIS_URL`: Redis connection URL (optional)

## API Endpoints

All endpoints follow RESTful conventions.

### Authentication

- `POST /auth/signup` - User registration
  - Required fields: `name`, `email`, `password`, `user_type`, `privacy_accepted`, `terms_accepted`
  - Optional fields: `mobile`, `address`, `gender`, `fcm_token`, `platform`
  - `user_type` must be one of: `ADMIN`, `SUPER_ADMIN`, `caregiver`, `senior`
  - Returns: JWT token, refresh token, and user data
- `POST /auth/login` - User authentication

### Devices

- `POST /devices` - Register a new device

  ```json
  {
    "device_imei": "861475032341820",
    "sim_iccid": "89010303300042917022",
    "device_type": 95,
    "sim_action": "none"
  }
  ```

- `GET /devices` - List all accessible devices (with pagination)
  - Query params: `page`, `limit`

- `GET /devices/:id_type/:id` - Get specific device by ID
  - `id_type`: `imei`, `serial`, or `uuid`
  - Example: `GET /devices/imei/861475032341820`

- `GET /devices/:id_type/:id/fall-detection` - Get fall detection status
  - Example: `GET /devices/imei/861475032341820/fall-detection`

- `PUT /devices/:id_type/:id/fall-detection` - Enable/disable fall detection
  ```json
  {
    "enabled": true
  }
  ```

### Vitals

- `GET /vitals/recent?senior_id=123` - Get recent vitals for a senior
  - Query params: `senior_id` (required)

### Health

- `GET /health` - Health check endpoint

## Database Schema

See `SENIOR_CARE_BACKEND_ARCHITECTURE.md` for detailed schema documentation.

Key tables:

- `users` - User accounts
- `external_device_references` - External device metadata
- `user_device_mapping` - User ↔ Device mappings
- `senior_caregiver_mapping` - Senior ↔ Caregiver relationships
- `external_api_tokens` - Encrypted OAuth2 tokens
- `audit_logs` - Audit trail

## Development

```bash
# Run in development mode
npm run dev

# Run migrations
npm run migrate

# Run tests
npm test
```

## Production

```bash
# Start server
npm start

# Run migrations
npm run migrate
```

## Security

- JWT tokens for authentication
- Encrypted storage of external API tokens
- Rate limiting on all endpoints
- Audit logging for compliance
- Input validation and sanitization

## License

ISC
