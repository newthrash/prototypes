# ◈ DataVerse

**3D Data Visualization Platform** - *Tableau meets the Metaverse*

DataVerse transforms your CSV, JSON, and Excel data into stunning, interactive 3D visualizations that you can explore in real-time.

![DataVerse Preview](static/img/preview.png)

## ✨ Features

### 📤 File Upload
- Support for CSV, JSON, and Excel files
- Automatic data type detection
- Preview data before visualization

### 🤖 AI-Powered Visualization
- Smart chart type suggestions based on your data
- Automatic axis assignment
- Optimal visualization parameters

### 📊 3D Chart Types
- **3D Scatter Plots** - Explore relationships across 3 dimensions
- **3D Bar Charts** - Compare values in 3D space
- **3D Surface Maps** - Visualize terrain-like data surfaces
- **Network Graphs** - Display connections and relationships
- **3D Time Series** - Track changes over time in 3D

### 🎮 Interactive Controls
- Rotate, zoom, and pan with mouse/touch
- Hover over data points for details
- Click to select and inspect
- Auto-rotation mode
- Grid toggle

### 🎨 Customization
- 5 color schemes (Neon, Fire, Ocean, Forest, Purple)
- Configurable axes
- Color and size mapping by column
- Dark/Light themes

### 💾 Export Options
- PNG image export
- SVG vector export
- Video recording (coming soon)
- Shareable links
- Embed code

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dataverse.git
cd dataverse

# Install dependencies
pip install -r requirements.txt

# Run the application
python main.py
```

### Access
Open your browser and navigate to `http://localhost:8000`

## 📁 Project Structure

```
dataverse/
├── main.py              # FastAPI backend
├── requirements.txt     # Python dependencies
├── generate_samples.py  # Sample data generator
├── static/
│   ├── css/
│   │   └── style.css   # Sci-fi dark theme
│   └── js/
│       ├── app.js      # Main application logic
│       └── visualizations.js  # Three.js visualization engine
├── templates/
│   └── index.html      # Main UI
└── data/
    └── samples/        # Sample datasets
```

## 🎯 Sample Datasets

DataVerse includes 5 sample datasets to get you started:

1. **Stock Prices** - Historical market data with OHLC values
2. **Population** - Country statistics with GDP and demographics
3. **Sales Data** - Product sales across regions and quarters
4. **COVID-19 Cases** - Pandemic tracking over time
5. **Planetary Data** - Solar system information

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: HTMX + Vanilla JavaScript
- **3D Rendering**: Three.js
- **Data Processing**: Pandas
- **Database**: SQLite

## 🎮 Usage Guide

### 1. Upload Data
- Drag & drop your file onto the upload zone, or click to browse
- Supported formats: CSV, JSON, XLSX, XLS

### 2. Explore Suggestions
- View AI-recommended visualization types
- See data analysis summary

### 3. Customize
- Select chart type
- Configure X, Y, Z axes
- Map color and size to data columns
- Choose color scheme

### 4. Interact
- **Left Click + Drag**: Rotate view
- **Right Click + Drag**: Pan
- **Scroll**: Zoom
- **Hover**: See data point details
- **Click**: Select data point

### 5. Export
- Click export buttons in the sidebar
- Choose format (PNG, SVG, Share, Embed)

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main application |
| `/upload` | POST | Upload data file |
| `/data/{id}` | GET | Retrieve dataset |
| `/datasets` | GET | List all datasets |
| `/sample/{name}` | GET | Get sample dataset |
| `/visualize/{id}` | POST | Create visualization config |

## 🎨 Color Schemes

- **Neon** (Default): Cyan to Magenta gradient
- **Fire**: Orange to Yellow
- **Ocean**: Blue to Cyan
- **Forest**: Green shades
- **Purple**: Violet to Pink

## 🔮 Roadmap

- [ ] Video export with animation
- [ ] Real-time data streaming
- [ ] Collaborative sessions
- [ ] VR/AR support
- [ ] Custom shader support
- [ ] Plugin system for custom charts

## 📄 License

MIT License - feel free to use, modify, and distribute!

## 🙏 Credits

Built with:
- [Three.js](https://threejs.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [HTMX](https://htmx.org/)

---

**DataVerse** - *See your data in a new dimension*
