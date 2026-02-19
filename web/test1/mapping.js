/**
 * GridCanvas - A 32x64 grid with camera controls and cell hover events
 */
class GridCanvas {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }

        this.ctx = this.canvas.getContext('2d');

        // Grid configuration
        this.COLS = config.cols || 32;
        this.ROWS = config.rows || 64;
        this.CELL_SIZE = config.cellSize || 20;
        this.LINE_WIDTH = 1;

        // Camera state
        this.cameraZoom = 1.0;
        this.cameraOffsetX = 0;
        this.cameraOffsetY = 0;
        this.MIN_ZOOM = 0.1;
        this.MAX_ZOOM = 10;
        this.ZOOM_SENSITIVITY = 0.001;

        // Panning state
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.lastPanX = 0;
        this.lastPanY = 0;

        // Current hovered cell
        this.hoveredCell = null;

        // Bind event handlers
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);

        // Setup event listeners
        this.setupEventListeners();

        // Initial draw
        this.drawGrid();
    }

    /**
     * Setup canvas event listeners
     */
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.cameraOffsetX) / this.cameraZoom,
            y: (screenY - this.cameraOffsetY) / this.cameraZoom
        };
    }

    /**
     * Get cell coordinates from mouse position
     */
    getCellFromMouse(event) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;
        
        // Convert to world coordinates
        const world = this.screenToWorld(screenX, screenY);
        const x = world.x;
        const y = world.y;

        const col = Math.floor(x / this.CELL_SIZE);
        const row = Math.floor(y / this.CELL_SIZE);

        if (row >= 0 && row < this.ROWS && col >= 0 && col < this.COLS) {
            return { row, col };
        }
        return null;
    }

    /**
     * Handle mouse down event
     */
    handleMouseDown(event) {
        // Handle panning with middle mouse button or shift+left click
        if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
            event.preventDefault();
            this.isPanning = true;
            this.panStartX = event.clientX;
            this.panStartY = event.clientY;
            this.lastPanX = this.cameraOffsetX;
            this.lastPanY = this.cameraOffsetY;
            this.canvas.style.cursor = 'grabbing';
        }
    }

    /**
     * Handle mouse move event
     */
    handleMouseMove(event) {
        // Handle panning
        if (this.isPanning) {
            const deltaX = event.clientX - this.panStartX;
            const deltaY = event.clientY - this.panStartY;
            this.cameraOffsetX = this.lastPanX + deltaX;
            this.cameraOffsetY = this.lastPanY + deltaY;
            this.drawGrid();
            return;
        }

        // Get cell under mouse
        const cell = this.getCellFromMouse(event);
        
        // Check if hovered cell changed
        if (cell && (!this.hoveredCell || 
            cell.row !== this.hoveredCell.row || 
            cell.col !== this.hoveredCell.col)) {
            
            this.hoveredCell = cell;
            
            // Dispatch custom event with cell coordinates
            const cellEvent = new CustomEvent('cellhover', {
                detail: {
                    row: cell.row,
                    col: cell.col,
                    index: cell.row * this.COLS + cell.col
                }
            });
            this.canvas.dispatchEvent(cellEvent);
            
            // Update UI
            this.updateCellInfo(cell);
            this.drawGrid();
        } else if (!cell && this.hoveredCell) {
            this.hoveredCell = null;
            this.updateCellInfo(null);
            this.drawGrid();
        }
    }

    /**
     * Handle mouse up event
     */
    handleMouseUp(event) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'grab';
        }
    }

    /**
     * Handle mouse leave event
     */
    handleMouseLeave(event) {
        this.isPanning = false;
        this.hoveredCell = null;
        this.updateCellInfo(null);
        this.canvas.style.cursor = 'grab';
        this.drawGrid();
    }

    /**
     * Handle wheel event for zooming
     */
    handleWheel(event) {
        event.preventDefault();
        
        // Get mouse position before zoom
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Calculate world position before zoom
        const worldBeforeZoom = this.screenToWorld(mouseX, mouseY);
        
        // Update zoom
        const zoomAmount = -event.deltaY * this.ZOOM_SENSITIVITY;
        const newZoom = this.cameraZoom * Math.exp(zoomAmount);
        this.cameraZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, newZoom));
        
        // Calculate world position after zoom
        const worldAfterZoom = this.screenToWorld(mouseX, mouseY);
        
        // Adjust offset to keep the same point under the mouse
        this.cameraOffsetX += (worldAfterZoom.x - worldBeforeZoom.x) * this.cameraZoom;
        this.cameraOffsetY += (worldAfterZoom.y - worldBeforeZoom.y) * this.cameraZoom;
        
        // Update zoom display
        this.updateZoomLevel();
        
        // Redraw
        this.drawGrid();
    }

    /**
     * Update cell info display
     */
    updateCellInfo(cell) {
        const cellInfo = document.getElementById('cellInfo');
        if (cellInfo) {
            if (cell) {
                const index = cell.row * this.COLS + cell.col;
                cellInfo.textContent = `Cell: Row ${cell.row}, Col ${cell.col} (Index: ${index})`;
            } else {
                cellInfo.textContent = 'Cell: (hover over grid)';
            }
        }
    }

    /**
     * Update zoom level display
     */
    updateZoomLevel() {
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = `Zoom: ${this.cameraZoom.toFixed(2)}x`;
        }
    }

    /**
     * Draw the grid
     */
    drawGrid() {
        // Clear entire canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply camera transform
        this.ctx.setTransform(
            this.cameraZoom, 0,
            0, this.cameraZoom,
            this.cameraOffsetX, this.cameraOffsetY
        );

        // Draw cells
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const x = col * this.CELL_SIZE;
                const y = row * this.CELL_SIZE;

                // Determine cell color
                let fillColor = '#ffffff';
                
                // Highlight hovered cell
                if (this.hoveredCell && 
                    this.hoveredCell.row === row && 
                    this.hoveredCell.col === col) {
                    fillColor = '#2196F3';
                }

                // Fill cell
                this.ctx.fillStyle = fillColor;
                this.ctx.fillRect(x, y, this.CELL_SIZE, this.CELL_SIZE);

                // Draw cell border
                this.ctx.strokeStyle = '#cccccc';
                this.ctx.lineWidth = this.LINE_WIDTH / this.cameraZoom;
                this.ctx.strokeRect(x, y, this.CELL_SIZE, this.CELL_SIZE);
            }
        }

        // Draw grid outline
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2 / this.cameraZoom;
        this.ctx.strokeRect(0, 0, this.COLS * this.CELL_SIZE, this.ROWS * this.CELL_SIZE);

        // Draw row and column labels when zoomed in enough
        if (this.cameraZoom >= 0.5) {
            this.drawLabels();
        }
    }

    /**
     * Draw row and column labels
     */
    drawLabels() {
        this.ctx.fillStyle = '#666666';
        const fontSize = Math.max(8, Math.min(12, this.CELL_SIZE * 0.5));
        this.ctx.font = `${fontSize / this.cameraZoom}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Draw column labels (only every nth column when zoomed out)
        const colStep = this.cameraZoom < 1 ? Math.ceil(4 / this.cameraZoom) : 1;
        for (let col = 0; col < this.COLS; col += colStep) {
            const x = col * this.CELL_SIZE + this.CELL_SIZE / 2;
            const y = -5 / this.cameraZoom;
            this.ctx.fillText(col.toString(), x, y);
        }

        // Draw row labels (only every nth row when zoomed out)
        const rowStep = this.cameraZoom < 1 ? Math.ceil(4 / this.cameraZoom) : 1;
        this.ctx.textAlign = 'right';
        for (let row = 0; row < this.ROWS; row += rowStep) {
            const x = -5 / this.cameraZoom;
            const y = row * this.CELL_SIZE + this.CELL_SIZE / 2;
            this.ctx.fillText(row.toString(), x, y);
        }
    }

    /**
     * Reset camera to default position and zoom
     */
    resetCamera() {
        this.cameraZoom = 1.0;
        this.cameraOffsetX = 0;
        this.cameraOffsetY = 0;
        this.updateZoomLevel();
        this.drawGrid();
    }

    /**
     * Zoom by a factor
     */
    zoom(factor) {
        // Zoom towards center of canvas
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const worldBefore = this.screenToWorld(centerX, centerY);
        
        this.cameraZoom *= factor;
        this.cameraZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.cameraZoom));
        
        const worldAfter = this.screenToWorld(centerX, centerY);
        
        this.cameraOffsetX += (worldAfter.x - worldBefore.x) * this.cameraZoom;
        this.cameraOffsetY += (worldAfter.y - worldBefore.y) * this.cameraZoom;
        
        this.updateZoomLevel();
        this.drawGrid();
    }
}
