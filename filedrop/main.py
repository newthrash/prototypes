from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from contextlib import asynccontextmanager
import sqlite3
import uuid
import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
import hashlib

UPLOAD_DIR = Path("uploads")
MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
DEFAULT_EXPIRY_HOURS = 24
DB_PATH = "filedrop.db"

# Ensure upload directory exists
UPLOAD_DIR.mkdir(exist_ok=True)

def init_db():
    """Initialize SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            original_filename TEXT NOT NULL,
            stored_filename TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            content_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            download_count INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()

def cleanup_expired_files():
    """Remove expired files from disk and database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT id, stored_filename FROM files WHERE expires_at < ?",
        (datetime.now(),)
    )
    expired = cursor.fetchall()
    
    for file_id, stored_filename in expired:
        file_path = UPLOAD_DIR / stored_filename
        if file_path.exists():
            file_path.unlink()
        cursor.execute("DELETE FROM files WHERE id = ?", (file_id,))
        print(f"Cleaned up expired file: {file_id}")
    
    conn.commit()
    conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    init_db()
    cleanup_expired_files()
    yield

app = FastAPI(title="FileDrop", lifespan=lifespan)
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Main page with upload form"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...)
):
    """Handle file upload with streaming"""
    
    # Generate unique file ID
    file_id = str(uuid.uuid4())[:8]
    
    # Check file size by reading content
    content = await file.read()
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 2GB.")
    
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Cannot upload empty file.")
    
    # Create stored filename
    file_ext = Path(file.filename).suffix
    stored_filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / stored_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Calculate expiry
    expires_at = datetime.now() + timedelta(hours=DEFAULT_EXPIRY_HOURS)
    
    # Store metadata in database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO files (id, original_filename, stored_filename, file_size, content_type, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (file_id, file.filename, stored_filename, file_size, file.content_type, expires_at)
    )
    conn.commit()
    conn.close()
    
    # Generate shareable link
    base_url = str(request.base_url).rstrip("/")
    download_url = f"{base_url}/d/{file_id}"
    
    return JSONResponse({
        "success": True,
        "file_id": file_id,
        "filename": file.filename,
        "size": file_size,
        "expires_at": expires_at.isoformat(),
        "download_url": download_url,
        "expires_in": f"{DEFAULT_EXPIRY_HOURS} hours"
    })

@app.get("/d/{file_id}")
async def download_file(file_id: str):
    """Download file with expiration check"""
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT original_filename, stored_filename, file_size, expires_at, download_count FROM files WHERE id = ?",
        (file_id,)
    )
    result = cursor.fetchone()
    
    if not result:
        conn.close()
        raise HTTPException(status_code=404, detail="File not found or expired.")
    
    original_filename, stored_filename, file_size, expires_at, download_count = result
    
    # Check if expired
    if datetime.now() > datetime.fromisoformat(expires_at):
        # Clean up file
        file_path = UPLOAD_DIR / stored_filename
        if file_path.exists():
            file_path.unlink()
        cursor.execute("DELETE FROM files WHERE id = ?", (file_id,))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=404, detail="File has expired.")
    
    # Update download count
    cursor.execute(
        "UPDATE files SET download_count = download_count + 1 WHERE id = ?",
        (file_id,)
    )
    conn.commit()
    conn.close()
    
    file_path = UPLOAD_DIR / stored_filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk.")
    
    return FileResponse(
        path=file_path,
        filename=original_filename,
        media_type="application/octet-stream"
    )

@app.get("/api/file/{file_id}")
async def get_file_info(file_id: str):
    """Get file metadata"""
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT original_filename, file_size, expires_at, download_count FROM files WHERE id = ?",
        (file_id,)
    )
    result = cursor.fetchone()
    conn.close()
    
    if not result:
        raise HTTPException(status_code=404, detail="File not found.")
    
    original_filename, file_size, expires_at, download_count = result
    
    # Check if expired
    if datetime.now() > datetime.fromisoformat(expires_at):
        raise HTTPException(status_code=410, detail="File has expired.")
    
    return JSONResponse({
        "file_id": file_id,
        "filename": original_filename,
        "size": file_size,
        "expires_at": expires_at,
        "download_count": download_count
    })

@app.get("/api/stats")
async def get_stats():
    """Get system stats"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM files")
    total_files = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM files WHERE expires_at > ?", (datetime.now(),))
    active_files = cursor.fetchone()[0]
    
    cursor.execute("SELECT SUM(file_size) FROM files")
    total_size = cursor.fetchone()[0] or 0
    
    conn.close()
    
    return JSONResponse({
        "total_files": total_files,
        "active_files": active_files,
        "total_size_bytes": total_size,
        "total_size_human": human_readable_size(total_size)
    })

def human_readable_size(size_bytes):
    """Convert bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} PB"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
