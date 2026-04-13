# AI-Assisted Development Practical

A hands-on practical where you use an AI coding assistant to build features in a real full-stack app.

## Setting Up Your Computer

Before starting, you need Node.js and the project dependencies installed. **This is especially important on Windows**, where Node.js and npm can have PATH issues.

Open Claude Code in this directory and give it this prompt:

> Check if my computer is set up for this practical. I need Node.js 18 or higher. Check what version I have installed. If I don't have it or it's too old, help me install it. Then run `npm install` to install the project dependencies. After that, set up the database by running `npm run db:migrate:dev -w backend` and `npm run db:seed -w backend`. Finally, start the app with `npm run dev` and confirm both the backend and frontend are running. Tell me when I'm ready to go.

Claude will handle the rest — including installing Node.js if needed, dealing with PATH issues, and setting up the database.

If you don't have Claude Code installed yet, run:
```bash
npm install -g @anthropic-ai/claude-code
```
This requires Node.js 18+. See [claude.ai/code](https://claude.ai/code) for details.

---

## The Scenario

You have a running full-stack application — a React frontend talking to an Express backend with a Prisma database. The app works, but several features are incomplete. Your job is to build them, using AI to help you.

## The Exercises

There are 3 exercises, each teaching a different aspect of AI-assisted development:

| # | Exercise | What You Build | Difficulty |
|---|----------|---------------|-----------|
| 1 | **Task List** | Add create, update, and delete to an existing task management UI | Easiest — start here |
| 2 | **Car Park Availability** | Build a full-stack parking system from scratch — database, API, and dashboard | Medium |
| 3 | **Analytics Chart** | Find an API endpoint and visualise the data with a charting library | Medium |

Start with Exercise 1 and work your way through. Each exercise page in the app has detailed instructions explaining what to build.

## Getting Started

1. Start the app (if it's not already running):

```bash
npm run dev
```

2. Open **http://localhost:5173** in your browser — you'll see the homepage with links to each exercise.

3. Open Claude Code in this directory:

```bash
claude
```

4. Pick an exercise from the app and start building. The exercise pages tell you exactly what to do.

## Tips

- You don't need to understand the full codebase to start — that's what Claude is for
- Talk to Claude in plain English. "Add a delete button to each task row" is a perfectly good prompt
- Each exercise page has example prompts you can reveal if you get stuck
- If Claude's explanation is too technical, ask it to explain more simply
- The app hot-reloads — save a file and the browser updates automatically

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm install` fails | Make sure you have Node.js 18+: `node --version` |
| Database errors | Re-run: `npm run db:migrate:dev -w backend && npm run db:seed -w backend` |
| Backend won't start | Check `logs/backend.log` for errors |
| Frontend won't start | Check `logs/frontend.log` for errors |
| Port already in use | Kill the existing process or change ports in `backend/.env` and `frontend/.env.development` |
