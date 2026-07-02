# CafeChai POS Enterprise - Frontend

This is the React frontend repository for the **CafeChai POS Enterprise** application.

## Tech Stack
*   **Core:** React 19, TypeScript, Vite
*   **Styling:** Tailwind CSS, Framer Motion, Lucide Icons, ApexCharts
*   **State:** Zustand (client state), TanStack Query v5 (server state)
*   **Routing:** React Router v6
*   **Forms:** React Hook Form + Zod

## Getting Started

### Prerequisites
*   Node.js (>= 20.x)
*   NPM (>= 10.x)

### Environment Variables
Create a `.env` file in the root directory:
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME="CafeChai POS Enterprise"
VITE_APP_VERSION="1.0.0-beta"
```

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linting check
npm run lint

# Build production bundle
npm run build
```

## Folder Structure
Refer to [architecture_documentation.md](file:///C:/Users/micha/.gemini/antigravity-ide/brain/a877c379-451f-4405-9b89-ca8987f481c8/architecture_documentation.md) for detailed layout and coding rules.
