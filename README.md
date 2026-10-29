# Personal Portfolio Backend

Express 5 + TypeScript + PostgreSQL + Prisma 7 + Zod. This is an API backend for a separate Next.js portfolio/admin dashboard.

## Requirements
- Node.js 20+
- PostgreSQL database
- npm

## 1. Install

```bash
npm install
copy .env.example .env
```

On PowerShell, `copy` is fine. Edit `.env` and set `DATABASE_URL`, `JWT_SECRET` (at least 64 characters), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `FRONTEND_ORIGIN`.

Generate a secret in PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Do not commit `.env`.

## 2. Create PostgreSQL database

Create an empty database named `portfolio_db` in PostgreSQL, or create one in your hosted PostgreSQL provider. Set the URL in `.env`, e.g.:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/portfolio_db?schema=public"
```

For hosted PostgreSQL, use the provider's connection string and required SSL options.

## 3. Migrate and generate Prisma Client

```bash
npm run db:generate
npm run db:migrate
```

When asked for a migration name, enter `init_portfolio`.

## 4. Create the first admin

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`. Use a unique password with at least 12 characters. Then run:

```bash
npm run admin:create
```

This command creates one admin and refuses to overwrite an existing account. There is deliberately no public admin-registration endpoint.

## 5. Run API

```bash
npm run dev
```

Health check: `http://localhost:4000/api/health`

## API reference

Public GET routes:
- `GET /api/profile`
- `GET /api/projects` (published projects only)
- `GET /api/skills`
- `GET /api/experience`
- `GET /api/education`
- `POST /api/contact`

Authentication:
- `POST /api/auth/login` with `{ "email": "...", "password": "..." }`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Admin-only routes (send credentials via the httpOnly cookie set by login):
- `PUT /api/profile`
- `POST /api/projects`, `PUT /api/projects/:id`, `DELETE /api/projects/:id`
- `POST /api/skills`, `PUT /api/skills/:id`, `DELETE /api/skills/:id`
- `POST /api/experience`, `PUT /api/experience/:id`, `DELETE /api/experience/:id`
- `POST /api/education`, `PUT /api/education/:id`, `DELETE /api/education/:id`
- `GET /api/contact`, `GET /api/contact?unread=true`
- `PATCH /api/contact/:id` with `{ "isRead": true }`
- `DELETE /api/contact/:id`

`GET /api/projects?all=true` includes unpublished projects. Only use this option in admin tools; in production you may wish to add a dedicated authenticated admin list route instead.

### Example project JSON

```json
{
  "title": "CivicFlow",
  "slug": "civicflow",
  "summary": "A city service and complaint management platform.",
  "description": "A role-based service workflow with payment and assignment rules.",
  "imageUrl": "https://example.com/civicflow.png",
  "liveUrl": "https://example.com",
  "githubUrl": "https://github.com/your-user/civicflow",
  "techStack": ["Next.js", "TypeScript", "Express.js", "Prisma", "PostgreSQL"],
  "featured": true,
  "published": true,
  "sortOrder": 1
}
```

## Frontend cookie requests

Since authentication uses an httpOnly cookie, fetch from Next.js browser code with:

```ts
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
  credentials: "include"
});
```

For login, use the same `credentials: "include"`. Configure `FRONTEND_ORIGIN` to exactly match the frontend origin. In production, serve both over HTTPS. `SameSite=Lax` is suitable when frontend and API share a site; if they are on different sites, cookie and CSRF configuration must be reviewed carefully.

## Deployment

1. Create a managed PostgreSQL database (for example Neon, Supabase, or another PostgreSQL provider).
2. Push this folder to a Git repository.
3. Create a Node web service on Render, Railway, Fly.io, or another Node host.
4. Set environment variables in the host dashboard: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_ORIGIN`, `PORT` if required, and admin variables only if running the one-time admin command.
5. Build command: `npm install && npm run db:generate && npm run build`
6. Pre-deploy/release command: `npm run db:deploy`
7. Start command: `npm start`
8. Run `npm run admin:create` once using a secure one-off shell/console, then remove `ADMIN_PASSWORD` from the production environment.
9. Set the frontend's `NEXT_PUBLIC_API_URL` to the deployed API base URL.
10. Test `/api/health`, login, a protected route, contact submission, and CORS from the actual frontend origin.

Do not run `prisma migrate dev` in production. Use `prisma migrate deploy`.

## Security notes before public launch
- Keep secrets out of Git and browser-exposed `NEXT_PUBLIC_*` variables.
- Use HTTPS in production and a long random `JWT_SECRET`.
- The login token expires after two hours; the admin can log in again when expired.
- The contact form has basic per-IP rate limiting. Consider CAPTCHA/Turnstile and email notifications.
- If frontend and API are on different sites, configure secure cross-site cookies and add CSRF protection; do not simply set `SameSite=None` without CSRF defenses.
- Keep dependencies updated and test all routes before public launch.
