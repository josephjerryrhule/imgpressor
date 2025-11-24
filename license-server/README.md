# WP ImgPressor License Server

Backend API for managing WP ImgPressor plugin licenses and subscriptions.

## Features

- ✅ License activation/deactivation
- ✅ License validation
- ✅ Usage tracking and quotas
- ✅ Multi-site activations
- ✅ Grace period handling
- ✅ Stripe integration (ready)
- ✅ Rate limiting
- ✅ PostgreSQL database

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 13
- Stripe account (for payment processing)

## Setup

### 1. Clone and Install

```bash
cd license-server
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

- Database credentials
- JWT secret
- Stripe keys
- CORS origins

### 3. Setup Database

```bash
# Create database
createdb imgpressor_licenses

# Run migrations
npm run migrate
```

### 4. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Server will start on `http://localhost:3000`

## API Endpoints

### License Management

#### Activate License

```http
POST /api/license/activate
Content-Type: application/json

{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "domain": "example.com",
  "site_name": "My WordPress Site",
  "wp_version": "6.4",
  "plugin_version": "4.0.0"
}
```

#### Validate License

```http
POST /api/license/validate
Content-Type: application/json

{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "domain": "example.com"
}
```

#### Deactivate License

```http
POST /api/license/deactivate
Content-Type: application/json

{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "domain": "example.com"
}
```

#### Track Usage

```http
POST /api/license/usage
Content-Type: application/json

{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "domain": "example.com",
  "count": 1
}
```

#### Get License Status

```http
GET /api/license/status/XXXX-XXXX-XXXX-XXXX
```

## Database Schema

See `src/database/migrate.js` for complete schema.

**Tables:**

- `licenses` - License keys and subscriptions
- `activations` - Site activations
- `usage_logs` - API usage tracking
- `api_keys` - Admin API keys
- `webhook_events` - Stripe webhook events

## Subscription Tiers

| Tier    | Price/Month | API Quota | Activations |
| ------- | ----------- | --------- | ----------- |
| Free    | $0          | 0         | 1           |
| Starter | $9          | 1,000     | 1           |
| Pro     | $29         | 10,000    | 3           |
| Agency  | $99         | Unlimited | 10          |

## Development

```bash
# Run migrations
npm run migrate

# Seed test data
npm run seed

# Run tests
npm test
```

## Deployment

### Option 1: Deploy to Heroku

```bash
heroku create imgpressor-licenses
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set NODE_ENV=production
git push heroku main
heroku run npm run migrate
```

### Option 2: Deploy to Railway

1. Connect GitHub repository
2. Add PostgreSQL service
3. Set environment variables
4. Deploy

### Option 3: VPS (DigitalOcean, AWS, etc.)

```bash
# Install dependencies
npm install --production

# Setup PM2
npm install -g pm2
pm2 start src/index.js --name license-server

# Setup Nginx reverse proxy
# Configure SSL with Let's Encrypt
```

## Security

- All requests are rate-limited
- License keys are validated
- Domain normalization prevents bypassing
- CORS protection
- Helmet security headers
- Environment variables for secrets

## Monitoring

- Health check: `GET /health`
- Logs: Use Morgan (dev) or external service (production)
- Metrics: Track in `usage_logs` table

## Support

For issues or questions, contact: joseph@yourdomain.com

## License

MIT
