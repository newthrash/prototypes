# DataVerse - 3D Data Visualization SaaS

from fastapi import FastAPI, File, UploadFile, Request, Form
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse, HTMLResponse
import pandas as pd
import json
import numpy as np
from pathlib import Path
import sqlite3
import uuid
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
import asyncio

app = FastAPI(title="DataVerse", description="3D Data Visualization Platform")

# Setup paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# Static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Database setup
def get_db():
    conn = sqlite3.connect(DATA_DIR / "dataverse.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS datasets (
            id TEXT PRIMARY KEY,
            filename TEXT,
            original_name TEXT,
            upload_date TIMESTAMP,
            columns TEXT,
            row_count INTEGER,
            chart_type TEXT,
            status TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS visualizations (
            id TEXT PRIMARY KEY,
            dataset_id TEXT,
            chart_type TEXT,
            config TEXT,
            created_at TIMESTAMP,
            FOREIGN KEY (dataset_id) REFERENCES datasets(id)
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ============== Data Analysis & Suggestions ==============

class DataAnalyzer:
    @staticmethod
    def analyze_dataset(df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze dataset and suggest visualization options"""
        analysis = {
            "columns": list(df.columns),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "row_count": len(df),
            "numeric_cols": list(df.select_dtypes(include=[np.number]).columns),
            "categorical_cols": list(df.select_dtypes(include=['object']).columns),
            "date_cols": [],
            "suggestions": []
        }
        
        # Detect date columns
        for col in df.columns:
            if df[col].dtype == 'object':
                try:
                    pd.to_datetime(df[col], errors='raise')
                    analysis["date_cols"].append(col)
                except:
                    pass
        
        # Generate suggestions
        suggestions = DataAnalyzer.generate_suggestions(analysis)
        analysis["suggestions"] = suggestions
        
        return analysis
    
    @staticmethod
    def generate_suggestions(analysis: Dict) -> List[Dict]:
        """Generate chart type suggestions based on data analysis"""
        suggestions = []
        numeric = analysis["numeric_cols"]
        categorical = analysis["categorical_cols"]
        dates = analysis["date_cols"]
        
        # 3D Scatter: Need at least 3 numeric columns
        if len(numeric) >= 3:
            suggestions.append({
                "type": "scatter3d",
                "name": "3D Scatter Plot",
                "description": f"Explore relationships between {numeric[0]}, {numeric[1]}, and {numeric[2]}",
                "axes": {"x": numeric[0], "y": numeric[1], "z": numeric[2]},
                "color_by": categorical[0] if categorical else None,
                "icon": "📊"
            })
        
        # 3D Bar: Need categorical + numeric
        if len(categorical) >= 1 and len(numeric) >= 2:
            suggestions.append({
                "type": "bar3d",
                "name": "3D Bar Chart",
                "description": f"Compare {numeric[0]} and {numeric[1]} across {categorical[0]}",
                "axes": {"x": categorical[0], "y": numeric[0], "z": numeric[1]},
                "icon": "📊"
            })
        
        # 3D Surface: Need 2 numeric + 1 numeric (for height)
        if len(numeric) >= 3:
            suggestions.append({
                "type": "surface",
                "name": "3D Surface Map",
                "description": f"Visualize terrain-like surface",
                "axes": {"x": numeric[0], "y": numeric[1], "z": numeric[2]},
                "icon": "🗻"
            })
        
        # Network: Need 2 columns that could be nodes (often string IDs or names)
        potential_nodes = categorical + [col for col in numeric if analysis["row_count"] > 20]
        if len(potential_nodes) >= 2:
            suggestions.append({
                "type": "network",
                "name": "Network Graph",
                "description": f"Explore connections between data points",
                "axes": {"source": potential_nodes[0], "target": potential_nodes[1]},
                "icon": "🕸️"
            })
        
        # Time series 3D: Need date + numeric
        if len(dates) >= 1 and len(numeric) >= 2:
            suggestions.append({
                "type": "timeseries3d",
                "name": "3D Time Series",
                "description": f"Track {numeric[0]} and {numeric[1]} over time",
                "axes": {"time": dates[0], "y": numeric[0], "z": numeric[1]},
                "icon": "⏱️"
            })
        
        return suggestions[:4]  # Top 4 suggestions

# ============== Routes ==============

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Main application page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "DataVerse"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Handle file upload and return analysis"""
    dataset_id = str(uuid.uuid4())[:8]
    
    # Save file
    file_ext = Path(file.filename).suffix.lower()
    save_path = DATA_DIR / f"{dataset_id}{file_ext}"
    
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)
    
    # Parse based on file type
    try:
        if file_ext in ['.csv']:
            df = pd.read_csv(save_path)
        elif file_ext in ['.json']:
            df = pd.read_json(save_path)
        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(save_path)
        else:
            return JSONResponse(
                status_code=400,
                content={"error": f"Unsupported file type: {file_ext}"}
            )
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": f"Failed to parse file: {str(e)}"}
        )
    
    # Analyze dataset
    analyzer = DataAnalyzer()
    analysis = analyzer.analyze_dataset(df)
    
    # Save to database
    conn = get_db()
    conn.execute(
        "INSERT INTO datasets VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (
            dataset_id,
            str(save_path),
            file.filename,
            datetime.now(),
            json.dumps(analysis["columns"]),
            analysis["row_count"],
            None,
            "ready"
        )
    )
    conn.commit()
    conn.close()
    
    # Save parsed data as JSON for frontend
    df.to_json(DATA_DIR / f"{dataset_id}.json", orient='records')
    
    return {
        "dataset_id": dataset_id,
        "analysis": analysis,
        "preview": df.head(10).to_dict(orient='records')
    }

