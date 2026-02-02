// DataVerse - 3D Visualization Engine (Three.js)

class VisualizationEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.animationId = null;
        this.objects = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredObject = null;
        
        this.init();
    }
    
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);
        
        // Camera
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(15, 15, 15);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x0a0a0f, 1);
        
        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 100;
        
        // Lighting
        this.setupLighting();
        
        // Event listeners
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.onClick(e));
        
        // Start render loop
        this.animate();
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
        
        const pointLight1 = new THREE.PointLight(0x00f5ff, 0.5, 50);
        pointLight1.position.set(-10, 10, -10);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xff00ff, 0.5, 50);
        pointLight2.position.set(10, -10, 10);
        this.scene.add(pointLight2);
    }
    
    clearScene() {
        // Remove all objects except lights
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            const obj = this.scene.children[i];
            if (obj.type !== 'AmbientLight' && obj.type !== 'DirectionalLight' && obj.type !== 'PointLight') {
                this.scene.remove(obj);
            }
        }
        this.objects = [];
    }
    
    render(data, config) {
        this.clearScene();
        
        if (config.showGrid) {
            this.addGrid();
        }
        
        switch (config.type) {
            case 'scatter3d':
                this.renderScatter3D(data, config);
                break;
            case 'bar3d':
                this.renderBar3D(data, config);
                break;
            case 'surface':
                this.renderSurface(data, config);
                break;
            case 'network':
                this.renderNetwork(data, config);
                break;
            case 'timeseries3d':
                this.renderTimeSeries3D(data, config);
                break;
            default:
                this.renderScatter3D(data, config);
        }
        
        // Auto-rotate if enabled
        this.controls.autoRotate = config.autoRotate || false;
    }
    
    renderScatter3D(data, config) {
        const xCol = config.xAxis || Object.keys(data[0])[0];
        const yCol = config.yAxis || Object.keys(data[0])[1];
        const zCol = config.zAxis || Object.keys(data[0])[2];
        const colorCol = config.colorBy;
        const sizeCol = config.sizeBy;
        
        // Get ranges for normalization
        const xValues = data.map(d => this.parseValue(d[xCol]));
        const yValues = data.map(d => this.parseValue(d[yCol]));
        const zValues = data.map(d => this.parseValue(d[zCol]));
        
        const xRange = this.getRange(xValues);
        const yRange = this.getRange(yValues);
        const zRange = this.getRange(zValues);
        
        const colorValues = colorCol ? data.map(d => this.parseValue(d[colorCol])) : null;
        const colorRange = colorValues ? this.getRange(colorValues) : null;
        
        const sizeValues = sizeCol ? data.map(d => this.parseValue(d[sizeCol])) : null;
        const sizeRange = sizeValues ? this.getRange(sizeValues) : null;
        
        // Create points
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];
        
        const colorPalette = this.getColorPalette(config.colorScheme);
        
        data.forEach((d, i) => {
            const x = this.normalize(this.parseValue(d[xCol]), xRange, -10, 10);
            const y = this.normalize(this.parseValue(d[yCol]), yRange, -10, 10);
            const z = this.normalize(this.parseValue(d[zCol]), zRange, -10, 10);
            
            positions.push(x, y, z);
            
            // Color
            let color;
            if (colorCol && colorRange) {
                const t = this.normalize(this.parseValue(d[colorCol]), colorRange, 0, 1);
                color = this.interpolateColor(colorPalette[0], colorPalette[1], t);
            } else {
                color = new THREE.Color(colorPalette[0]);
            }
            colors.push(color.r, color.g, color.b);
            
            // Size
            const size = sizeCol && sizeRange 
                ? this.normalize(this.parseValue(d[sizeCol]), sizeRange, 0.1, 0.5)
                : 0.2;
            sizes.push(size);
        });
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        // Material
        const material = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });
        
        const points = new THREE.Points(geometry, material);
        points.userData = { type: 'scatter', data: data, config: config };
        this.scene.add(points);
        this.objects.push(points);
        
        // Add individual spheres for better interactivity
        data.forEach((d, i) => {
            const x = this.normalize(this.parseValue(d[xCol]), xRange, -10, 10);
            const y = this.normalize(this.parseValue(d[yCol]), yRange, -10, 10);
            const z = this.normalize(this.parseValue(d[zCol]), zRange, -10, 10);
            
            const size = sizeCol && sizeRange 
                ? this.normalize(this.parseValue(d[sizeCol]), sizeRange, 0.1, 0.5)
                : 0.15;
            
            const sphereGeo = new THREE.SphereGeometry(size, 16, 16);
            let color;
            if (colorCol && colorRange) {
                const t = this.normalize(this.parseValue(d[colorCol]), colorRange, 0, 1);
                color = this.interpolateColor(colorPalette[0], colorPalette[1], t);
            } else {
                color = new THREE.Color(colorPalette[0]);
            }
            
            const sphereMat = new THREE.MeshPhongMaterial({
                color: color,
                transparent: true,
                opacity: 0.8,
                emissive: color,
                emissiveIntensity: 0.2
            });
            
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.set(x, y, z);
            sphere.userData = { 
                type: 'dataPoint', 
                data: d, 
                index: i,
                originalColor: color.clone()
            };
            this.scene.add(sphere);
            this.objects.push(sphere);
        });
    }
    
    renderBar3D(data, config) {
        const xCol = config.xAxis || Object.keys(data[0])[0];
        const yCol = config.yAxis || Object.keys(data[0])[1];
        const zCol = config.zAxis || Object.keys(data[0])[2];
        
        const xValues = data.map(d => this.parseValue(d[xCol]));
        const yValues = data.map(d => this.parseValue(d[yCol]));
        const zValues = data.map(d => this.parseValue(d[zCol]));
        
        const xRange = this.getRange(xValues);
        const yRange = this.getRange(yValues);
        const zRange = this.getRange(zValues);
        
        const colorPalette = this.getColorPalette(config.colorScheme);
        
        // Limit bars for performance
        const maxBars = Math.min(data.length, 100);
        const step = Math.ceil(data.length / maxBars);
        
        for (let i = 0; i < data.length; i += step) {
            const d = data[i];
            const x = this.normalize(this.parseValue(d[xCol]), xRange, -10, 10);
            const y = this.normalize(this.parseValue(d[yCol]), yRange, -10, 10);
            const z = this.normalize(this.parseValue(d[zCol]), zRange, -10, 10);
            
            const height = Math.abs(z) + 0.5;
            const geometry = new THREE.BoxGeometry(0.4, height, 0.4);
            
            const t = i / data.length;
            const color = this.interpolateColor(colorPalette[0], colorPalette[1], t);
            
            const material = new THREE.MeshPhongMaterial({
                color: color,
                transparent: true,
                opacity: 0.85,
                emissive: color,
                emissiveIntensity: 0.1
            });
            
            const bar = new THREE.Mesh(geometry, material);
            bar.position.set(x, y, z / 2);
            bar.userData = { type: 'bar', data: d, index: i };
            this.scene.add(bar);
            this.objects.push(bar);
        }
    }
    
    renderSurface(data, config) {
        // Create a surface from data points
        const xCol = config.xAxis || Object.keys(data[0])[0];
        const yCol = config.yAxis || Object.keys(data[0])[1];
        const zCol = config.zAxis || Object.keys(data[0])[2];
        
        const xValues = data.map(d => this.parseValue(d[xCol]));
        const zValues = data.map(d => this.parseValue(d[zCol]));
        
        const xRange = this.getRange(xValues);
        const zRange = this.getRange(zValues);
        
        // Create grid
        const segments = 50;
        const geometry = new THREE.PlaneGeometry(20, 20, segments, segments);
        
        const positions = geometry.attributes.position.array;
        const colors = [];
        
        const colorPalette = this.getColorPalette(config.colorScheme);
        
        // Generate height map from data
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            
            // Find nearest data point or interpolate
            let height = 0;
            let minDist = Infinity;
            
            data.forEach(d => {
                const dx = this.normalize(this.parseValue(d[xCol]), xRange, -10, 10) - x;
                const dz = this.normalize(this.parseValue(d[zCol]), zRange, -10, 10) - y;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < minDist) {
                    minDist = dist;
                    const yCol = config.yAxis || Object.keys(data[0])[1];
                    const yRange = this.getRange(data.map(d => this.parseValue(d[yCol])));
                    height = this.normalize(this.parseValue(d[yCol]), yRange, -5, 5);
                }
            });
            
            positions[i + 2] = height;
            
            // Color based on height
            const t = (height + 5) / 10;
            const color = this.interpolateColor(colorPalette[0], colorPalette[1], t);
            colors.push(color.r, color.g, color.b);
        }
        
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            wireframe: false
        });
        
        const surface = new THREE.Mesh(geometry, material);
        surface.rotation.x = -Math.PI / 2;
        surface.userData = { type: 'surface' };
        this.scene.add(surface);
        this.objects.push(surface);
        
        // Add wireframe overlay
        const wireframeMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0.1
        });
        const wireframe = new THREE.Mesh(geometry.clone(), wireframeMat);
        wireframe.rotation.x = -Math.PI / 2;
        this.scene.add(wireframe);
    }
    
    renderNetwork(data, config) {
        // Create network graph visualization
        const nodes = [];
        const links = [];
        
        // Extract unique nodes
        const nodeSet = new Set();
        data.forEach(d => {
            Object.values(d).forEach(val => {
                if (typeof val === 'string' || typeof val === 'number') {
                    nodeSet.add(String(val));
                }
            });
        });
        
        const nodeArray = Array.from(nodeSet).slice(0, 50); // Limit nodes
        
        // Create node positions (sphere layout)
        const radius = 8;
        nodeArray.forEach((node, i) => {
            const phi = Math.acos(-1 + (2 * i) / nodeArray.length);
            const theta = Math.sqrt(nodeArray.length * Math.PI) * phi;
            
            nodes.push({
                id: node,
                x: radius * Math.cos(theta) * Math.sin(phi),
                y: radius * Math.sin(theta) * Math.sin(phi),
                z: radius * Math.cos(phi)
            });
        });
        
        const colorPalette = this.getColorPalette(config.colorScheme);
        
        // Draw nodes
        nodes.forEach((node, i) => {
            const geometry = new THREE.SphereGeometry(0.3, 16, 16);
            const t = i / nodes.length;
            const color = this.interpolateColor(colorPalette[0], colorPalette[1], t);
            
            const material = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.3
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(node.x, node.y, node.z);
            sphere.userData = { type: 'node', data: node };
            this.scene.add(sphere);
            this.objects.push(sphere);
        });
        
        // Draw connections (links between related nodes)
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                if (Math.random() > 0.9) { // Sparse connections
                    const geometry = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(nodes[i].x, nodes[i].y, nodes[i].z),
                        new THREE.Vector3(nodes[j].x, nodes[j].y, nodes[j].z)
                    ]);
                    
                    const material = new THREE.LineBasicMaterial({
                        color: 0x444444,
                        transparent: true,
                        opacity: 0.3
                    });
                    
                    const line = new THREE.Line(geometry, material);
                    this.scene.add(line);
                }
            }
        }
    }
    
    renderTimeSeries3D(data, config) {
        // Time series visualized as a 3D ribbon/trajectory
        const timeCol = config.xAxis || Object.keys(data[0])[0];
        const yCol = config.yAxis || Object.keys(data[0])[1];
        const zCol = config.zAxis || Object.keys(data[0])[2];
        
        // Sort by time
        const sortedData = [...data].sort((a, b) => {
            return new Date(a[timeCol]) - new Date(b[timeCol]);
        });
        
        const yValues = sortedData.map(d => this.parseValue(d[yCol]));
        const zValues = sortedData.map(d => this.parseValue(d[zCol]));
        
        const yRange = this.getRange(yValues);
        const zRange = this.getRange(zValues);
        
        const points = [];
        const colors = [];
        const colorPalette = this.getColorPalette(config.colorScheme);
        
        sortedData.forEach((d, i) => {
            const t = (i / sortedData.length) * 20 - 10; // Time on X axis
            const y = this.normalize(this.parseValue(d[yCol]), yRange, -10, 10);
            const z = this.normalize(this.parseValue(d[zCol]), zRange, -10, 10);
            
            points.push(new THREE.Vector3(t, y, z));
            
            const colorT = i / sortedData.length;
            const color = this.interpolateColor(colorPalette[0], colorPalette[1], colorT);
            colors.push(color.r, color.g, color.b);
        });
        
        // Create trajectory line
        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(curve, Math.min(points.length, 200), 0.1, 8, false);
        
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(colorPalette[0]),
            emissive: new THREE.Color(colorPalette[1]),
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.9
        });
        
        const tube = new THREE.Mesh(geometry, material);
        tube.userData = { type: 'timeseries', data: sortedData };
        this.scene.add(tube);
        this.objects.push(tube);
        
        // Add data points along the line
        points.forEach((p, i) => {
            if (i % 10 === 0) { // Every 10th point
                const sphereGeo = new THREE.SphereGeometry(0.15, 12, 12);
                const t = i / points.length;
                const color = this.interpolateColor(colorPalette[0], colorPalette[1], t);
                
                const sphereMat = new THREE.MeshPhongMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.4
                });
                
                const sphere = new THREE.Mesh(sphereGeo, sphereMat);
                sphere.position.copy(p);
                sphere.userData = { type: 'timePoint', data: sortedData[i], index: i };
                this.scene.add(sphere);
                this.objects.push(sphere);
            }
        });
    }
    
    addGrid() {
        const gridHelper = new THREE.GridHelper(20, 20, 0x333333, 0x222222);
        gridHelper.position.y = -10;
        this.scene.add(gridHelper);
        
        // Add axis labels
        const axesHelper = new THREE.AxesHelper(12);
        this.scene.add(axesHelper);
    }
    
    // Utility functions
    parseValue(val) {
        if (typeof val === 'number') return val;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    }
    
    getRange(values) {
        const valid = values.filter(v => !isNaN(v));
        return {
            min: Math.min(...valid),
            max: Math.max(...valid)
        };
    }
    
    normalize(value, range, newMin, newMax) {
        if (range.max === range.min) return (newMin + newMax) / 2;
        return newMin + (value - range.min) * (newMax - newMin) / (range.max - range.min);
    }
    
    getColorPalette(scheme) {
        const palettes = {
            neon: [0x00f5ff, 0xff00ff],
            fire: [0xff4500, 0xffff00],
            ocean: [0x0066ff, 0x00ffff],
            forest: [0x00ff00, 0x66ff00],
            purple: [0x8b5cf6, 0xec4899]
        };
        return palettes[scheme] || palettes.neon;
    }
    
    interpolateColor(color1, color2, t) {
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);
        return c1.lerp(c2, t);
    }
    
    // Event handlers
    onMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.objects);
        
        const tooltip = document.getElementById('tooltip');
        
        if (intersects.length > 0) {
            const obj = intersects[0].object;
            
            if (obj.userData.type === 'dataPoint' || obj.userData.type === 'bar' || 
                obj.userData.type === 'node' || obj.userData.type === 'timePoint') {
                
                // Highlight
                if (this.hoveredObject && this.hoveredObject !== obj) {
                    this.hoveredObject.material.emissiveIntensity = 0.2;
                }
                obj.material.emissiveIntensity = 0.6;
                this.hoveredObject = obj;
                
                // Show tooltip
                tooltip.classList.remove('hidden');
                tooltip.style.left = event.clientX + 15 + 'px';
                tooltip.style.top = event.clientY + 15 + 'px';
                
                const data = obj.userData.data;
                tooltip.innerHTML = Object.entries(data)
                    .slice(0, 6)
                    .map(([key, val]) => `
                        <div class="tooltip-row">
                            <span class="tooltip-label">${key}:</span>
                            <span class="tooltip-value">${val}</span>
                        </div>
                    `).join('');
            }
        } else {
            if (this.hoveredObject) {
                this.hoveredObject.material.emissiveIntensity = 0.2;
                this.hoveredObject = null;
            }
            tooltip.classList.add('hidden');
        }
    }
    
    onClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.objects);
        
        if (intersects.length > 0) {
            const obj = intersects[0].object;
            console.log('Clicked:', obj.userData);
        }
    }
    
    // Animation loop
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        
        // Pulse effect for data points
        const time = Date.now() * 0.001;
        this.objects.forEach((obj, i) => {
            if (obj.userData.type === 'dataPoint' || obj.userData.type === 'node') {
                const scale = 1 + Math.sin(time * 2 + i * 0.1) * 0.1;
                obj.scale.setScalar(scale);
            }
        });
        
        this.renderer.render(this.scene, this.camera);
    }
    
    handleResize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    resetCamera() {
        this.camera.position.set(15, 15, 15);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
    }
    
    exportImage(format) {
        this.renderer.render(this.scene, this.camera);
        const dataURL = this.renderer.domElement.toDataURL(`image/${format === 'svg' ? 'png' : format}`);
        
        const link = document.createElement('a');
        link.download = `dataverse-export.${format}`;
        link.href = dataURL;
        link.click();
    }
}
