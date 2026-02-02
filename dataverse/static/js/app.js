// DataVerse - Main Application

class DataVerseApp {
    constructor() {
        this.currentDataset = null;
        this.currentVisualization = null;
        this.visualizationEngine = null;
        this.colorScheme = 'neon';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initVisualizationEngine();
    }
    
    setupEventListeners() {
        // File upload
        const uploadZone = document.getElementById('upload-zone');
        const fileInput = document.getElementById('file-input');
        
        uploadZone.addEventListener('click', () => fileInput.click());
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });
        
        // Color scheme selection
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.colorScheme = e.target.dataset.scheme;
                if (this.currentVisualization) {
                    this.updateVisualization();
                }
            });
        });
        
        // Chart type change
        document.getElementById('chart-type').addEventListener('change', () => {
            this.updateAxisOptions();
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            if (this.visualizationEngine) {
                this.visualizationEngine.handleResize();
            }
        });
    }
    
    initVisualizationEngine() {
        this.visualizationEngine = new VisualizationEngine('three-canvas');
    }
    
    async handleFileUpload(file) {
        const statusDiv = document.getElementById('upload-status');
        statusDiv.innerHTML = '<div class="spinner" style="width: 24px; height: 24px;"></div> Analyzing...';
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.currentDataset = {
                    id: result.dataset_id,
                    analysis: result.analysis,
                    data: result.preview
                };
                
                this.showAnalysis(result);
                this.loadDataset(result.dataset_id);
                statusDiv.innerHTML = '<span style="color: var(--accent-success);">✓ Upload successful!</span>';
            } else {
                statusDiv.innerHTML = `<span style="color: #ff4444;">✗ ${result.error}</span>`;
            }
        } catch (error) {
            statusDiv.innerHTML = `<span style="color: #ff4444;">✗ Upload failed: ${error.message}</span>`;
        }
    }
    
    showAnalysis(result) {
        const analysis = result.analysis;
        
        // Show analysis panel
        document.getElementById('analysis-panel').classList.remove('hidden');
        document.getElementById('controls-panel').classList.remove('hidden');
        
        // Display dataset info
        document.getElementById('dataset-info').innerHTML = `
            <div class="info-row">
                <span class="info-label">Rows</span>
                <span class="info-value">${analysis.row_count.toLocaleString()}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Columns</span>
                <span class="info-value">${analysis.columns.length}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Numeric</span>
                <span class="info-value">${analysis.numeric_cols.length}</span>
            </div>
        `;
        
        // Show suggestions
        const suggestionsHtml = analysis.suggestions.map((sugg, i) => `
            <div class="suggestion-card" onclick="app.applySuggestion(${i})" style="animation-delay: ${i * 0.1}s">
                <div class="suggestion-header">
                    <span class="suggestion-icon">${sugg.icon}</span>
                    <span class="suggestion-name">${sugg.name}</span>
                </div>
                <div class="suggestion-desc">${sugg.description}</div>
            </div>
        `).join('');
        
        document.getElementById('suggestions-list').innerHTML = `
            <h3 style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">Recommended Visualizations</h3>
            ${suggestionsHtml}
        `;
        
        // Populate axis selectors
        this.populateAxisSelectors(analysis);
    }
    
    populateAxisSelectors(analysis) {
        const allCols = analysis.columns;
        const numericCols = analysis.numeric_cols;
        
        const xSelect = document.getElementById('x-axis');
        const ySelect = document.getElementById('y-axis');
        const zSelect = document.getElementById('z-axis');
        const colorSelect = document.getElementById('color-by');
        const sizeSelect = document.getElementById('size-by');
        
        const createOptions = (cols) => cols.map(col => 
            `<option value="${col}">${col}</option>`
        ).join('');
        
        xSelect.innerHTML = createOptions(numericCols.length >= 3 ? numericCols : allCols);
        ySelect.innerHTML = createOptions(numericCols.length >= 2 ? numericCols.slice(1) : allCols);
        zSelect.innerHTML = createOptions(numericCols.length >= 1 ? numericCols.slice(2) : allCols);
        
        colorSelect.innerHTML = '<option value="">None</option>' + createOptions(allCols);
        sizeSelect.innerHTML = '<option value="">None</option>' + createOptions(numericCols);
        
        // Set defaults if we have enough columns
        if (numericCols.length >= 3) {
            xSelect.value = numericCols[0];
            ySelect.value = numericCols[1];
            zSelect.value = numericCols[2];
        }
    }
    
    updateAxisOptions() {
        const chartType = document.getElementById('chart-type').value;
        const axisControls = document.getElementById('axis-controls');
        
        // Show/hide axis controls based on chart type
        if (chartType === 'network') {
            axisControls.innerHTML = `
                <label>Source Node</label>
                <select id="source-node" class="select"></select>
                <label>Target Node</label>
                <select id="target-node" class="select"></select>
            `;
        } else {
            axisControls.innerHTML = `
                <label>X Axis</label>
                <select id="x-axis" class="select"></select>
                <label>Y Axis</label>
                <select id="y-axis" class="select"></select>
                <label>Z Axis</label>
                <select id="z-axis" class="select"></select>
            `;
        }
        
        // Re-populate if we have dataset info
        if (this.currentDataset) {
            this.populateAxisSelectors(this.currentDataset.analysis);
        }
    }
    
    async loadDataset(datasetId) {
        document.getElementById('loading-overlay').classList.remove('hidden');
        
        try {
            const response = await fetch(`/data/${datasetId}`);
            const result = await response.json();
            
            this.currentDataset.data = result.data;
            
            // Auto-create first visualization
            if (this.currentDataset.analysis.suggestions.length > 0) {
                this.applySuggestion(0);
            }
            
            document.getElementById('point-count').textContent = result.data.length.toLocaleString();
        } catch (error) {
            console.error('Failed to load dataset:', error);
        }
        
        document.getElementById('loading-overlay').classList.add('hidden');
    }
    
    applySuggestion(index) {
        const suggestion = this.currentDataset.analysis.suggestions[index];
        
        document.getElementById('chart-type').value = suggestion.type;
        document.getElementById('chart-label').textContent = suggestion.name;
        
        if (suggestion.axes) {
            if (suggestion.type === 'network') {
                // Handle network separately
            } else {
                if (suggestion.axes.x) document.getElementById('x-axis').value = suggestion.axes.x;
                if (suggestion.axes.y) document.getElementById('y-axis').value = suggestion.axes.y;
                if (suggestion.axes.z) document.getElementById('z-axis').value = suggestion.axes.z;
            }
        }
        
        if (suggestion.color_by) {
            document.getElementById('color-by').value = suggestion.color_by;
        }
        
        this.updateVisualization();
    }
    
    updateVisualization() {
        if (!this.currentDataset || !this.currentDataset.data) return;
        
        const chartType = document.getElementById('chart-type').value;
        const config = {
            type: chartType,
            xAxis: document.getElementById('x-axis')?.value,
            yAxis: document.getElementById('y-axis')?.value,
            zAxis: document.getElementById('z-axis')?.value,
            colorBy: document.getElementById('color-by').value,
            sizeBy: document.getElementById('size-by').value,
            colorScheme: this.colorScheme,
            showGrid: document.getElementById('show-grid').checked,
            autoRotate: document.getElementById('auto-rotate').checked
        };
        
        this.currentVisualization = config;
        
        this.visualizationEngine.render(this.currentDataset.data, config);
    }
    
    resetCamera() {
        if (this.visualizationEngine) {
            this.visualizationEngine.resetCamera();
        }
    }
}

