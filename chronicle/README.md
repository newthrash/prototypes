# 📅 Chronicle - Local-First Calendar

A privacy-focused, local-first calendar application that stores all your data on your device. No cloud, no tracking, no telemetry.

![Chronicle Calendar](https://via.placeholder.com/800x400/3b82f6/ffffff?text=Chronicle+Calendar)

## 🌟 Features

- **📊 Multiple Views** - Month, Week, and Day views with smooth navigation
- **📝 Event Management** - Create, edit, and delete events with rich details
- **🔄 Recurring Events** - Support for daily, weekly, and monthly recurring events
- **🏷️ Categories** - Color-coded categories for organizing events
- **🔍 Search** - Quick search through all events
- **📤 Import/Export** - Full .ics file support for migrating from other calendars
- **🔔 Notifications** - Browser-based local notifications
- **💾 100% Local** - All data stored in SQLite, works completely offline
- **📱 Responsive** - Works on desktop and mobile

## 🏗️ Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: HTMX + Vanilla JS
- **Calendar UI**: FullCalendar.js
- **Database**: SQLite (local file)
- **Styling**: Tailwind CSS
- **Icons**: Lucide

## 📁 Project Structure

```
chronicle/
├── main.py                   # FastAPI application
├── requirements.txt          # Python dependencies
├── start.sh                  # Quick start script
├── generate_sample_data.py   # Generate test events
├── backup.py                 # Backup/restore utility
├── .env.example              # Environment config template
├── .gitignore                # Git ignore rules
├── LICENSE                   # MIT License
├── templates/
│   └── index.html           # Main UI template
├── static/                  # Static assets (CSS, JS)
├── data/                    # SQLite database (auto-created)
└── backups/                 # Backup files (auto-created)
└── README.md
```

## 🛠️ Utilities

### Backup & Restore

Your data is yours. Easily backup and restore:

```bash
# Create a backup
python3 backup.py backup

# List all backups
python3 backup.py list

# Restore from most recent backup
python3 backup.py restore

# Restore from specific backup
python3 backup.py restore backups/chronicle_backup_20240201_120000.db
```

### Generate Sample Data

```bash
python3 generate_sample_data.py
```

Creates 20 sample events across different categories for testing.

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- pip

### Installation

1. Clone or download this repository:
```bash
cd /Users/moltitasker/.openclaw/workspace/prototypes/chronicle
```

2. Install dependencies:
```bash
pip3 install -r requirements.txt
```

3. Run the application:
```bash
# Option 1: Using the start script
./start.sh

# Option 2: Direct Python
python3 main.py
```

4. Open your browser:
```
http://localhost:8000
```

### Generate Sample Data (Optional)

Want to see Chronicle in action with some events?

```bash
python3 generate_sample_data.py
```

This creates 20 sample events across different categories.

## 📁 Project Structure

```
chronicle/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── templates/
│   └── index.html      # Main UI template
├── static/             # Static assets (CSS, JS)
├── data/               # SQLite database (auto-created)
└── README.md
```

## 💾 Database

Chronicle uses SQLite with two main tables:

### Events Table
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Primary key (UUID) |
| title | TEXT | Event title |
| description | TEXT | Event details |
| start_time | TEXT | ISO 8601 datetime |
| end_time | TEXT | ISO 8601 datetime |
| all_day | INTEGER | Boolean flag |
| category | TEXT | Category reference |
| color | TEXT | Hex color code |
| recurrence_rule | TEXT | RRULE string |
| created_at | TEXT | Timestamp |
| updated_at | TEXT | Timestamp |

### Categories Table
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Primary key (UUID) |
| name | TEXT | Category name |
| color | TEXT | Hex color code |

## 📤 Import/Export

### Export to .ics
- Click the download icon in the header
- All events exported in standard iCalendar format
- Compatible with Google Calendar, Apple Calendar, Outlook

### Import from .ics
- Click the upload icon in the header
- Select your .ics file
- Events imported with all details preserved

## ⚙️ Configuration

Create a `.env` file to customize Chronicle:

```bash
cp .env.example .env
```

Available options:
```env
# Database location
DB_PATH=data/chronicle.db

# Server settings
HOST=0.0.0.0
PORT=8000

# Development
DEBUG=False
```

## 🔒 Privacy

Chronicle is built with privacy as the #1 priority:

- ✅ **No cloud storage** - Everything stays on your device
- ✅ **No accounts required** - No signup, no login
- ✅ **No tracking** - No analytics, no telemetry
- ✅ **No external APIs** - Works completely offline
- ✅ **Open data** - SQLite files you can inspect and backup
- ✅ **Standard format** - Export to .ics anytime

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `n` | Create new event |
| `Esc` | Close modal |
| `←` / `→` | Navigate calendar (when focused) |

## 🔮 Future Roadmap

- [ ] P2P sync between devices
- [ ] Drag-and-drop rescheduling
- [ ] More recurrence options
- [ ] Calendar sharing via encrypted links
- [ ] Desktop app (Electron/Tauri)
- [ ] Mobile app (React Native/Flutter)

## 🤝 Contributing

This is a prototype. Feel free to fork and extend!

## 📄 License

MIT License - feel free to use this however you'd like.

---

**Built with ❤️ for privacy-conscious humans.**
