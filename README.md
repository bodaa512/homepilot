# 🏠 HomePilot

**Everything about your home, in one place.** HomePilot is a full-stack, Arabic-first (RTL) web app that helps you keep track of your devices, warranties, invoices, maintenance, expenses and subscriptions — and share a home with your family using role-based permissions.

> Built solo in 20 days — idea, design and code.

<!-- Add 3–4 screenshots or a short GIF here (dashboard, invoice OCR, mobile menu). Put images in docs/screenshots/ -->
<!-- ![Dashboard](docs/screenshots/dashboard.png) -->

## ✨ Features

| Area | What it does |
| --- | --- |
| **Homes, rooms & assets** | Manage one or more homes with their rooms, devices and valuables |
| **Documents + OCR** | Upload an invoice or warranty photo; the amount and date are extracted automatically (Tesseract.js, Arabic + English) |
| **Maintenance & calendar** | Maintenance tasks and appointments; a daily job flags overdue tasks |
| **Expenses & subscriptions** | Track what you spend and what renews |
| **Home memory** | A history of what has happened in your home |
| **Home Health Score** | A transparent score where every point is traceable to one of its dimensions — no black box |
| **Repair vs. replace** | Helps you decide whether a failing device is worth fixing |
| **AI assistant** | Answers questions using the context of *your* home (Claude API) |
| **Service requests** | Request a technician, receive offers, review the provider |
| **Properties** | Units and tenants for landlords / property managers |
| **Members & permissions** | Per-home roles: Owner · Admin · Member · Viewer |
| **Plans & billing** | Free / Premium / Property Pro with Stripe |
| **Achievements** | Milestones that keep you going |
| **Accounts** | Email verification, forgot/reset password, profile, change password |

## 🧰 Tech stack

- **Frontend:** Angular 22 (standalone components, signals) — no UI library, just Angular + RxJS
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB (Mongoose)
- **Auth & security:** JWT access token + HttpOnly refresh cookie, bcrypt, Zod validation, Helmet, HPP, rate limiting, per-home RBAC, audit log
- **Integrations:** Stripe, Cloudinary (optional), Nodemailer, Socket.io, Tesseract.js, Anthropic API
- **Docs & tests:** OpenAPI/Swagger (`/api/docs`), Jest + Supertest

## 📁 Project structure

```
homepilot-client/   Angular app (RTL, light/dark)
homepilot-server/   REST API (Express + TypeScript)
```

## 🚀 Getting started

**Requirements:** Node.js ≥ 22.22.3 and MongoDB (local or Atlas).

### 1. Backend

```bash
cd homepilot-server
npm install
cp .env.example .env      # then edit .env (see table below)
npm run dev               # http://localhost:5050
```

On first start the plans are seeded automatically. Interactive API docs: <http://localhost:5050/api/docs>.

### 2. Frontend

```bash
cd homepilot-client
npm install
npm start                 # http://localhost:4200
```

### Environment variables (`homepilot-server/.env`)

| Variable | Required | Notes |
| --- | :---: | --- |
| `MONGO_URI` | ✅ | e.g. `mongodb://localhost:27017/homepilot` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | ✅ | long random strings |
| `CLIENT_URL` | ✅ | `http://localhost:4200` — used for CORS and email links |
| `EMAIL_HOST/PORT/USER/PASSWORD/FROM` | ➖ | If `EMAIL_HOST` is empty, emails are **not sent**; verification/reset links are printed in the server console |
| `CLOUDINARY_*` | ➖ | If empty, uploads are stored on local disk |
| `AI_API_KEY` | ➖ | Anthropic API key for the AI assistant |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | ➖ | Needed only for paid plans |

> ⚠️ Never commit your real `.env`. It is git-ignored; use `.env.example` as the template.

## 🧪 Scripts (server)

```bash
npm test                                   # Jest + Supertest (uses mongodb-memory-server)
npm run make-admin -- you@example.com      # promote a user to platform admin
npm run set-plan -- you@example.com premium   # switch a plan locally (no Stripe needed)
npm run build && npm start                 # production build
```

The Free plan allows a single home; `premium` and `property_pro` are unlimited.

## 🔐 Roles

| Home role | Can |
| --- | --- |
| **Owner** | Everything, including editing/deleting the home and managing members |
| **Admin** | Manage assets, documents, maintenance, expenses |
| **Member** | Day-to-day entries |
| **Viewer** | Read-only |

## 🚢 Deployment

See [`homepilot-server/DEPLOYMENT.md`](homepilot-server/DEPLOYMENT.md). Before building the frontend for production, set `apiUrl` in `homepilot-client/src/environments/environment.prod.ts` to your API's domain.

## 📄 License

Add a license of your choice (e.g. MIT) in a `LICENSE` file.

## 👤 Author

**[Abdo Mosa]** — [LinkedIn](https://www.linkedin.com/in/abdo-mosa-819bb6343?utm_source=share_via&utm_content=profile&utm_medium=member_ios)
