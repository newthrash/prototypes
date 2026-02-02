# StatusPulse 🟢

A lightweight, open-source status page for teams and small companies. A simple alternative to StatusPage.io ($29-99/mo).

![StatusPulse Screenshot](https://via.placeholder.com/800x400/0f172a/22c55e?text=StatusPulse)

## Features

- ✅ **Simple Dashboard** - Clean status overview of all services
- ✅ **Manual Status Updates** - Mark components as Up, Degraded, Down, or Maintenance
- ✅ **Incident Management** - Create and track incidents with timeline
- ✅ **Public Status Page** - Read-only page for your users
- ✅ **Admin Panel** - Full CRUD for components and incidents
- ✅ **Component Groups** - Organize services logically
- ✅ **Dark Mode UI** - Modern, clean design

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the Application

```bash
python main.py
```

Or with uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Access the App

- **Public Status Page**: http://localhost:8000/
- **Admin Dashboard**: http://localhost:8000/admin

## Usage

### Public Pages

| URL | Description |
|-----|-------------|
| `/` | Main status page showing all services |
| `/history` | Full incident history |
| `/incident/{id}` | Detailed incident view |

### Admin Pages

| URL | Description |
|-----|-------------|
| `/admin` | Dashboard to manage components and active incidents |
| `/admin/incidents/new` | Create a new incident |
| `/admin/incidents/{id}` | Update an existing incident |

### Component Status Levels

| Status | Meaning |
|--------|---------|
| 🟢 Operational | Working normally |
| 🟡 Degraded | Slower than normal |
| 🟠 Partial Outage | Some features unavailable |
| 🔴 Major Outage | Service completely down |
| 🔵 Maintenance | Planned downtime |

### Incident Workflow

1. **Create Incident** - Go to `/admin` and click "Create Incident"
2. **Select Impact** - Minor, Major, or Critical
3. **Add Updates** - Keep users informed as you investigate
4. **Mark Resolved** - System automatically restores component status

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/components` | GET | JSON list of all components |

## Database

StatusPulse uses SQLite by default. The database file (`statuspulse.db`) is created automatically on first run.

### Models

- **Component** - Services being monitored (API, Website, Database, etc.)
- **Incident** - Issues affecting services
- **IncidentUpdate** - Timeline updates for incidents
- **IncidentComponent** - Links incidents to affected components

## Customization

### Add Default Components

Edit the `seed_data()` function in `main.py` to customize the default components created on first run.

### Change Colors

Edit `static/css/style.css` - CSS variables at the top:

```css
:root {
    --status-operational: #22c55e;
    --status-degraded: #eab308;
    --status-partial: #f97316;
    --status-major: #ef4444;
}
```

## Production Deployment

For production use:

1. Use a production ASGI server (uvicorn with gunicorn)
2. Set up proper authentication for the admin panel
3. Use PostgreSQL instead of SQLite for better concurrency
4. Set up regular database backups

Example with gunicorn:

```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: HTMX + Jinja2 Templates
- **Database**: SQLite (SQLAlchemy ORM)
- **Styling**: Custom CSS (Dark theme)

## License

MIT License - Use it, modify it, sell it. No restrictions.

## Roadmap

- [ ] Email notifications for subscribers
- [ ] Scheduled maintenance mode
- [ ] API for automated status updates
- [ ] Multiple status pages per account
- [ ] Custom domain support
- [ ] Webhook integrations

---

Built with ❤️ as a lightweight alternative to expensive status page services.
