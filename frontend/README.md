<div align="center">

# 🧠 AI-Powered Feedback Management System

**An event-driven, full-stack application that uses Google Gemini AI to automatically categorize, prioritize, and route user feedback to engineering teams.**

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_2.0_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

[Features](#-features) •
[Architecture](#-system-architecture) •
[Tech Stack](#-tech-stack--engineering-decisions) •
[Getting Started](#-getting-started) •
[API Reference](#-api-reference) •
[Deployment](#-deployment) •
[Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Tech Stack & Engineering Decisions](#-tech-stack--engineering-decisions)
- [Project Structure](#-project-structure)
- [File-by-File Breakdown](#-file-by-file-breakdown)
- [Data Model](#-data-model)
- [Complete Workflow](#-complete-workflow-start-to-end)
- [AI Classification Pipeline](#-ai-classification-pipeline)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Environment Variables](#-environment-variables)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

- 🤖 **AI Auto-Classification** — Uses LangChain + Gemini 2.0 Flash to extract Category, Priority, Sentiment, and responsible Team from raw text
- ⚡ **Event-Driven Architecture** — Offloads slow AI processing to a background worker using BullMQ & Redis, keeping API responses under 50ms
- 🛡️ **Enterprise Security** — Input validation (Zod), HTTP hardening (Helmet), rate limiting, and CORS protection
- 🔄 **Real-Time UI Updates** — React Query polls the backend every 5 seconds so the UI updates the moment AI finishes processing
- 📉 **Graceful Degradation** — If the LLM API fails after 3 retries, the system falls back to a keyword-matching algorithm
- 📊 **Dashboard Analytics** — MongoDB aggregation pipelines generate instant metrics on categories, priorities, and statuses
- 🔍 **Full-Text Search** — MongoDB text indexes with weighted scoring for fast feedback search
- 📧 **Smart Notifications** — Emails are sent only for `critical` and `high` priority feedback, routed to the correct team
- 🎨 **Dark Mode UI** — Beautiful, responsive dashboard built with CSS Variables and modern design tokens

---

## 🏗️ System Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│                    React SPA + React Query                   │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ POST /api/feedback
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     API GATEWAY LAYER                        │
│                                                              │
│  ┌─────────┐  ┌──────────┐  ┌──────┐  ┌──────────────────┐ │
│  │  CORS   │→ │Rate Limit│→ │Helmet│→ │ Zod Validation   │ │
│  └─────────┘  └──────────┘  └──────┘  └──────────────────┘ │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                   FEEDBACK SERVICE                           │
│                                                              │
│  1. Save raw feedback to MongoDB    ──▶  Response: 201      │
│     (category: null, aiProcessed: false)   (~30ms)          │
│                                                              │
│  2. Push job to Redis Queue                                  │
│     { feedbackId, message }                                  │
└──────────────────────────┬───────────────────────────────────┘
                           │
               ════════════════════════
               ║  ASYNC BOUNDARY     ║
               ════════════════════════
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  AI WORKER (Background)                      │
│                                                              │
│  1. Consume job from Redis Queue                             │
│  2. Build prompt with training examples                      │
│  3. Send to Gemini 2.0 Flash via LangChain                  │
│  4. Clean markdown from response                            │
│  5. Validate JSON with Zod schema                           │
│  6. Update MongoDB (category, priority, team, sentiment)    │
│  7. Send email notification if priority is critical/high    │
│                                                              │
│  On failure: Retry 3x with exponential backoff              │
│  Final failure: Use keyword-matching fallback               │
└──────────────────────────────────────────────────────────────┘

Why Not Process AI During the Request?
Problem: Gemini API takes 1-3 seconds to respond. If the API waits for AI, the user's browser hangs for 3+ seconds.

Solution: Save feedback instantly, push AI work to a background queue, respond in 30ms. The background worker processes AI independently.

Pattern: This is called Event-Driven Architecture and is the standard approach at companies like Netflix, Uber, and Stripe.

🛠️ Tech Stack & Engineering Decisions
Backend
Technology	Role	Why We Chose It
Node.js	Runtime	Non-blocking I/O handles thousands of concurrent connections efficiently
Express	HTTP Server	Minimal, flexible, and the industry standard for Node.js APIs
MongoDB	Database	Schema-flexible. Allows saving records with null AI fields first, then updating later
Mongoose	ODM	Provides schema validation, indexes, and clean query APIs on top of MongoDB
Redis	Message Broker	In-memory data store. BullMQ uses it to manage the job queue
BullMQ	Job Queue	Production-grade queue with retry logic, concurrency control, and rate limiting
LangChain	AI Framework	Provides structured tools for prompt engineering and LLM integration
Gemini 2.0 Flash	LLM	Fast, free-tier available, and excellent at structured JSON output
Zod	Validation	Runtime type checking. Validates both user input AND AI output
Pino	Logging	Fastest Node.js logger. Produces structured JSON logs for production
Helmet	Security	Sets 15+ HTTP security headers automatically
Nodemailer	Email	Sends notification emails to engineering teams
Frontend
Technology	Role	Why We Chose It
React 18	UI Library	Component-based architecture, massive ecosystem
Vite	Build Tool	10x faster than Webpack. Instant HMR in development
TypeScript	Language	Catches bugs at compile time. Self-documenting code
TanStack Query v5	Server State	Automatic caching, background refetching, loading/error states
CSS Variables	Styling	Design tokens for consistent theming. No external CSS library needed


📂 Project Structure

feedback-system/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts          # MongoDB connection + pooling
│   │   │   ├── redis.ts             # Redis client configuration
│   │   │   ├── queue.ts             # BullMQ queue setup
│   │   │   └── logger.ts            # Pino logger configuration
│   │   │
│   │   ├── models/
│   │   │   └── feedback.model.ts    # Mongoose schema + indexes
│   │   │
│   │   ├── routes/
│   │   │   └── feedback.routes.ts   # Express route definitions
│   │   │
│   │   ├── controllers/
│   │   │   └── feedback.controller.ts  # Request/Response handlers
│   │   │
│   │   ├── services/
│   │   │   ├── feedback.service.ts  # Database operations
│   │   │   ├── ai.service.ts        # Gemini AI integration
│   │   │   └── notification.service.ts  # Email notifications
│   │   │
│   │   ├── workers/
│   │   │   └── ai.worker.ts         # Background AI processor
│   │   │
│   │   ├── middleware/
│   │   │   ├── validator.ts         # Zod validation schemas
│   │   │   ├── rateLimiter.ts       # Rate limiting config
│   │   │   └── errorHandler.ts      # Global error handler
│   │   │
│   │   ├── types/
│   │   │   └── feedback.types.ts    # TypeScript interfaces
│   │   │
│   │   ├── scripts/
│   │   │   ├── test-ai.ts           # AI diagnostic script
│   │   │   ├── find-model.ts        # Find available Gemini model
│   │   │   └── fix-data.ts          # Database cleanup script
│   │   │
│   │   ├── app.ts                   # Express app setup
│   │   └── server.ts                # Entry point
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FeedbackCard.tsx     # Single feedback item
│   │   │   ├── FeedbackList.tsx     # List with pagination
│   │   │   ├── CreateFeedbackModal.tsx  # Submission form
│   │   │   └── SearchBar.tsx        # Filters and search
│   │   │
│   │   ├── pages/
│   │   │   └── Dashboard.tsx        # Main dashboard page
│   │   │
│   │   ├── services/
│   │   │   └── feedback.api.ts      # API client (fetch calls)
│   │   │
│   │   ├── hooks/
│   │   │   └── useFeedback.ts       # React Query hooks
│   │   │
│   │   ├── types/
│   │   │   └── index.ts             # Frontend TypeScript types
│   │   │
│   │   ├── App.tsx                  # Root component
│   │   ├── App.css                  # Component styles
│   │   ├── index.css                # Global styles + variables
│   │   └── main.tsx                 # React entry point
│   │
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── .env
│
├── docker-compose.yml               # MongoDB + Redis containers
└── README.md                        # This file
📖 File-by-File Breakdown
<details> <summary><strong>🔵 Backend — Config Layer</strong></summary>
File	Purpose
config/database.ts	Connects to MongoDB with connection pooling (min 2, max 10 connections). Handles graceful shutdown on SIGINT.
config/redis.ts	Creates an ioredis client with exponential backoff retry strategy. Exports connection for BullMQ.
config/queue.ts	Creates the BullMQ Queue instance with retry settings (3 attempts, exponential backoff).
config/logger.ts	Configures Pino logger. Pretty-prints in development, outputs structured JSON in production.
</details><details> <summary><strong>🟢 Backend — Models</strong></summary>
File	Purpose
models/feedback.model.ts	Mongoose schema with 9 database indexes for fast querying. Includes a toJSON transform that converts _id to id. Defines all enum values for category, priority, sentiment, team, and status.
Database Indexes:

text

category: 1                          → Filter by category
priority: 1                          → Filter by priority  
team: 1                              → Filter by team
status: 1                            → Filter by status
createdAt: -1                        → Sort newest first
{ category, priority, createdAt }    → Dashboard compound query
{ team, status, createdAt }          → Team routing query
{ message: "text", summary: "text" } → Full-text search
{ aiProcessed: 1, createdAt: 1 }     → Find unprocessed items
</details><details> <summary><strong>🟡 Backend — Services (Business Logic)</strong></summary>
File	Purpose
services/feedback.service.ts	All database operations: create, search (with filters, pagination, text search), updateStatus, and getStats (aggregation pipeline). On create, it saves to DB and pushes a job to the BullMQ queue.
services/ai.service.ts	The AI brain. Builds the prompt with 10 few-shot training examples, calls Gemini 2.0 Flash, strips markdown code blocks from the response, parses JSON, validates with Zod, and applies business rules. Includes a two-pass verification system for low-confidence results. Falls back to keyword matching if AI fails.
services/notification.service.ts	Sends HTML emails via Nodemailer. Only triggers for critical and high priority feedback. Routes emails to team-specific addresses.
</details><details> <summary><strong>🔴 Backend — Workers</strong></summary>
File	Purpose
workers/ai.worker.ts	Runs 24/7 in the background. Listens to the Redis queue. When a new feedback job arrives, it calls ai.service.ts, updates MongoDB with the AI results, and triggers notifications. Handles errors with 3 retries and exponential backoff. Falls back to keyword analysis on final failure.
</details><details> <summary><strong>🟣 Backend — Middleware</strong></summary>
File	Purpose
middleware/validator.ts	Zod schemas for createFeedback, searchParams, and updateStatus. A generic validate() function that can validate either req.body or req.query.
middleware/rateLimiter.ts	Two rate limiters: General (100 req/15min) and Create Feedback (5 req/min) to prevent spam.
middleware/errorHandler.ts	Global error handler. Known errors (AppError) return clean JSON. Unknown errors log the full stack trace and return a generic 500.
</details><details> <summary><strong>🟤 Frontend — Components</strong></summary>
File	Purpose
components/FeedbackCard.tsx	Renders a single feedback item. Shows "AI analyzing..." spinner when aiProcessed is false, and colored tags when true. Includes a status dropdown that triggers PATCH on change.
components/FeedbackList.tsx	Maps over the feedback array and renders FeedbackCard for each. Includes pagination controls and empty/loading states.
components/CreateFeedbackModal.tsx	Modal form with name, email, and message fields. On submit, calls the useCreateFeedback mutation.
components/SearchBar.tsx	Text search input and filter dropdowns for category, priority, sentiment, and status. Changes trigger React Query to refetch.
</details><details> <summary><strong>⚫ Frontend — Hooks & Services</strong></summary>
File	Purpose
hooks/useFeedback.ts	Four React Query hooks: useFeedbackList (polls every 5s), useFeedbackStats (polls every 10s), useCreateFeedback (mutation), useUpdateStatus (mutation with cache invalidation).
services/feedback.api.ts	Raw fetch() wrapper. The only file that makes network calls. All other files use hooks that call this.
</details>
🗄️ Data Model
Feedback Document (MongoDB)
TypeScript

{
  // User-provided fields (saved immediately)
  _id:            ObjectId,
  userName:       string,
  email:          string,
  message:        string,

  // AI-populated fields (null until processed)
  category:       "payment" | "ui_bug" | "feature_request" | "performance" | "security" | "onboarding" | "other" | null,
  priority:       "critical" | "high" | "medium" | "low" | null,
  sentiment:      "positive" | "negative" | "neutral" | null,
  team:           "payments" | "frontend" | "product" | "infrastructure" | "security" | "growth" | "general" | null,
  confidence:     number (0.0 - 1.0) | null,
  summary:        string | null,

  // Processing state
  status:         "open" | "in_progress" | "resolved",
  aiProcessed:    boolean,
  aiProcessedAt:  Date | null,
  aiError:        string | null,

  // Timestamps (auto-generated)
  createdAt:      Date,
  updatedAt:      Date,
}
Document Lifecycle
text

STATE 1: UNPROCESSED (saved by API)
┌──────────────────────────────────┐
│ userName: "John"                 │
│ message: "Payment failed"        │
│ category: null                   │
│ priority: null                   │
│ aiProcessed: false               │
└──────────────────────────────────┘
              │
              │  (AI Worker processes)
              ▼
STATE 2: PROCESSED (updated by Worker)
┌──────────────────────────────────┐
│ userName: "John"                 │
│ message: "Payment failed"        │
│ category: "payment"              │
│ priority: "critical"             │
│ sentiment: "negative"            │
│ team: "payments"                 │
│ confidence: 0.95                 │
│ summary: "Payment failure..."    │
│ aiProcessed: true                │
└──────────────────────────────────┘
🔄 Complete Workflow (Start to End)
Follow a single piece of feedback through the entire system:

User submits: "I was charged twice for my subscription. Please refund."

Phase 1: Frontend (Browser)
text

Step 1 → User clicks "Submit" in CreateFeedbackModal.tsx
Step 2 → useCreateFeedback() mutation fires
Step 3 → feedback.api.ts sends POST /api/feedback to the server
Phase 2: API Gateway (Server)
text

Step 4  → Express receives the request
Step 5  → rateLimiter checks: Is this user spamming? → No, proceed
Step 6  → validator.ts (Zod) checks: Is email valid? Message > 10 chars? → Yes, proceed
Step 7  → feedback.controller.ts receives the clean data
Step 8  → Passes it to feedback.service.ts
Phase 3: Fast Storage & Queue
text

Step 9  → feedback.service.ts saves to MongoDB:
          { message: "I was charged twice...", category: null, aiProcessed: false }
Step 10 → feedback.service.ts pushes job to Redis Queue:
          { feedbackId: "abc123", message: "I was charged twice..." }
Step 11 → Controller responds: 201 Created (Total time: ~30ms)
Step 12 → User sees "Feedback submitted!" and modal closes
Phase 4: Background AI Processing
text

Step 13 → ai.worker.ts (running 24/7) detects new job in Redis
Step 14 → Sends message to ai.service.ts
Step 15 → ai.service.ts builds prompt with 10 training examples
Step 16 → Calls Gemini 2.0 Flash API via LangChain (~1-2 seconds)
Step 17 → Gemini returns: {"category":"payment","priority":"critical",...}
Step 18 → ai.service.ts strips markdown, parses JSON, validates with Zod
Step 19 → Business rules applied: "charged twice" → force critical priority
Step 20 → Worker updates MongoDB: { category: "payment", aiProcessed: true }
Step 21 → Priority is "critical" → notification.service.ts sends email to payments team
Phase 5: UI Auto-Update
text

Step 22 → React Query (in useFeedbackList) polls GET /api/feedback every 5 seconds
Step 23 → On next poll, data now has aiProcessed: true
Step 24 → FeedbackCard.tsx switches from "AI analyzing..." spinner to showing:
          🔴 critical | payment | 😤 negative | → payments | 95% confident
🤖 AI Classification Pipeline
text

User Message
      │
      ▼
┌─────────────────────────────────────────────┐
│           PASS 1: Classification             │
│                                              │
│  Prompt includes:                            │
│  • System role (senior AI analyst)           │
│  • 7 category definitions with keywords      │
│  • 4 priority levels with triggers           │
│  • 7 team routing rules                      │
│  • 10 few-shot training examples             │
│  • Chain-of-thought reasoning instructions   │
│  • Strict "JSON only" output format          │
│                                              │
│  Model: Gemini 2.0 Flash                     │
│  Temperature: 0.1 (very consistent)          │
└────────────────────┬────────────────────────┘
                     │
                     ▼
              Confidence >= 0.80?
              ┌──────┴──────┐
              │             │
             YES           NO
              │             │
              │             ▼
              │   ┌───────────────────────────┐
              │   │  PASS 2: Verification      │
              │   │                            │
              │   │  Different temperature     │
              │   │  Reviews first result      │
              │   │  Corrects if needed        │
              │   └──────────┬────────────────┘
              │              │
              │              ▼
              │   ┌───────────────────────────┐
              │   │     MERGE RESULTS          │
              │   │                            │
              │   │  Both agree → boost conf.  │
              │   │  Disagree → pick higher    │
              │   └──────────┬────────────────┘
              │              │
              ▼              ▼
        ┌───────────────────────────────────┐
        │      BUSINESS RULES ENGINE        │
        │                                    │
        │  • "breach/hack" → critical        │
        │  • "charged twice" → critical      │
        │  • "site is down" → critical       │
        │  • Team-category alignment         │
        │  • Positive + critical → fix       │
        └──────────────┬────────────────────┘
                       │
                       ▼
                 FINAL RESULT
        { category, priority, sentiment,
          team, confidence, summary }
Fallback System
If Gemini fails after 3 retries:

text

┌─────────────────────────────────────────────┐
│         KEYWORD-MATCHING FALLBACK            │
│                                              │
│  Scores each category using regex patterns   │
│  payment words: pay, bill, charge, refund    │
│  ui_bug words: bug, broken, glitch, button   │
│  etc.                                        │
│                                              │
│  Picks highest-scoring category              │
│  Confidence: 0.20 - 0.45 (marked as low)    │
│  UI shows "⚡ Auto-classified" badge         │
└─────────────────────────────────────────────┘
🚀 Getting Started
Prerequisites
Node.js v18+
Docker Desktop (for MongoDB & Redis)
Gemini API Key (free)
Quick Start
Bash

# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/feedback-system.git
cd feedback-system

# 2. Start MongoDB and Redis
docker-compose up -d

# 3. Setup and start Backend
cd backend
npm install
cp .env.example .env          # Then edit .env with your real API key
npm run dev

# 4. Setup and start Frontend (new terminal)
cd frontend
npm install
npm run dev

# 5. Open browser
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000/health
Verify AI Works
Bash

cd backend
npx tsx src/scripts/test-ai.ts
You should see:

text

✅ Gemini responded!
✅ Classification works!
📡 API Reference
Create Feedback
http

POST /api/feedback
Content-Type: application/json
Request Body:

JSON

{
  "userName": "John Doe",
  "email": "john@example.com",
  "message": "I was charged twice for my subscription. Please refund."
}
Response (201 Created):

JSON

{
  "success": true,
  "message": "Feedback submitted successfully. AI analysis in progress.",
  "data": {
    "id": "6650a1b2c3d4e5f6a7b8c9d0",
    "userName": "John Doe",
    "email": "john@example.com",
    "message": "I was charged twice for my subscription. Please refund.",
    "category": null,
    "priority": null,
    "sentiment": null,
    "team": null,
    "aiProcessed": false,
    "status": "open",
    "createdAt": "2026-03-06T10:30:00.000Z"
  }
}
Search Feedback
http

GET /api/feedback?category=payment&priority=high&page=1&limit=20
Query Parameters:

Parameter	Type	Values
category	string	payment, ui_bug, feature_request, performance, security, onboarding, other
priority	string	critical, high, medium, low
sentiment	string	positive, negative, neutral
team	string	payments, frontend, product, infrastructure, security, growth, general
status	string	open, in_progress, resolved
search	string	Free text search
page	number	Page number (default: 1)
limit	number	Items per page (default: 20, max: 100)
sortBy	string	createdAt, priority
sortOrder	string	asc, desc
Response (200 OK):

JSON

{
  "success": true,
  "data": [
    {
      "id": "6650a1b2c3d4e5f6a7b8c9d0",
      "userName": "John Doe",
      "message": "I was charged twice...",
      "category": "payment",
      "priority": "critical",
      "sentiment": "negative",
      "team": "payments",
      "confidence": 0.95,
      "summary": "Double charged for subscription, requesting refund",
      "status": "open",
      "aiProcessed": true,
      "createdAt": "2026-03-06T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
Get Dashboard Stats
http

GET /api/feedback/stats
Response (200 OK):

JSON

{
  "success": true,
  "data": {
    "total": 150,
    "unprocessed": 3,
    "byCategory": {
      "payment": 45,
      "ui_bug": 30,
      "performance": 25,
      "feature_request": 20,
      "security": 15,
      "onboarding": 10,
      "other": 5
    },
    "byPriority": {
      "critical": 10,
      "high": 35,
      "medium": 70,
      "low": 35
    },
    "bySentiment": {
      "negative": 80,
      "neutral": 50,
      "positive": 20
    },
    "byStatus": {
      "open": 90,
      "in_progress": 40,
      "resolved": 20
    }
  }
}
Update Status
http

PATCH /api/feedback/:id/status
Content-Type: application/json
Request Body:

JSON

{
  "status": "resolved"
}
Response (200 OK):

JSON

{
  "success": true,
  "data": {
    "id": "6650a1b2c3d4e5f6a7b8c9d0",
    "status": "resolved"
  }
}
☁️ Deployment
Architecture
Component	Platform	Why
Frontend	Vercel	Serverless, ultra-fast CDN, perfect for React/Vite
Backend (API + Worker)	Render.com	Persistent Node.js process keeps BullMQ worker alive 24/7
Database	MongoDB Atlas	Free M0 cluster, automatic backups
Message Queue	Upstash	Serverless Redis, free tier available
⚠️ Why not deploy Backend on Vercel?
Vercel runs serverless functions that "go to sleep" between requests. BullMQ needs a process that stays alive continuously to listen for queue events. Render.com provides this persistent runtime.

Step-by-Step
<details> <summary><strong>1. Setup MongoDB Atlas (Free)</strong></summary>
Go to mongodb.com/atlas
Create free M0 cluster
Create database user + password
Network Access → Allow 0.0.0.0/0
Click Connect → Drivers → Copy the URI
</details><details> <summary><strong>2. Setup Upstash Redis (Free)</strong></summary>
Go to upstash.com
Create Redis database
Copy the REDIS_URL from the Node.js section
</details><details> <summary><strong>3. Deploy Backend to Render.com</strong></summary>
Go to render.com
New → Web Service → Connect GitHub repo
Settings:
Root Directory: backend
Build Command: npm install && npm run build
Start Command: npm start
Add environment variables (see table below)
Deploy
</details><details> <summary><strong>4. Deploy Frontend to Vercel</strong></summary>
Go to vercel.com
Import GitHub repo
Settings:
Framework: Vite
Root Directory: frontend
Add environment variable:
VITE_API_URL = https://your-render-url.onrender.com/api
Deploy
</details>
🔐 Environment Variables
Backend (backend/.env)
Variable	Description	Example
NODE_ENV	Environment mode	development or production
PORT	Server port	3000
MONGODB_URI	MongoDB connection string	mongodb+srv://user:pass@cluster.mongodb.net/feedback
REDIS_URL	Redis connection string	redis://localhost:6379
GOOGLE_AI_API_KEY	Gemini API key	AIzaSy...
FRONTEND_URL	Allowed CORS origin	http://localhost:5173
SMTP_HOST	Email server	smtp.ethereal.email
SMTP_PORT	Email port	587
SMTP_USER	Email username	user@ethereal.email
SMTP_PASS	Email password	password123
Frontend (frontend/.env)
Variable	Description	Example
VITE_API_URL	Backend API URL	http://localhost:3000/api
🔧 Troubleshooting
<details> <summary><strong>"AI failed — used keyword fallback"</strong></summary>
Cause: Gemini API call is failing.

Fix:

Bash

cd backend
npx tsx src/scripts/test-ai.ts
Common issues:

API key is placeholder: Check .env has a real key starting with AIza
Wrong model name: Use gemini-2.0-flash (not gemini-1.5-flash)
Quota exceeded: Wait 24 hours or create a new Google Cloud project
Rate limited: Reduce worker concurrency to 2
</details><details> <summary><strong>Status dropdown doesn't update</strong></summary>
Cause: Frontend receiving _id instead of id from the API.

Fix: Ensure feedback.service.ts transforms .lean() results:

TypeScript

const data = rawData.map((doc) => ({
  ...doc,
  id: doc._id.toString(),
  _id: undefined,
}));
</details><details> <summary><strong>Confidence always shows 20-45%</strong></summary>
Cause: AI is failing every time, so fallback is used.

Fix: Run the diagnostic script to find the real error:

Bash

npx tsx src/scripts/test-ai.ts
</details><details> <summary><strong>CORS errors in browser console</strong></summary>
Cause: Backend FRONTEND_URL doesn't match your frontend URL.

Fix: Update backend/.env:

env

FRONTEND_URL=http://localhost:5173
</details>
🤝 Contributing
Contributions are welcome! Here's how to get started:

Fork the repository
Create a feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request
Development Guidelines
 All code must be written in TypeScript
 API changes must include Zod validation schemas
 New features should include appropriate logging
 Follow the existing Controller → Service → Worker pattern
 Test AI changes using npx tsx src/scripts/test-ai.ts
📄 License
This project is licensed under the MIT License. See the LICENSE file for details.

<div align="center">
Built with ❤️ using TypeScript, React, Node.js, MongoDB, Redis, and Google Gemini AI

⭐ Star this repo if you found it helpful! ⭐

</div> ```
Save this as README.md in the root of your project folder, then:

Bash

git add README.md
git commit -m "Add comprehensive technical documentation"
git push origin main