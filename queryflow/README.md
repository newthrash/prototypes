# QueryFlow - Database Query Tracing & Optimization
## FastAPI + HTMX Prototype

A tool for developers to trace, analyze, and optimize database queries.

### Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the app
uvicorn main:app --reload --port 8002
```

### Features

- Real-time query tracing
- Performance analysis & slow query detection
- Query optimization suggestions
- Visual query timeline
- Support for PostgreSQL, MySQL, SQLite

### Use Cases

- Find N+1 queries
- Detect missing indexes
- Optimize slow queries
- Monitor query patterns in production
