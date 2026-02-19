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
        this.CELL_COL_SPAN = config.cellColSpan || 2;
        this.BITS_PER_CELL = this.CELL_COL_SPAN * 8; // 2 columns * 8 bits/column = 16 bits per cell
        this.CELL_WIDTH = this.CELL_SIZE * this.CELL_COL_SPAN;

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
        this.hoveredBitIdx = null;

        // Selection state (single row, contiguous bits)
        this.isSelecting = false;
        this.selectionStart = null;
        this.selection = null;

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
     * Update column span for each cell
     */
    setCellColSpan(span) {
        const nextSpan = Math.max(1, Math.floor(span));
        this.CELL_COL_SPAN = nextSpan;
        this.BITS_PER_CELL = this.CELL_COL_SPAN * 8;
        this.CELL_WIDTH = this.CELL_SIZE * this.CELL_COL_SPAN;
        this.hoveredCell = null;
        this.hoveredBitIdx = null;
        this.updateCellInfo(null);
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
     * Get visible world bounds based on current camera
     */
    getVisibleWorldBounds() {
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);

        return {
            left: Math.min(topLeft.x, bottomRight.x),
            right: Math.max(topLeft.x, bottomRight.x),
            top: Math.min(topLeft.y, bottomRight.y),
            bottom: Math.max(topLeft.y, bottomRight.y)
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

        const col = Math.floor(x / this.CELL_WIDTH);
        const row = Math.floor(y / this.CELL_SIZE);

        if (row >= 0 && row < this.ROWS && col >= 0 && col < this.COLS) {
            return { row, col };
        }
        return null;
    }

    /**
     * Get byte cell and bit coordinates from mouse position
     * @returns {object|null} - {row, col, bitidx} where bitidx is 0-7 (7=MSB/left, 0=LSB/right)
     */
    getCellAndBitFromMouse(event) {
        const rect = this.canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        // Convert to world coordinates
        const world = this.screenToWorld(screenX, screenY);
        const x = world.x;
        const y = world.y;

        const col = Math.floor(x / this.CELL_WIDTH);
        const row = Math.floor(y / this.CELL_SIZE);

        if (row >= 0 && row < this.ROWS && col >= 0 && col < this.COLS) {
            // Calculate bit position within the cell
            const xInCell = x - col * this.CELL_WIDTH;
            const bitWidth = this.CELL_WIDTH / this.BITS_PER_CELL;
            const bitidx = (this.BITS_PER_CELL - 1) - Math.floor(xInCell / bitWidth); // MSB (left) to LSB (right)

            return { row, col, bitidx };
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
            return;
        }

        // Start selection with left mouse button
        if (event.button === 0) {
            const cellAndBit = this.getCellAndBitFromMouse(event);
            if (cellAndBit) {
                const bitPosFromLeft = (this.BITS_PER_CELL - 1) - cellAndBit.bitidx;
                this.isSelecting = true;
                this.selectionStart = cellAndBit;
                this.selection = {
                    row: cellAndBit.row,
                    startBit: cellAndBit.col * this.BITS_PER_CELL + bitPosFromLeft,
                    endBit: cellAndBit.col * this.BITS_PER_CELL + bitPosFromLeft
                };
                this.drawGrid();
            }
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

        // Handle selection drag
        if (this.isSelecting && this.selectionStart) {
            const cellAndBit = this.getCellAndBitFromMouse(event);
            if (cellAndBit && cellAndBit.row === this.selectionStart.row) {
                const startFromLeft = (this.BITS_PER_CELL - 1) - this.selectionStart.bitidx;
                const endFromLeft = (this.BITS_PER_CELL - 1) - cellAndBit.bitidx;
                const start = this.selectionStart.col * this.BITS_PER_CELL + startFromLeft;
                const end = cellAndBit.col * this.BITS_PER_CELL + endFromLeft;
                this.selection = {
                    row: this.selectionStart.row,
                    startBit: Math.min(start, end),
                    endBit: Math.max(start, end)
                };
                this.drawGrid();
            }
            return;
        }

        // Get cell under mouse
        const cell = this.getCellFromMouse(event);
        const cellAndBit = this.getCellAndBitFromMouse(event);

        // Check if hovered cell or bit index changed
        const cellChanged = cell && (!this.hoveredCell ||
            cell.row !== this.hoveredCell.row ||
            cell.col !== this.hoveredCell.col);

        const bitChanged = cellAndBit && cellAndBit.bitidx !== this.hoveredBitIdx;

        if (cell && (cellChanged || bitChanged)) {
            this.hoveredCell = cell;
            this.hoveredBitIdx = cellAndBit ? cellAndBit.bitidx : null;

            // Dispatch custom event with cell coordinates
            const cellEvent = new CustomEvent('cellhover', {
                detail: {
                    row: cell.row,
                    col: cell.col,
                    index: cell.row * this.COLS + cell.col,
                    bitidx: cellAndBit ? cellAndBit.bitidx : null
                }
            });
            this.canvas.dispatchEvent(cellEvent);

            // Update UI
            this.updateCellInfo(cellAndBit || cell);
            this.drawGrid();
        } else if (!cell && this.hoveredCell) {
            this.hoveredCell = null;
            this.hoveredBitIdx = null;
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

        if (this.isSelecting) {
            this.isSelecting = false;
            this.selectionStart = null;
        }
    }

    /**
     * HandlehoveredBitIdx = null;
        this. mouse leave event
     */
    handleMouseLeave(event) {
        this.isPanning = false;
        this.isSelecting = false;
        this.selectionStart = null;
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
                let text = `Cell: Row ${cell.row}, Col ${cell.col} (Index: ${index})`;
                if (cell.bitidx !== undefined && cell.bitidx !== null) {
                    text += ` | Bit: ${cell.bitidx}`;
                }
                cellInfo.textContent = text;
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

        const bounds = this.getVisibleWorldBounds();
        const startCol = Math.max(0, Math.floor(bounds.left / this.CELL_WIDTH));
        const endCol = Math.min(this.COLS - 1, Math.ceil(bounds.right / this.CELL_WIDTH));
        const startRow = Math.max(0, Math.floor(bounds.top / this.CELL_SIZE));
        const endRow = Math.min(this.ROWS - 1, Math.ceil(bounds.bottom / this.CELL_SIZE));

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
        this.ctx.clip();

        let hoveredRect = null;

        // Draw cells
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const x = col * this.CELL_WIDTH;
                const y = row * this.CELL_SIZE;

                // Fill cell
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(x, y, this.CELL_WIDTH, this.CELL_SIZE);

                // Highlight hovered cell with border
                if (this.hoveredCell &&
                    this.hoveredCell.row === row &&
                    this.hoveredCell.col === col) {
                    hoveredRect = { x, y };
                }
            }
        }

        // Draw grid lines
        this.ctx.beginPath();

        for (let col = startCol; col <= endCol + 1; col++) {
            const x = col * this.CELL_WIDTH;
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.ROWS * this.CELL_SIZE);
        }

        this.ctx.lineWidth = 3 * this.LINE_WIDTH / this.cameraZoom;
        this.ctx.strokeStyle = '#04003d';
        this.ctx.stroke();

        for (let row = startRow; row <= endRow + 1; row++) {
            const y = row * this.CELL_SIZE;
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.COLS * this.CELL_WIDTH, y);
        }

        this.ctx.lineWidth = this.LINE_WIDTH / this.cameraZoom;
        this.ctx.strokeStyle = '#b4b4b4';
        this.ctx.stroke();



        // Draw grid outline
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2 / this.cameraZoom;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(this.COLS * this.CELL_WIDTH, 0);
        this.ctx.lineTo(this.COLS * this.CELL_WIDTH, this.ROWS * this.CELL_SIZE);
        this.ctx.lineTo(0, this.ROWS * this.CELL_SIZE);
        this.ctx.closePath();
        this.ctx.stroke();

        this.ctx.restore();

        // Draw row and column labels when zoomed in enough
        if (this.cameraZoom >= 0.5) {
            this.drawLabels();
        }

        // Draw bit grid when zoomed in close
        if (this.cameraZoom > 3) {
            this.drawBitGrid();
        }

        if (hoveredRect) {
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 2 / this.cameraZoom;
            this.ctx.strokeRect(hoveredRect.x, hoveredRect.y, this.CELL_WIDTH, this.CELL_SIZE);
        }


    }

    /**
     * Draw bit grid within cells (8 bits per byte)
     */
    drawBitGrid() {
        this.ctx.strokeStyle = 'rgb(189, 189, 189)';
        this.ctx.lineWidth = 1 / this.cameraZoom;

        const bounds = this.getVisibleWorldBounds();
        const startCol = Math.max(0, Math.floor(bounds.left / this.CELL_WIDTH));
        const endCol = Math.min(this.COLS - 1, Math.ceil(bounds.right / this.CELL_WIDTH));
        const startRow = Math.max(0, Math.floor(bounds.top / this.CELL_SIZE));
        const endRow = Math.min(this.ROWS - 1, Math.ceil(bounds.bottom / this.CELL_SIZE));

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const cellX = col * this.CELL_WIDTH;
                const cellY = row * this.CELL_SIZE;
                const bitWidth = this.CELL_WIDTH / this.BITS_PER_CELL;

                // Fill selected bits (single row, contiguous)
                if (this.selection && this.selection.row === row) {
                    const rowStartBit = col * this.BITS_PER_CELL;
                    const rowEndBit = rowStartBit + this.BITS_PER_CELL - 1;
                    const selStart = Math.max(this.selection.startBit, rowStartBit);
                    const selEnd = Math.min(this.selection.endBit, rowEndBit);
                    if (selStart <= selEnd) {
                        this.ctx.fillStyle = 'rgba(33, 150, 243, 0.35)';
                        for (let bit = selStart; bit <= selEnd; bit++) {
                            const bitInCell = bit - rowStartBit;
                            const bitX = cellX + bitInCell * bitWidth;
                            this.ctx.fillRect(bitX, cellY, bitWidth, this.CELL_SIZE);
                        }
                    }
                }

                // Draw bit rectangles within each cell
                for (let bit = 0; bit < this.BITS_PER_CELL; bit++) {
                    const bitX = cellX + bit * bitWidth;

                    // Draw rectangle for each bit
                    this.ctx.strokeRect(bitX, cellY, bitWidth, this.CELL_SIZE);
                }

                // Draw bit numbers when zoomed in very close
                if (this.cameraZoom >= 6) {
                    this.ctx.fillStyle = '#414141';
                    this.ctx.font = `${Math.floor(bitWidth * 0.5)}px monospace`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';

                    for (let bit = 0; bit < this.BITS_PER_CELL; bit++) {
                        const bitX = cellX + bit * bitWidth + bitWidth / 2;
                        const bitY = cellY + this.CELL_SIZE / 2;
                        // MSB on left, LSB on right
                        this.ctx.fillText(((this.BITS_PER_CELL - 1) - bit).toString(), bitX, bitY);
                    }
                }
            }
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
            const x = col * this.CELL_WIDTH + this.CELL_WIDTH / 2;
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