// Global app instance
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new DataVerseApp();
});

// UI Helper Functions
function showPanel(panelName) {
    if (panelName === 'samples') {
        document.getElementById('samples-modal').classList.remove('hidden');
    } else if (panelName === 'datasets') {
        loadDatasetsList();
        document.getElementById('datasets-modal').classList.remove('hidden');
    }
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

async function loadDatasetsList() {
    try {
        const response = await fetch('/datasets');
        const result = await response.json();
        
        const listHtml = result.datasets.map(ds => `
            <div class="dataset-item" onclick="app.loadDataset('${ds.id}'); hideModal('datasets-modal')">
                <div class="dataset-info">
                    <h4>${ds.filename}</h4>
                    <div class="dataset-meta">
                        ${ds.row_count.toLocaleString()} rows • ${ds.columns.length} columns • ${new Date(ds.upload_date).toLocaleDateString()}
                    </div>
                </div>
                <span style="color: var(--accent-primary);">→</span>
            </div>
        `).join('');
        
        document.getElementById('datasets-list').innerHTML = listHtml || '<p style="text-align: center; color: var(--text-muted);">No datasets yet</p>';
    } catch (error) {
        console.error('Failed to load datasets:', error);
    }
}

async function loadSample(sampleName) {
    hideModal('samples-modal');
    document.getElementById('loading-overlay').classList.remove('hidden');
    
    try {
        const response = await fetch(`/sample/${sampleName}`);
        const result = await response.json();
        
        // Create a synthetic dataset object
        app.currentDataset = {
            id: `sample-${sampleName}`,
            data: result.data,
            analysis: {
                columns: Object.keys(result.data[0] || {}),
                numeric_cols: Object.keys(result.data[0] || {}).filter(key => 
                    typeof result.data[0][key] === 'number'
                ),
                row_count: result.data.length,
                suggestions: generateSuggestions(result.data)
            }
        };
        
        // Show analysis
        document.getElementById('analysis-panel').classList.remove('hidden');
        document.getElementById('controls-panel').classList.remove('hidden');
        document.getElementById('dataset-info').innerHTML = `
            <div class="info-row">
                <span class="info-label">Sample Dataset</span>
                <span class="info-value">${sampleName}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Rows</span>
                <span class="info-value">${result.data.length.toLocaleString()}</span>
            </div>
        `;
        
        app.populateAxisSelectors(app.currentDataset.analysis);
        
        if (app.currentDataset.analysis.suggestions.length > 0) {
            app.applySuggestion(0);
        }
        
        document.getElementById('point-count').textContent = result.data.length.toLocaleString();
    } catch (error) {
        console.error('Failed to load sample:', error);
    }
    
    document.getElementById('loading-overlay').classList.add('hidden');
}

function generateSuggestions(data) {
    if (!data || data.length === 0) return [];
    
    const cols = Object.keys(data[0]);
    const numericCols = cols.filter(col => typeof data[0][col] === 'number');
    
    const suggestions = [];
    
    if (numericCols.length >= 3) {
        suggestions.push({
            type: 'scatter3d',
            name: '3D Scatter Plot',
            description: `Visualize ${numericCols[0]}, ${numericCols[1]}, ${numericCols[2]}`,
            icon: '📊',
            axes: { x: numericCols[0], y: numericCols[1], z: numericCols[2] }
        });
    }
    
    if (numericCols.length >= 2) {
        suggestions.push({
            type: 'bar3d',
            name: '3D Bar Chart',
            description: `Compare values in 3D space`,
            icon: '📊'
        });
    }
    
    return suggestions;
}

function updateVisualization() {
    if (app) app.updateVisualization();
}

function resetCamera() {
    if (app) app.resetCamera();
}

function exportImage(format) {
    if (app && app.visualizationEngine) {
        app.visualizationEngine.exportImage(format);
    }
}

function exportVideo() {
    alert('Video export coming soon! 🎥');
}

function getShareLink() {
    const link = `${window.location.origin}/v/${Date.now()}`;
    navigator.clipboard.writeText(link);
    alert('Share link copied to clipboard! 📋');
}

function getEmbedCode() {
    const code = `<iframe src="${window.location.origin}/embed/${Date.now()}" width="100%" height="600"></iframe>`;
    navigator.clipboard.writeText(code);
    alert('Embed code copied to clipboard! 📋');
}
