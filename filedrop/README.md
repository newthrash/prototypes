# FileDrop

Simple, secure file transfer for developers. Alternative to FTP clients and WeTransfer with a clean web UI.

## Features

- 📤 **Drag & drop file upload** - Intuitive interface for quick uploads
- 🔗 **Instant shareable links** - Get a link immediately after upload
- ⏰ **Auto-expiring files** - Files expire after 24 hours (configurable)
- 👤 **No account required** - Just upload and share
- 📊 **Progress indicator** - Visual feedback during upload
- 💾 **2GB max file size** - Handle large files with ease

## Stack

- **Backend:** FastAPI (Python)
- **Frontend:** HTMX + vanilla JS
- **Storage:** Local filesystem
- **Database:** SQLite for metadata

## Quick Start

1. Install dependencies:
```bash
pip install fastapi uvicorn python-multipart jinja2
```

2. Run the server:
```bash
python main.py
```

3. Open your browser to `http://localhost:8000`

## API Endpoints

- `POST /upload` - Upload a file
- `GET /d/{file_id}` - Download a file
- `GET /api/file/{file_id}` - Get file metadata
- `GET /api/stats` - Get system statistics

## Configuration

Edit these constants in `main.py`:

```python
MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2GB
DEFAULT_EXPIRY_HOURS = 24
UPLOAD_DIR = Path("uploads")
```

## Production Considerations

- Use a proper WSGI server (Gunicorn) behind a reverse proxy (Nginx)
- Set up periodic cleanup of expired files (cron job)
- Use cloud storage (S3) for scalability
- Add rate limiting to prevent abuse
- Enable HTTPS

## License

MIT
