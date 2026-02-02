from fastapi import FastAPI, Request, Form, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
import sqlite3
import json
import os
import uuid
import icalendar
import pytz
from typing import Optional, List

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configuration
DB_PATH = os.getenv('DB_PATH', os.path.join(os.path.dirname(__file__), "data", "chronicle.db"))
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 8000))
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# Ensure data directory exists
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

def init_db():
    """Initialize the SQLite database with required tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Categories table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#3b82f6'
        )
    ''')
    
    # Events table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            all_day INTEGER DEFAULT 0,
            category TEXT,
            color TEXT,
            recurrence_rule TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category) REFERENCES categories(id)
        )
    ''')
    
    # Insert default categories if none exist
    cursor.execute("SELECT COUNT(*) FROM categories")
    if cursor.fetchone()[0] == 0:
        default_categories = [
            ('cat-1', 'Work', '#3b82f6'),
            ('cat-2', 'Personal', '#10b981'),
            ('cat-3', 'Family', '#f59e0b'),
            ('cat-4', 'Health', '#ef4444'),
            ('cat-5', 'Other', '#8b5cf6'),
        ]
        cursor.executemany(
            "INSERT INTO categories (id, name, color) VALUES (?, ?, ?)",
            default_categories
        )
    
    conn.commit()
    conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup"""
    init_db()
    yield

app = FastAPI(title="Chronicle - Local-First Calendar", lifespan=lifespan)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

def get_db():
    """Get database connection with row factory"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ============ Routes ============

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Main calendar page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/events")
async def get_events(
    start: str = None,
    end: str = None,
    category: str = None,
    search: str = None
):
    """Get events, optionally filtered by date range, category, or search term"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM events WHERE 1=1"
    params = []
    
    if start:
        query += " AND end_time >= ?"
        params.append(start)
    if end:
        query += " AND start_time <= ?"
        params.append(end)
    if category:
        query += " AND category = ?"
        params.append(category)
    if search:
        query += " AND (title LIKE ? OR description LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    
    query += " ORDER BY start_time"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    events = []
    for row in rows:
        event = dict(row)
        event['all_day'] = bool(event['all_day'])
        events.append(event)
        
        # Handle recurring events - expand them for the requested range
        if event['recurrence_rule'] and start and end:
            expanded = expand_recurring_event(event, start, end)
            events.extend(expanded)
    
    conn.close()
    return events

@app.get("/api/events/{event_id}")
async def get_event(event_id: str):
    """Get a single event by ID"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event = dict(row)
    event['all_day'] = bool(event['all_day'])
    return event

@app.post("/api/events")
async def create_event(
    title: str = Form(...),
    description: str = Form(""),
    start_time: str = Form(...),
    end_time: str = Form(...),
    all_day: bool = Form(False),
    category: str = Form(None),
    color: str = Form(None),
    recurrence_rule: str = Form(None)
):
    """Create a new event"""
    conn = get_db()
    cursor = conn.cursor()
    
    event_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    cursor.execute('''
        INSERT INTO events (id, title, description, start_time, end_time, all_day, category, color, recurrence_rule, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (event_id, title, description, start_time, end_time, int(all_day), category, color, recurrence_rule, now, now))
    
    conn.commit()
    conn.close()
    
    return {"id": event_id, "message": "Event created successfully"}

@app.put("/api/events/{event_id}")
async def update_event(
    event_id: str,
    title: str = Form(...),
    description: str = Form(""),
    start_time: str = Form(...),
    end_time: str = Form(...),
    all_day: bool = Form(False),
    category: str = Form(None),
    color: str = Form(None),
    recurrence_rule: str = Form(None)
):
    """Update an existing event"""
    conn = get_db()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    
    cursor.execute('''
        UPDATE events 
        SET title = ?, description = ?, start_time = ?, end_time = ?, all_day = ?, 
            category = ?, color = ?, recurrence_rule = ?, updated_at = ?
        WHERE id = ?
    ''', (title, description, start_time, end_time, int(all_day), category, color, recurrence_rule, now, event_id))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Event not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Event updated successfully"}

@app.delete("/api/events/{event_id}")
async def delete_event(event_id: str):
    """Delete an event"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM events WHERE id = ?", (event_id,))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Event not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Event deleted successfully"}

# ============ Categories ============

