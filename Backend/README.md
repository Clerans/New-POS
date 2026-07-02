# CafeChai POS Enterprise - Backend

This is the Express.js Node backend repository for the **CafeChai POS Enterprise** application.

## Tech Stack
*   **Core:** Node.js, Express, TypeScript
*   **Database:** PostgreSQL, Prisma ORM, Redis (ioredis)
*   **Security:** Helmet, CORS, Compression, express-rate-limit, bcrypt, JWT
*   **Logger:** Winston, Morgan
*   **Realtime:** Socket.io
*   **Uploads:** Multer, Cloudinary

## Getting Started

### Prerequisites
*   Node.js (>= 20.x)
*   PostgreSQL database instance
*   Redis server instance

### Environment Setup
Create a `.env` file in the root directory:
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/db_name?schema=public"
JWT_SECRET="minimum-32-char-key-for-hmac-sha256-encryption"
JWT_REFRESH_SECRET="minimum-32-char-key-for-refresh-token-rotation"
REDIS_URL="redis://localhost:6379"
CLOUDINARY_NAME="cloudinary-name"
CLOUDINARY_KEY="cloudinary-key"
CLOUDINARY_SECRET="cloudinary-secret"
NODE_ENV="development"
CLIENT_URL="http://localhost:5173"
```

### Installation & Launch
```bash
# Install dependencies
npm install

# Run database schema migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start dev server

npm run dev

# Compile TypeScript build
npm run build
```

## Folder Structure & Architecture
The codebase uses clean architecture splits:
`Controller` -> `Service` -> `Repository` -> `Prisma DB Client`.
Refer to [architecture_documentation.md](file:///C:/Users/micha/.gemini/antigravity-ide/brain/a877c379-451f-4405-9b89-ca8987f481c8/architecture_documentation.md) for detailed rules.
