# AI-Assisted Development Bootcamp

A hands-on training application where you use an AI coding assistant to build features in a real full-stack app.

## Prerequisites

Before you start, make sure you have installed:

- **Node.js** (version 18 or higher) — [download here](https://nodejs.org/)
- **Git** — [download here](https://git-scm.com/downloads)
- **An AI coding assistant** — e.g. [Claude Code](https://claude.ai/claude-code), GitHub Copilot, or Cursor

## Getting Started

### 1. Clone the repository

Open a terminal and run:

```bash
git clone https://github.com/Rational-Partners/ai-training-practical.git
cd ai-training-practical
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

```bash
npm run db:migrate:dev -w backend
npm run db:seed -w backend
```

### 4. Start the application

```bash
npm run dev
```

This will start both the backend (http://localhost:5001) and frontend (http://localhost:5173).

### 5. Open the app

Go to **http://localhost:5173** in your browser. You will see the homepage with a list of exercises to complete.

## What to do

The app contains **three exercises**, each with a set of tasks. You will use your AI coding assistant to help you implement the solutions.

1. **Exercise 1: Task List** — Add CRUD operations to an existing task management UI
2. **Exercise 2: Car Park Availability** — Build a full-stack car park system from scratch
3. **Exercise 3: Analytics Chart** — Fetch data and visualise it with a charting library

Start with Exercise 1 and work your way through. Each exercise page has detailed instructions explaining what to build.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm install` fails | Make sure you have Node.js 18+ installed: `node --version` |
| Database errors | Re-run: `npm run db:migrate:dev -w backend && npm run db:seed -w backend` |
| Backend won't start | Check `logs/backend.log` for errors |
| Frontend won't start | Check `logs/frontend.log` for errors |
| Port already in use | Kill the existing process or change ports in `backend/.env` and `frontend/.env.development` |