@app.get("/api/categories")
async def get_categories():
    """Get all categories"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories ORDER BY name")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/categories")
async def create_category(name: str = Form(...), color: str = Form("#3b82f6")):
    """Create a new category"""
    conn = get_db()
    cursor = conn.cursor()
    
    cat_id = str(uuid.uuid4())
    cursor.execute("INSERT INTO categories (id, name, color) VALUES (?, ?, ?)", (cat_id, name, color))
    conn.commit()
    conn.close()
    
    return {"id": cat_id, "message": "Category created successfully"}

# ============ Import/Export ICS ============

@app.get("/api/export.ics")
async def export_ics():
    """Export all events as .ics file"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events")
    rows = cursor.fetchall()
    conn.close()
    
    cal = icalendar.Calendar()
    cal.add('prodid', '-//Chronicle Calendar//EN')
    cal.add('version', '2.0')
    
    for row in rows:
        event = icalendar.Event()
        event.add('uid', row['id'])
        event.add('summary', row['title'])
        if row['description']:
            event.add('description', row['description'])
        
        start = datetime.fromisoformat(row['start_time'])
        end = datetime.fromisoformat(row['end_time'])
        
        if row['all_day']:
            event.add('dtstart', start.date())
            event.add('dtend', end.date())
        else:
            event.add('dtstart', start)
            event.add('dtend', end)
        
        if row['recurrence_rule']:
            event.add('rrule', row['recurrence_rule'])
        
        cal.add_component(event)
    
    ics_content = cal.to_ical()
    
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=chronicle-calendar.ics"}
    )

from fastapi import UploadFile, File
from fastapi.responses import Response

@app.post("/api/import.ics")
async def import_ics(file: UploadFile = File(...)):
    """Import events from .ics file"""
    content = await file.read()
    cal = icalendar.Calendar.from_ical(content)
    
    conn = get_db()
    cursor = conn.cursor()
    
    imported_count = 0
    
    for component in cal.walk():
        if component.name == "VEVENT":
            event_id = str(uuid.uuid4())
            title = str(component.get('summary', 'Untitled'))
            description = str(component.get('description', ''))
            
            dtstart = component.get('dtstart').dt
            dtend = component.get('dtend').dt if component.get('dtend') else dtstart
            
            all_day = not isinstance(dtstart, datetime)
            
            if all_day:
                start_time = dtstart.isoformat()
                end_time = dtend.isoformat() if isinstance(dtend, type(dtstart)) else dtstart.isoformat()
            else:
                start_time = dtstart.isoformat()
                end_time = dtend.isoformat() if isinstance(dtend, datetime) else dtstart.isoformat()
            
            recurrence = str(component.get('rrule', '')) if component.get('rrule') else None
            
            now = datetime.now().isoformat()
            
            cursor.execute('''
                INSERT INTO events (id, title, description, start_time, end_time, all_day, recurrence_rule, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (event_id, title, description, start_time, end_time, int(all_day), recurrence, now, now))
            
            imported_count += 1
    
    conn.commit()
    conn.close()
    
    return {"message": f"Successfully imported {imported_count} events"}

# ============ Recurring Events Helper ============

def expand_recurring_event(event: dict, range_start: str, range_end: str) -> list:
    """Expand a recurring event into individual occurrences within a date range"""
    # This is a simplified implementation
    # Full RRULE parsing would require a library like dateutil.rrule
    expanded = []
    
    if not event['recurrence_rule']:
        return expanded
    
    # Parse range dates
    range_start_dt = datetime.fromisoformat(range_start.replace('Z', '+00:00').replace('Z', ''))
    range_end_dt = datetime.fromisoformat(range_end.replace('Z', '+00:00').replace('Z', ''))
    
    start_time = datetime.fromisoformat(event['start_time'])
    end_time = datetime.fromisoformat(event['end_time'])
    duration = end_time - start_time
    
    # Simple recurrence handling (daily, weekly, monthly)
    recurrence = event['recurrence_rule'].lower()
    
    current_start = start_time
    occurrence = 1
    max_occurrences = 100  # Safety limit
    
    while current_start < range_end_dt and occurrence < max_occurrences:
        # Skip if before range start
        if current_start >= range_start_dt:
            new_event = event.copy()
            new_event['id'] = f"{event['id']}_occ_{occurrence}"
            new_event['start_time'] = current_start.isoformat()
            new_event['end_time'] = (current_start + duration).isoformat()
            new_event['is_recurring_instance'] = True
            new_event['parent_id'] = event['id']
            expanded.append(new_event)
        
        # Advance to next occurrence
        if 'daily' in recurrence:
            current_start += timedelta(days=1)
        elif 'weekly' in recurrence:
            current_start += timedelta(weeks=1)
        elif 'monthly' in recurrence:
            # Simple monthly increment (doesn't handle all edge cases)
            month = current_start.month + 1
            year = current_start.year
            if month > 12:
                month = 1
                year += 1
            try:
                current_start = current_start.replace(year=year, month=month)
            except ValueError:
                # Handle month with fewer days
                current_start = current_start.replace(year=year, month=month, day=1)
        else:
            break
        
        occurrence += 1
    
    return expanded

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT, reload=DEBUG)