@app.get("/data/{dataset_id}")
async def get_data(dataset_id: str, limit: int = 10000):
    """Get dataset as JSON"""
    json_path = DATA_DIR / f"{dataset_id}.json"
    
    if not json_path.exists():
        return JSONResponse(
            status_code=404,
            content={"error": "Dataset not found"}
        )
    
    with open(json_path) as f:
        data = json.load(f)
    
    # Limit data for performance
    if len(data) > limit:
        # Sample data for large datasets
        step = len(data) // limit
        data = data[::step][:limit]
    
    return {"data": data}

@app.post("/visualize/{dataset_id}")
async def create_visualization(
    dataset_id: str,
    chart_type: str = Form(...),
    config: str = Form("{}")
):
    """Create visualization configuration"""
    viz_id = str(uuid.uuid4())[:8]
    
    conn = get_db()
    conn.execute(
        "INSERT INTO visualizations VALUES (?, ?, ?, ?, ?)",
        (viz_id, dataset_id, chart_type, config, datetime.now())
    )
    conn.commit()
    conn.close()
    
    return {
        "visualization_id": viz_id,
        "dataset_id": dataset_id,
        "chart_type": chart_type,
        "config": json.loads(config)
    }

@app.get("/datasets")
async def list_datasets():
    """List all uploaded datasets"""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM datasets ORDER BY upload_date DESC"
    ).fetchall()
    conn.close()
    
    datasets = []
    for row in rows:
        datasets.append({
            "id": row["id"],
            "filename": row["original_name"],
            "upload_date": row["upload_date"],
            "columns": json.loads(row["columns"]),
            "row_count": row["row_count"],
            "status": row["status"]
        })
    
    return {"datasets": datasets}

@app.get("/sample/{name}")
async def get_sample_data(name: str):
    """Get sample dataset"""
    samples = {
        "stocks": "stock_prices.csv",
        "population": "population.csv",
        "sales": "sales_data.csv",
        "covid": "covid_cases.csv",
        "planets": "planetary_data.csv"
    }
    
    if name not in samples:
        return JSONResponse(
            status_code=404,
            content={"error": "Sample not found"}
        )
    
    file_path = DATA_DIR / "samples" / samples[name]
    
    if file_path.suffix == '.csv':
        df = pd.read_csv(file_path)
    else:
        df = pd.read_json(file_path)
    
    return {"data": df.to_dict(orient='records')}

# ============== Run ==============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
