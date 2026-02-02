# AI Prompt Security Scanner
## FastAPI + HTMX Prototype

A tool to detect prompt injection vulnerabilities in AI systems.

### Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the app
uvicorn main:app --reload
```

### Features

- Real-time prompt injection detection
- Multiple attack vector scanning
- Risk scoring
- HTMX-powered UI (no React needed)
- FastAPI backend

### Usage

Open http://localhost:8000 and paste prompts to scan.
