# Campus AI

Campus AI is a multi-agent AI study assistant designed to help students manage studying, documents, schedules, deadlines, and academic tasks from one place.

The project uses a **FastAPI backend** with **LangGraph-based agent orchestration** and a **Next.js frontend**.

## Features

- Multi-agent AI study assistance
- AI chat and agent workflows
- Student authentication and role-based admin access
- Document upload and RAG-based document processing
- Study and academic scheduling
- Deadline reminders and email notifications
- Calendar export support
- Voice interaction
- Session management and persistent conversation state
- PostgreSQL-backed persistence
- Redis support for caching
- LangSmith tracing support
- Admin dashboard
- Streaming AI responses

## Tech Stack

### Backend

- Python
- FastAPI
- LangGraph
- LangChain Core
- PostgreSQL
- SQLAlchemy
- Alembic
- pgvector
- Redis
- JWT authentication
- Pydantic
- APScheduler
- PyPDF
- python-docx
- AssemblyAI
- LangSmith
- Resend
- Google Drive API

### Frontend

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- ESLint

## Project Structure

```text
Campus-AI/
├── backend/
│   ├── app/
│   │   ├── agents/        # LangGraph agents and workflows
│   │   ├── api/           # API routes
│   │   ├── core/          # Configuration, logging, scheduler, persistence
│   │   ├── models/        # Database models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── main.py        # FastAPI application
│   ├── migrations/        # Alembic migrations
│   ├── tests/             # Backend tests
│   ├── .env.example       # Backend environment template
│   ├── alembic.ini
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── admin/         # Admin pages
│   │   ├── dashboard/     # Student dashboard
│   │   ├── signin/        # Sign-in page
│   │   ├── signup/        # Sign-up page
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── components/        # Reusable UI components
│   ├── lib/               # Frontend utilities
│   ├── .env.example
│   ├── package.json
│   └── next.config.mjs
│
├── LICENSE
└── README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Eman2123/Campus-AI.git
cd Campus-AI
```

## Backend Setup

Open a terminal in the project root and run:

```bash
cd backend
```

Create and activate a virtual environment:

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```powershell
python -m pip install -r requirements.txt
```

> Use `-r requirements.txt`. Running `pip install requirements.txt` attempts to install a package literally named `requirements.txt`.

Create your environment file:

```powershell
Copy-Item .env.example .env
```

Update `.env` with the required database, AI, authentication, and other service credentials.

Start the FastAPI server:

```powershell
uvicorn app.main:app --reload
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

FastAPI interactive documentation:

```text
http://127.0.0.1:8000/docs
```

## Frontend Setup

Open a second terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create the frontend environment file:

### Windows PowerShell

```powershell
Copy-Item .env.example .env.local
```

Start the development server:

```powershell
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:3000
```

## Environment Variables

The repository includes environment templates:

- `backend/.env.example`
- `frontend/.env.example`

Do not commit real API keys, passwords, database credentials, JWT secrets, or service-account credentials.

Key backend configuration includes:

- PostgreSQL / Neon database URL
- Redis URL
- JWT secret
- AI Model API configuration
- AssemblyAI API key
- Optional LangSmith tracing
- Embedding configuration
- Resend email configuration
- Google Drive configuration

## Database Migrations

The backend uses Alembic for database migrations.

From the `backend` directory:

```powershell
alembic upgrade head
```

To create a new migration after model changes:

```powershell
alembic revision --autogenerate -m "describe change"
```

## Testing

From the `backend` directory:

```powershell
pytest
```

## Production Build

### Frontend

```powershell
cd frontend
npm run build
npm start
```

### Backend

A production deployment should run FastAPI with a production ASGI configuration rather than the development `--reload` mode.

## Architecture

Campus AI separates the application into two main services:

```text
                 ┌─────────────────────┐
                 │     Next.js UI      │
                 │   React + Tailwind  │
                 └──────────┬──────────┘
                            │
                            │ HTTP / Streaming
                            ▼
                 ┌─────────────────────┐
                 │     FastAPI API     │
                 │ Authentication      │
                 │ Documents           │
                 │ Scheduling          │
                 │ Voice               │
                 │ Sessions            │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │    LangGraph AI     │
                 │   Multi-Agent Flow  │
                 └──────────┬──────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
     PostgreSQL           Redis          External APIs
     + pgvector                           AI / Voice /
                                           Email / Drive
```

## API Areas

The backend currently exposes API areas for:

- Health checks
- Authentication
- AI agent interactions
- Voice
- Documents
- Scheduling
- Sessions
- Administration

## Development Notes

- Keep secrets in local environment files.
- Use the provided `.env.example` files when setting up the project.
- Run the backend and frontend independently during development.
- Keep database migrations under `backend/migrations`.
- Use the FastAPI Swagger UI at `/docs` to inspect and test API endpoints.
- The backend lifespan initializes the PostgreSQL-backed LangGraph checkpointer when the database is available and starts the reminder scheduler.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
