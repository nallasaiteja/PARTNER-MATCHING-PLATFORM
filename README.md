# Partner Matching Platform

## Project Purpose
The Partner Matching Platform is a full-stack matchmaking service connecting registered members with compatible life-partner profiles. This platform caters primarily to Telugu-speaking families across Andhra Pradesh, Telangana, and global NRI locations. It supports all castes and caters to both first and second marriages.

## Technology Stack
- **Frontend**: React.js + Vite (TypeScript)
- **Backend**: Node.js + NestJS (TypeScript)
- **Database**: PostgreSQL (with Prisma ORM)
- **Authentication**: JWT, bcrypt for password hashing
- **Security**: HTTPS/TLS 1.2+, OWASP Top 10 compliance, Admin 2FA readiness

## Folder Structure
```
/
├── frontend/           # React + Vite web application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── layouts/    # Application shells (Admin, Member, Branch, etc.)
│   │   ├── pages/      # Route pages (Landing, Dashboards)
│   │   └── services/   # API client services
│   └── ...
├── backend/            # NestJS API application
│   ├── prisma/         # Database schema
│   ├── src/
│   │   ├── auth/       # Authentication module
│   │   ├── members/    # Members module
│   │   ├── admin/      # Admin module
│   │   └── ...
│   └── ...
├── README.md
└── ARCHITECTURE.md
```

## How to Run Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## How to Run Backend
1. `cd backend`
2. `npm install`
3. `npx prisma generate`
4. `npm run start:dev`

## Environment Variables
Check the `.env.example` file in the `backend` directory and set up your PostgreSQL database connection.

### Step 5 Delivery Configuration
The auth APIs use provider webhooks and fail with `503` when the relevant webhook is not configured:

- `SMS_PROVIDER_WEBHOOK_URL` for mobile OTP delivery.
- `EMAIL_PROVIDER_WEBHOOK_URL` for email OTP and password-reset delivery.
- `NOTIFICATION_PROVIDER_WEBHOOK_TOKEN` as an optional bearer token for both delivery webhooks.
- `FRONTEND_BASE_URL` for constructing password-reset links.

The webhook receives JSON containing `channel`, `recipient`, and `type`. OTP events also include `code` and `expiresInMinutes`; password-reset events include `resetUrl` and `expiresInMinutes`. The webhook adapter must deliver the message through the configured SMS/email provider. No delivery provider is currently configured in this repository.

The Prisma schema adds auth challenge fields and the Admin-managed contact-reveal eligibility setting. Apply the schema to the database with `cd backend; npm run db:push` before using these fields. The profile-payment-date notification still needs a durable scheduler and Admin/Super Admin notification delivery; no date-triggered notification is active yet.

## Development Commands
- `npm run dev` in frontend for Vite dev server.
- `npm run start:dev` in backend for NestJS dev server.

## Production Considerations
- HTTPS is mandatory.
- Set strong JWT secrets and database passwords.
- Implement daily automated backups for the PostgreSQL database (30-day retention).
- Dockerize both frontend and backend for scalable deployment.
