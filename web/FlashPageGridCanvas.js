/**
 * FlashPageGridCanvas - A visual grid representation of MCU flash page memory
 * Displays parameters mapped to memory locations with interactive selection
 */
class FlashPageGridCanvas {
    /**
     * Find the nearest power of 2 to a given value
     * @param {number} value - The value to find nearest power of 2 to
     * @param {number} max - Maximum allowed value (e.g., 2048)
     * @returns {number} - The nearest power of 2
     */
    static findNearestPowerOf2(value, max = 2048) {
        if (value <= 1) return 1;
        if (value >= max) return max;

        // Find the power of 2 that is closest
        const log = Math.log2(value);
        const lower = Math.pow(2, Math.floor(log));
        const upper = Math.pow(2, Math.ceil(log));

        // Return the closest one
        const lowerDiff = Math.abs(value - lower);
        const upperDiff = Math.abs(value - upper);

        return lowerDiff <= upperDiff ? lower : upper;
    }

    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }

        this.ctx = this.canvas.getContext('2d');

        // Total page size constraint
        this.PAGE_SIZE = 2048;
        this.PAGE_MASK = this.PAGE_SIZE - 1; // 0x7FF for 2048 byte page

        // Grid configuration
        this.COLS = config.cols || 32;
        this.ROWS = config.rows || 64;
        this.CELL_SIZE = config.cellSize || 20;
        this.LINE_WIDTH = config.lineWidth || 1;
        this.PAGE_BASE_ADDRESS = config.pageBaseAddress || 0x08003000;
        this.API_REQPATH_SELECT = config.apiPath || 'api/select.php';
        this.LEFT_MARGIN = 100; // Space for row address labels
        this.ALIGNMENT_GRID = 4; // Default alignment in bytes (0 = off)

        // Ensure grid dimensions multiply to PAGE_SIZE
        this.validateGridSize();


        // Canvas dimensions
        this.canvas.width = this.LEFT_MARGIN + (this.COLS * this.CELL_SIZE + this.LINE_WIDTH);
        this.canvas.height = (this.ROWS * this.CELL_SIZE + this.LINE_WIDTH);

        // State
        this.parameters = [];
        this.selectionMode = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.isDragging = false;
        this.hoveredParameter = null;

        // Camera state
        this.cameraZoom = 1.0;
        this.cameraOffsetX = 0;
        this.cameraOffsetY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.lastPanX = 0;
        this.lastPanY = 0;
        this.MIN_ZOOM = 0.25;
        this.ZOOM_SENSITIVITY = 0.001;

        // Parameter dragging state
        this.isDraggingParameter = false;
        this.draggedParameter = null;
        this.draggedParameterOriginalOffset = null;
        this.dragCurrentCell = null;

        // Track parameters with unsaved changes
        this.modifiedParameters = new Map(); // paramId -> {originalOffset, originalAddress}

        // Color palette for parameters
        this.PARAM_COLORS = [
            '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF',
            '#FFD4BA', '#E0BBE4', '#FFDFD3', '#C7CEEA', '#D4F1F4'
        ];

        // Bind event handlers
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleWheel = this.handleWheel.bind(this);

        // Setup event listeners
        this.setupEventListeners();
        this.setupGridSizeControls();
        this.setupAlignmentControl();
    }

    /**
     * Validate and adjust grid size to ensure ROWS * COLS = PAGE_SIZE
     */
    validateGridSize() {
        const total = this.ROWS * this.COLS;
        if (total !== this.PAGE_SIZE) {
            // Adjust rows to match page size
            this.ROWS = this.PAGE_SIZE / this.COLS;
        }
    }

    /**
     * Update grid dimensions and resize canvas
     */
    updateGridSize(newCols, newRows) {
        this.COLS = newCols;
        this.ROWS = newRows;

        // Update canvas dimensions
        this.canvas.width = this.LEFT_MARGIN + (this.COLS * this.CELL_SIZE + this.LINE_WIDTH);
        this.canvas.height = (this.ROWS * this.CELL_SIZE + this.LINE_WIDTH);

        // Update total display
        const totalDisplay = document.getElementById('gridTotal');
        if (totalDisplay) {
            totalDisplay.textContent = this.COLS * this.ROWS;
        }

        // Redraw with new dimensions
        this.drawGrid();
    }

    /**
     * Setup alignment grid control
     */
    setupAlignmentControl() {
        const alignmentSelect = document.getElementById('alignmentGrid');
        if (alignmentSelect) {
            // Set initial value
            alignmentSelect.value = this.ALIGNMENT_GRID;

            // Handle changes
            alignmentSelect.addEventListener('change', (e) => {
                this.ALIGNMENT_GRID = parseInt(e.target.value) || 0;
                this.drawGrid();
            });
        }
    }

    /**
     * Setup grid size control inputs
     */
    setupGridSizeControls() {
        const colsInput = document.getElementById('gridCols');
        const rowsInput = document.getElementById('gridRows');

        if (colsInput) {
            colsInput.value = this.COLS;

            // Handle manual input
            colsInput.addEventListener('change', (e) => {
                let value = parseInt(e.target.value) || 32;
                // Find nearest power of 2
                const newCols = FlashPageGridCanvas.findNearestPowerOf2(value, this.PAGE_SIZE);
                const newRows = this.PAGE_SIZE / newCols;

                // Update both inputs
                colsInput.value = newCols;
                if (rowsInput) rowsInput.value = newRows;

                // Update grid
                this.updateGridSize(newCols, newRows);
            });

            // Handle step up/down (double/halve)
            colsInput.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const currentCols = parseInt(colsInput.value);
                    let newCols;

                    if (e.key === 'ArrowUp') {
                        // Double (if not at max)
                        newCols = Math.min(currentCols * 2, this.PAGE_SIZE);
                    } else {
                        // Halve (if not at min)
                        newCols = Math.max(currentCols / 2, 1);
                    }

                    const newRows = this.PAGE_SIZE / newCols;
                    colsInput.value = newCols;
                    if (rowsInput) rowsInput.value = newRows;
                    this.updateGridSize(newCols, newRows);
                }
            });
        }

        if (rowsInput) {
            rowsInput.value = this.ROWS;

            // Handle manual input
            rowsInput.addEventListener('change', (e) => {
                let value = parseInt(e.target.value) || 64;
                // Find nearest power of 2
                const newRows = FlashPageGridCanvas.findNearestPowerOf2(value, this.PAGE_SIZE);
                const newCols = this.PAGE_SIZE / newRows;

                // Update both inputs
                rowsInput.value = newRows;
                if (colsInput) colsInput.value = newCols;

                // Update grid
                this.updateGridSize(newCols, newRows);
            });

            // Handle step up/down (double/halve)
            rowsInput.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const currentRows = parseInt(rowsInput.value);
                    let newRows;

                    if (e.key === 'ArrowUp') {
                        // Double (if not at max)
                        newRows = Math.min(currentRows * 2, this.PAGE_SIZE);
                    } else {
                        // Halve (if not at min)
                        newRows = Math.max(currentRows / 2, 1);
                    }

                    const newCols = this.PAGE_SIZE / newRows;
                    rowsInput.value = newRows;
                    if (colsInput) colsInput.value = newCols;
                    this.updateGridSize(newCols, newRows);
                }
            });
        }
    }

    /**
     * Setup canvas event listeners
     */
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
        // Handle mouse leaving canvas
        this.canvas.addEventListener('mouseleave', () => {
            this.isPanning = false;
        });
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
        const x = world.x - this.LEFT_MARGIN;
        const y = world.y;

        const col = Math.floor(x / this.CELL_SIZE);
        const row = Math.floor(y / this.CELL_SIZE);

        if (row >= 0 && row < this.ROWS && col >= 0 && col < this.COLS) {
            return { row, col };
        }
        return null;
    }

    /**
     * Convert row/col to byte offset
     */
    cellToOffset(row, col) {
        return row * this.COLS + col;
    }

    /**
     * Convert offset to row/col
     */
    offsetToCell(offset) {
        return {
            row: Math.floor(offset / this.COLS),
            col: offset % this.COLS
        };
    }

    /**
     * Snap offset to alignment boundary
     * Parameters are always positioned at the alignment boundary (left side)
     * @param {number} offset - The offset to snap
     * @param {number} alignment - The alignment requirement in bytes
     * @param {number} paramSize - The size of the parameter in bytes (not used, kept for compatibility)
     * @returns {number} - The snapped offset (always at alignment boundary)
     */
    snapToAlignment(offset, alignment, paramSize = 1) {
        if (!alignment || alignment <= 1) return offset;
        
        // Always snap to the start of the alignment block
        const blockStart = Math.floor(offset / alignment) * alignment;
        return blockStart;
    }

    /**
     * Get the visual rendering offset for a parameter
     * Uses shiftleft to position the parameter within its alignment block
     * @param {object} param - The parameter object
     * @returns {object} - {startOffset, endOffset} for rendering
     */
    getVisualRenderOffset(param) {
        const paramOffset = param.address & this.PAGE_MASK;
        const alignment = param.alignment || 1;
        const shiftleft = param.shiftleft || 0;
        const bitsize = param.bitsize || 0;
        
        // Calculate the bit range within the alignment block: [shiftleft : shiftleft + bitsize - 1]
        // Convert to byte offsets for grid rendering
        const startBit = shiftleft;
        const endBit = shiftleft + bitsize - 1;
        
        // Convert bit positions to byte offsets (little-endian: bit 0 is in the last byte)
        const startByteFromLeft = Math.floor(startBit / 8);
        const endByteFromLeft = Math.floor(endBit / 8);
        const startByteOffset = (alignment - 1) - startByteFromLeft;
        const endByteOffset = (alignment - 1) - endByteFromLeft;
        
        return {
            startOffset: paramOffset + Math.min(startByteOffset, endByteOffset),
            endOffset: paramOffset + Math.max(startByteOffset, endByteOffset)
        };
    }

    // Draw border around parameter group
    drawParameterBorder(param, color) {
        const visualOffset = this.getVisualRenderOffset(param);
        const startOffset = visualOffset.startOffset;
        const endOffset = visualOffset.endOffset;

        this.ctx.strokeStyle = color;
        // Scale border width inversely with zoom to maintain consistent visual thickness
        this.ctx.lineWidth = 2 / this.cameraZoom;

        // Draw border for each cell that's part of this parameter
        for (let offset = startOffset; offset <= endOffset; offset++) {
            const cell = this.offsetToCell(offset);
            const x = this.LEFT_MARGIN + cell.col * this.CELL_SIZE;
            const y = cell.row * this.CELL_SIZE;

            // Check if adjacent cells are part of this parameter
            const leftInParam = offset > startOffset && (offset - 1) >= startOffset;
            const rightInParam = offset < endOffset && (offset + 1) <= endOffset;
            const topInParam = offset >= this.COLS && (offset - this.COLS) >= startOffset && (offset - this.COLS) <= endOffset;
            const bottomInParam = offset < (this.ROWS - 1) * this.COLS && (offset + this.COLS) >= startOffset && (offset + this.COLS) <= endOffset;

            // Draw borders only on edges where adjacent cell is NOT in parameter
            this.ctx.beginPath();
            
            if (!leftInParam) {
                // Draw left border
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x, y + this.CELL_SIZE);
            }
            
            if (!rightInParam) {
                // Draw right border
                this.ctx.moveTo(x + this.CELL_SIZE, y);
                this.ctx.lineTo(x + this.CELL_SIZE, y + this.CELL_SIZE);
            }
            
            if (!topInParam) {
                // Draw top border
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x + this.CELL_SIZE, y);
            }
            
            if (!bottomInParam) {
                // Draw bottom border
                this.ctx.moveTo(x, y + this.CELL_SIZE);
                this.ctx.lineTo(x + this.CELL_SIZE, y + this.CELL_SIZE);
            }
            
            this.ctx.stroke();
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

        // Draw row addresses on the left
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '11px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        
        for (let row = 0; row < this.ROWS; row++) {
            const rowAddress = this.PAGE_BASE_ADDRESS + (row * this.COLS);
            const y = row * this.CELL_SIZE + this.CELL_SIZE / 2;
            this.ctx.fillText('0x' + rowAddress.toString(16).toUpperCase().padStart(8, '0'), this.LEFT_MARGIN - 5, y);
        }

        // Draw cells
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const x = this.LEFT_MARGIN + col * this.CELL_SIZE;
                const y = row * this.CELL_SIZE;
                const offset = this.cellToOffset(row, col);

                // Determine cell color
                let fillColor = '#ffffff';
                let isPartOfParam = false;
                let overlappingParams = [];

                // Check if cell is part of a parameter (check ALL parameters for overlaps)
                for (let i = 0; i < this.parameters.length; i++) {
                    const param = this.parameters[i];
                    const visualOffset = this.getVisualRenderOffset(param);
                    if (offset >= visualOffset.startOffset && offset <= visualOffset.endOffset) {
                        overlappingParams.push({ param, index: i });
                        isPartOfParam = true;
                    }
                }

                // Determine fill color based on overlap detection
                if (overlappingParams.length > 1) {
                    // Multiple parameters overlap - highlight in red
                    fillColor = '#ff0000';
                } else if (overlappingParams.length === 1) {
                    // Single parameter - use its color
                    const { param, index } = overlappingParams[0];
                    fillColor = this.PARAM_COLORS[index % this.PARAM_COLORS.length];

                    // Highlight if hovered
                    if (this.hoveredParameter && this.hoveredParameter.id === param.id) {
                        fillColor = '#ffeb3b';
                    }
                }

                // Current selection
                if (this.selectionMode && this.selectionStart && this.selectionEnd) {
                    const startOffset = this.cellToOffset(this.selectionStart.row, this.selectionStart.col);
                    const endOffset = this.cellToOffset(this.selectionEnd.row, this.selectionEnd.col);
                    const minOffset = Math.min(startOffset, endOffset);
                    const maxOffset = Math.max(startOffset, endOffset);

                    if (offset >= minOffset && offset <= maxOffset) {
                        fillColor = '#2196F3';
                    }
                }

                // Show dragged parameter at new position (with alignment applied)
                if (this.isDraggingParameter && this.draggedParameter && this.dragCurrentCell) {
                    const rawOffset = this.cellToOffset(this.dragCurrentCell.row, this.dragCurrentCell.col);
                    const alignment = this.draggedParameter.alignment || 1;
                    const totalSizeBytes = Math.ceil(this.draggedParameter.bitsize / 8) * this.draggedParameter.count;
                    const alignedOffset = this.snapToAlignment(rawOffset, alignment, totalSizeBytes);
                    const shiftleft = this.draggedParameter.shiftleft || 0;

                    // Calculate visual rendering position using shiftleft (little-endian)
                    const startBit = shiftleft;
                    const endBit = shiftleft + this.draggedParameter.bitsize - 1;
                    const startByteFromLeft = Math.floor(startBit / 8);
                    const endByteFromLeft = Math.floor(endBit / 8);
                    const startByteOffset = (alignment - 1) - startByteFromLeft;
                    const endByteOffset = (alignment - 1) - endByteFromLeft;
                    const visualStartOffset = alignedOffset + Math.min(startByteOffset, endByteOffset);
                    const visualEndOffset = alignedOffset + Math.max(startByteOffset, endByteOffset);

                    if (offset >= visualStartOffset && offset <= visualEndOffset) {
                        fillColor = '#4CAF50'; // Green for new position
                    }
                }

                // Fill cell
                this.ctx.fillStyle = fillColor;
                this.ctx.fillRect(x, y, this.CELL_SIZE, this.CELL_SIZE);

                // Draw cell border
                this.ctx.strokeStyle = '#dbdbdb';
                this.ctx.lineWidth = 2 / this.cameraZoom;
                this.ctx.strokeRect(x, y, this.CELL_SIZE, this.CELL_SIZE);
            }
        }

        // Draw bit-level highlighting for parameters (when zoomed in)
        if (this.cameraZoom >= 2.0) {
            this.drawParameterBitHighlights();
            
            // Also draw bit highlighting for dragged parameter at new position
            if (this.isDraggingParameter && this.draggedParameter && this.dragCurrentCell) {
                this.drawDraggedParameterBitHighlight();
            }
        }

        // Draw parameter IDs in the center of each parameter group
        this.parameters.forEach(param => {
            const visualOffset = this.getVisualRenderOffset(param);
            const startOffset = visualOffset.startOffset;
            const endOffset = visualOffset.endOffset;
            const totalSizeBytes = endOffset - startOffset + 1;

            // Calculate center offset
            const centerOffset = startOffset + Math.floor(totalSizeBytes / 2);
            const centerCell = this.offsetToCell(centerOffset);

            // Calculate center coordinates
            const centerX = this.LEFT_MARGIN + (centerCell.col * this.CELL_SIZE) + (this.CELL_SIZE / 2);
            const centerY = (centerCell.row * this.CELL_SIZE) + (this.CELL_SIZE / 2);

            // Draw parameter ID text
            this.ctx.fillStyle = '#000000';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(param.id, centerX, centerY);
        });


        // Draw blue border around each parameter group
        this.parameters.forEach(param => {
            this.drawParameterBorder(param, '#00447c');
        });

        // Draw red border around hovered parameter group
        if (this.hoveredParameter) {
            const param = this.hoveredParameter;
            this.drawParameterBorder(param, '#ff0000');
        }

        // Draw alignment grid overlay
        if (this.ALIGNMENT_GRID > 0) {
            this.drawAlignmentGrid();
        }

        // Draw bit grid when zoomed in close
        if (this.cameraZoom >= 8.0) {
            this.drawBitGrid();
        }
    }

    /**
     * Draw bit-level highlighting for parameters
     * Shows which specific bits within each byte are used by parameters
     */
    drawParameterBitHighlights() {
        this.parameters.forEach((param, index) => {
            const paramOffset = param.address & this.PAGE_MASK;
            const shiftleft = param.shiftleft || 0;
            const bitsize = param.bitsize || 0;
            const alignment = param.alignment || 1;

            if (bitsize === 0) return;

            // Calculate which bits are used across the alignment block
            const startBit = shiftleft;
            const endBit = shiftleft + bitsize - 1;

            // Determine which bytes are affected
            // For little-endian with MSB-first display: bit 0 is in the rightmost byte
            const startByteFromLeft = Math.floor(startBit / 8);
            const endByteFromLeft = Math.floor(endBit / 8);
            const startByte = (alignment - 1) - startByteFromLeft;
            const endByte = (alignment - 1) - endByteFromLeft;

            // Get parameter color
            const color = this.PARAM_COLORS[index % this.PARAM_COLORS.length];
            
            // Draw bit highlighting for each affected byte
            // Iterate from end byte to start byte since we reversed the calculation
            for (let byteIndex = endByte; byteIndex <= startByte; byteIndex++) {
                const byteOffset = paramOffset + byteIndex;
                const cell = this.offsetToCell(byteOffset);

                if (cell.row < 0 || cell.row >= this.ROWS || cell.col < 0 || cell.col >= this.COLS) {
                    continue;
                }

                const cellX = this.LEFT_MARGIN + cell.col * this.CELL_SIZE;
                const cellY = cell.row * this.CELL_SIZE;

                // Calculate which bits in this byte are used
                // Since we reversed byte indices, calculate bit range for little-endian layout
                const byteStartBit = (alignment - 1 - byteIndex) * 8;
                const byteEndBit = byteStartBit + 7;
                
                const usedStartBit = Math.max(startBit, byteStartBit);
                const usedEndBit = Math.min(endBit, byteEndBit);
                
                const startBitInByte = usedStartBit - byteStartBit;
                const endBitInByte = usedEndBit - byteStartBit;

                // Calculate pixel positions for the bits (MSB on left, LSB on right)
                // Bit 7 is leftmost, bit 0 is rightmost (conventional ordering)
                const bitWidth = this.CELL_SIZE / 8;
                const leftBitPos = 7 - endBitInByte; // MSB side (left)
                const rightBitPos = 7 - startBitInByte; // LSB side (right)
                
                const highlightX = cellX + leftBitPos * bitWidth;
                const highlightWidth = (rightBitPos - leftBitPos + 1) * bitWidth;

                // Draw semi-transparent overlay to show which bits are used
                this.ctx.fillStyle = color.replace(')', ', 0.6)').replace('rgb', 'rgba').replace('#', 'rgba(');
                
                // Convert hex color to rgba if needed
                if (color.startsWith('#')) {
                    const r = parseInt(color.substr(1, 2), 16);
                    const g = parseInt(color.substr(3, 2), 16);
                    const b = parseInt(color.substr(5, 2), 16);
                    this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
                }
                
                this.ctx.fillRect(highlightX, cellY, highlightWidth, this.CELL_SIZE);

                // Draw bit range label if zoomed in enough
                if (this.cameraZoom >= 4.0 && bitsize < 8) {
                    this.ctx.fillStyle = '#000000';
                    this.ctx.font = `${Math.floor(bitWidth * 0.8)}px monospace`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'top';
                    const labelX = highlightX + highlightWidth / 2;
                    const labelY = cellY + 2;
                    
                    if (startBitInByte === endBitInByte) {
                        this.ctx.fillText(`b${startBitInByte}`, labelX, labelY);
                    } else {
                        this.ctx.fillText(`b${endBitInByte}:${startBitInByte}`, labelX, labelY);
                    }
                }
            }
        });
    }

    /**
     * Draw bit-level highlighting for the parameter being dragged
     */
    drawDraggedParameterBitHighlight() {
        const param = this.draggedParameter;
        const rawOffset = this.cellToOffset(this.dragCurrentCell.row, this.dragCurrentCell.col);
        const alignment = param.alignment || 1;
        const totalSizeBytes = Math.ceil(param.bitsize / 8) * param.count;
        const alignedOffset = this.snapToAlignment(rawOffset, alignment, totalSizeBytes);
        
        const shiftleft = param.shiftleft || 0;
        const bitsize = param.bitsize || 0;

        if (bitsize === 0) return;

        // Calculate which bits are used
        const startBit = shiftleft;
        const endBit = shiftleft + bitsize - 1;

        // Determine which bytes are affected
        // For little-endian with MSB-first display: bit 0 is in the rightmost byte
        const startByteFromLeft = Math.floor(startBit / 8);
        const endByteFromLeft = Math.floor(endBit / 8);
        const startByte = (alignment - 1) - startByteFromLeft;
        const endByte = (alignment - 1) - endByteFromLeft;

        // Draw bit highlighting for each affected byte
        // Iterate from end byte to start byte since we reversed the calculation
        for (let byteIndex = endByte; byteIndex <= startByte; byteIndex++) {
            const byteOffset = alignedOffset + byteIndex;
            const cell = this.offsetToCell(byteOffset);

            if (cell.row < 0 || cell.row >= this.ROWS || cell.col < 0 || cell.col >= this.COLS) {
                continue;
            }

            const cellX = this.LEFT_MARGIN + cell.col * this.CELL_SIZE;
            const cellY = cell.row * this.CELL_SIZE;

            // Calculate which bits in this byte are used
            // Since we reversed byte indices, calculate bit range for little-endian layout
            const byteStartBit = (alignment - 1 - byteIndex) * 8;
            const byteEndBit = byteStartBit + 7;
            
            const usedStartBit = Math.max(startBit, byteStartBit);
            const usedEndBit = Math.min(endBit, byteEndBit);
            
            const startBitInByte = usedStartBit - byteStartBit;
            const endBitInByte = usedEndBit - byteStartBit;

            // Calculate pixel positions for the bits (MSB on left, LSB on right)
            const bitWidth = this.CELL_SIZE / 8;
            const leftBitPos = 7 - endBitInByte;
            const rightBitPos = 7 - startBitInByte;
            
            const highlightX = cellX + leftBitPos * bitWidth;
            const highlightWidth = (rightBitPos - leftBitPos + 1) * bitWidth;

            // Draw with green color for new position
            this.ctx.fillStyle = 'rgba(76, 175, 80, 0.9)'; // Darker green
            this.ctx.fillRect(highlightX, cellY, highlightWidth, this.CELL_SIZE);

            // Draw bit range label if zoomed in enough
            if (this.cameraZoom >= 4.0 && bitsize < 8) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = `${Math.floor(bitWidth * 0.8)}px monospace`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'top';
                const labelX = highlightX + highlightWidth / 2;
                const labelY = cellY + 2;
                
                if (startBitInByte === endBitInByte) {
                    this.ctx.fillText(`b${startBitInByte}`, labelX, labelY);
                } else {
                    this.ctx.fillText(`b${endBitInByte}:${startBitInByte}`, labelX, labelY);
                }
            }
        }
    }

    /**
     * Draw bit grid within byte cells when zoomed in
     * Number of bits shown depends on ALIGNMENT_GRID
     * For ALIGNMENT_GRID > 1, the bit grid spans multiple cells
     */
    drawBitGrid() {
        // Determine alignment (default to 1 byte if not set)
        const alignmentBytes = this.ALIGNMENT_GRID > 0 ? this.ALIGNMENT_GRID : 1;
        const bitsPerGroup = alignmentBytes * 8; // Total bits across the alignment group
        
        this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        this.ctx.lineWidth = 2 / this.cameraZoom;

        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const offset = this.cellToOffset(row, col);
                
                // Only draw bit grid at alignment boundaries
                if (offset % alignmentBytes !== 0) continue;
                
                // Calculate the span of cells for this alignment group
                const groupStartX = this.LEFT_MARGIN + col * this.CELL_SIZE;
                const groupY = row * this.CELL_SIZE;
                const groupWidth = alignmentBytes * this.CELL_SIZE;
                const bitWidth = groupWidth / bitsPerGroup;

                // Draw vertical lines to separate bits across the group
                for (let bit = 1; bit < bitsPerGroup; bit++) {
                    const x = groupStartX + bit * bitWidth;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, groupY);
                    this.ctx.lineTo(x, groupY + this.CELL_SIZE);
                    this.ctx.stroke();
                }

                // Optionally draw bit numbers when zoomed in very close
                if (this.cameraZoom >= 3.0) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    this.ctx.font = `${Math.floor(bitWidth * 0.6)}px monospace`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';

                    for (let bit = 0; bit < bitsPerGroup; bit++) {
                        const bitX = groupStartX + bit * bitWidth + bitWidth / 2;
                        const bitY = groupY + this.CELL_SIZE / 2;
                        // Draw bit numbers from (bitsPerGroup-1) to 0 (MSB to LSB, left to right)
                        this.ctx.fillText((bitsPerGroup - 1 - bit).toString(), bitX, bitY);
                    }
                }
            }
        }
    }

    /**
     * Draw alignment grid overlay
     */
    drawAlignmentGrid() {
        this.ctx.strokeStyle = 'rgba(200, 0, 170, 0.5)';
        this.ctx.lineWidth = 2 / this.cameraZoom;
        this.ctx.setLineDash([5, 3]);

        // Draw vertical alignment lines
        for (let offset = 0; offset < this.PAGE_SIZE; offset += this.ALIGNMENT_GRID) {
            // Skip if alignment is at column 0 (already has grid line)
            if (offset % this.COLS === 0 && offset > 0) continue;

            const cell = this.offsetToCell(offset);
            const x = this.LEFT_MARGIN + cell.col * this.CELL_SIZE;
            const y = cell.row * this.CELL_SIZE;

            // Draw vertical line at alignment boundary
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x, y + this.CELL_SIZE);
            this.ctx.stroke();

            // Draw horizontal continuation if we're at row start
            if (cell.col === 0 && offset > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.LEFT_MARGIN, y);
                this.ctx.lineTo(this.LEFT_MARGIN + this.COLS * this.CELL_SIZE, y);
                this.ctx.stroke();
            }
        }

        // Reset line dash
        this.ctx.setLineDash([]);
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
            this.canvas.style.cursor = 'grab';
            return;
        }

        const cell = this.getCellFromMouse(event);
        if (!cell) return;

        // Handle selection mode
        if (this.selectionMode) {
            this.isDragging = true;
            this.selectionStart = cell;
            this.selectionEnd = cell;
            this.updateSelectionInfo();
            this.drawGrid();
            return;
        }

        // Handle parameter dragging (when not in selection mode)
        if (!this.selectionMode && this.hoveredParameter) {
            this.isDraggingParameter = true;
            this.draggedParameter = this.hoveredParameter;
            this.draggedParameterOriginalOffset = this.draggedParameter.address & this.PAGE_MASK;
            this.dragCurrentCell = cell;
            this.canvas.style.cursor = 'grabbing';
            this.drawGrid();
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

        const cell = this.getCellFromMouse(event);
        if (!cell) return;

        // Handle parameter dragging
        if (this.isDraggingParameter && this.draggedParameter) {
            this.dragCurrentCell = cell;
            const rawOffset = this.cellToOffset(cell.row, cell.col);
            const alignment = this.draggedParameter.alignment || 1;
            const paramSizeBytes = Math.ceil(this.draggedParameter.bitsize / 8) * this.draggedParameter.count;
            const alignedOffset = this.snapToAlignment(rawOffset, alignment, paramSizeBytes);
            const alignedAddress = this.PAGE_BASE_ADDRESS + alignedOffset;
            const shiftleft = this.draggedParameter.shiftleft || 0;

            const snapWarning = (rawOffset !== alignedOffset) 
                ? `<br><span style="color: #ff9800;">⚠ Will snap to ${alignment}-byte alignment boundary</span>` 
                : '';
            
            const bitInfo = shiftleft > 0
                ? `<br><span style="color: #00bcd4;">ℹ Bit offset: ${shiftleft} within alignment block</span>`
                : '';

            document.getElementById('cellInfo').innerHTML = `
                <strong>Moving: ${this.draggedParameter.name}</strong><br>
                Size: ${this.draggedParameter.bitsize} bits, Alignment: ${alignment} byte(s)<br>
                New Offset: ${alignedOffset} (0x${alignedOffset.toString(16).toUpperCase().padStart(4, '0')})<br>
                New Address: <span class="address-display">0x${alignedAddress.toString(16).toUpperCase().padStart(8, '0')}</span>${snapWarning}${bitInfo}<br>
                <em>Release to place parameter here</em>
            `;
            this.drawGrid();
            return;
        }

        // Handle selection dragging
        if (this.selectionMode && this.isDragging) {
            this.selectionEnd = cell;
            this.updateSelectionInfo();
            this.drawGrid();
        } else if (!this.selectionMode) {
            // Handle hover to show parameter info
            const offset = this.cellToOffset(cell.row, cell.col);
            let foundParam = null;

            for (const param of this.parameters) {
                const visualOffset = this.getVisualRenderOffset(param);
                if (offset >= visualOffset.startOffset && offset <= visualOffset.endOffset) {
                    foundParam = param;
                    break;
                }
            }

            if (foundParam !== this.hoveredParameter) {
                if (foundParam) {
                    this.highlightParameter(foundParam.id);
                    const address = this.PAGE_BASE_ADDRESS + offset;
                    const foundParamOffset = foundParam.address & this.PAGE_MASK;
                    const totalSizeBytes = Math.ceil(foundParam.bitsize / 8) * foundParam.count;
                    const alignment = foundParam.alignment || 1;
                    const shiftleft = foundParam.shiftleft || 0;
                    const bitInfo = shiftleft > 0 
                        ? `<br><small style="color: #666;">Bit offset: ${shiftleft} (within ${alignment}-byte block)</small>` 
                        : '';
                    document.getElementById('cellInfo').innerHTML = `
                        <strong>${foundParam.name}</strong><br>
                        Type: ${foundParam.type_name || 'N/A'} | 
                        Size: ${foundParam.bitsize} bits × ${foundParam.count}<br>
                        Base Address: <span class="address-display">0x${(this.PAGE_BASE_ADDRESS + foundParamOffset).toString(16).toUpperCase().padStart(8, '0')}</span>${bitInfo}<br>
                        ${foundParam.quantity_name ? 'Quantity: ' + foundParam.quantity_name : ''} 
                        ${foundParam.unit_symbol ? '(' + foundParam.unit_symbol + ')' : ''}<br>
                        ${foundParam.description || ''}
                    `;
                } else {
                    this.unhighlightParameter();
                    const address = this.PAGE_BASE_ADDRESS + offset;
                    document.getElementById('cellInfo').innerHTML = `
                        Offset: ${offset} (0x${offset.toString(16).toUpperCase().padStart(4, '0')})<br>
                        Address: <span class="address-display">0x${address.toString(16).toUpperCase().padStart(8, '0')}</span><br>
                        <em>No parameter at this location</em>
                    `;
                }
            }
        }
    }

    /**
     * Handle mouse up event
     */
    handleMouseUp(event) {
        // Handle pan end
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = this.selectionMode ? 'crosshair' : 'pointer';
            return;
        }

        if (this.selectionMode && this.isDragging) {
            this.isDragging = false;
            return;
        }

        // Handle parameter drop
        if (this.isDraggingParameter && this.draggedParameter && this.dragCurrentCell) {
            const rawOffset = this.cellToOffset(this.dragCurrentCell.row, this.dragCurrentCell.col);
            const alignment = this.draggedParameter.alignment || 1;
            const paramSizeBytes = Math.ceil(this.draggedParameter.bitsize / 8) * this.draggedParameter.count;
            const newOffset = this.snapToAlignment(rawOffset, alignment, paramSizeBytes);
            const newAddress = this.PAGE_BASE_ADDRESS + newOffset;

            // Check if position actually changed
            if (newOffset !== this.draggedParameterOriginalOffset) {
                // Track original values if this is the first modification
                if (!this.modifiedParameters.has(this.draggedParameter.id)) {
                    this.modifiedParameters.set(this.draggedParameter.id, {
                        originalOffset: this.draggedParameterOriginalOffset,
                        originalAddress: this.draggedParameter.address
                    });
                }

                // Update parameter address locally
                this.draggedParameter.address = newAddress;

                // Update display to show unsaved changes
                this.displayParameters();
                this.updateSaveButton();
            }

            // Reset dragging state
            this.isDraggingParameter = false;
            this.draggedParameter = null;
            this.draggedParameterOriginalOffset = null;
            this.dragCurrentCell = null;
            this.canvas.style.cursor = 'pointer';
            this.drawGrid();
        }
    }

    /**
     * Handle mouse wheel event for zooming
     */
    handleWheel(event) {
        event.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Get world position before zoom
        const worldBeforeZoom = this.screenToWorld(mouseX, mouseY);
        
        // Update zoom level
        const zoomAmount = -event.deltaY * this.ZOOM_SENSITIVITY;
        const newZoom = this.cameraZoom * Math.exp(zoomAmount);
        this.cameraZoom = Math.max(this.MIN_ZOOM, newZoom);
        
        // Get world position after zoom
        const worldAfterZoom = this.screenToWorld(mouseX, mouseY);
        
        // Adjust camera offset to keep mouse position steady
        this.cameraOffsetX += (worldAfterZoom.x - worldBeforeZoom.x) * this.cameraZoom;
        this.cameraOffsetY += (worldAfterZoom.y - worldBeforeZoom.y) * this.cameraZoom;
        
        this.drawGrid();
    }

    /**
     * Reset camera to default view
     */
    resetCamera() {
        this.cameraZoom = 1.0;
        this.cameraOffsetX = 0;
        this.cameraOffsetY = 0;
        this.drawGrid();
    }

    /**
     * Zoom to fit all content
     */
    zoomToFit() {
        const contentWidth = this.LEFT_MARGIN + (this.COLS * this.CELL_SIZE);
        const contentHeight = this.ROWS * this.CELL_SIZE;
        
        const zoomX = this.canvas.width / contentWidth;
        const zoomY = this.canvas.height / contentHeight;
        
        this.cameraZoom = Math.min(zoomX, zoomY) * 0.95; // 95% to add padding
        
        // Center the content
        this.cameraOffsetX = (this.canvas.width - contentWidth * this.cameraZoom) / 2;
        this.cameraOffsetY = (this.canvas.height - contentHeight * this.cameraZoom) / 2;
        
        this.drawGrid();
    }

    /**
     * Update selection info in form fields
     */
    updateSelectionInfo() {
        if (!this.selectionStart || !this.selectionEnd) return;

        const startOffset = this.cellToOffset(this.selectionStart.row, this.selectionStart.col);
        const endOffset = this.cellToOffset(this.selectionEnd.row, this.selectionEnd.col);
        const minOffset = Math.min(startOffset, endOffset);
        const maxOffset = Math.max(startOffset, endOffset);
        const sizeBytes = maxOffset - minOffset + 1;

        document.getElementById('paramOffset').value = minOffset;
        // Convert bytes to bits (1 byte = 8 bits)
        document.getElementById('paramSize').value = sizeBytes * 8;

        // Update count if type is selected
        this.updateSize();
    }

    /**
     * Start selection mode
     */
    startSelection() {
        this.selectionMode = true;
        this.selectionStart = null;
        this.selectionEnd = null;
        document.getElementById('selectionMode').style.display = 'block';
        this.canvas.style.cursor = 'crosshair';
        this.drawGrid();
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectionMode = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.isDragging = false;
        document.getElementById('selectionMode').style.display = 'none';
        this.canvas.style.cursor = 'pointer';
        document.getElementById('parameterForm').reset();
        this.drawGrid();
    }

    /**
     * Update size based on type and count
     */
    updateSize() {
        const typeSelect = document.getElementById('paramType');
        const countInput = document.getElementById('paramCount');
        const sizeInput = document.getElementById('paramSize');

        if (typeSelect.selectedIndex > 0) {
            const selectedOption = typeSelect.options[typeSelect.selectedIndex];
            const typeSizeBytes = parseInt(selectedOption.dataset.size);
            const count = parseInt(countInput.value) || 1;
            // Convert bytes to bits (1 byte = 8 bits)
            sizeInput.value = typeSizeBytes * 8 * count;
        }
    }

    /**
     * Load parameters from database
     */
    loadParameters() {
        fetch(`${this.API_REQPATH_SELECT}?table=parameters`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Filter parameters by page address range
                    const page_base = this.PAGE_BASE_ADDRESS;
                    const page_size = this.PAGE_SIZE;

                    this.parameters = data.data
                        .filter(p => p.address >= page_base && p.address < page_base + page_size)
                        .sort((a, b) => a.address - b.address);

                    // Fetch additional data (types, quantities, units) for each parameter
                    Promise.all([
                        fetch(`${this.API_REQPATH_SELECT}?table=types`).then(r => r.json()),
                        fetch(`${this.API_REQPATH_SELECT}?table=quantities`).then(r => r.json()),
                        fetch(`${this.API_REQPATH_SELECT}?table=units`).then(r => r.json())
                    ]).then(([typesData, quantitiesData, unitsData]) => {
                        const types = typesData.success ? typesData.data : [];
                        const quantities = quantitiesData.success ? quantitiesData.data : [];
                        const units = unitsData.success ? unitsData.data : [];

                        // Enrich parameters with related data
                        this.parameters.forEach(param => {
                            const type = types.find(t => t.id === param.fk_type);
                            const quantity = quantities.find(q => q.id === param.fk_quantity);
                            const unit = units.find(u => u.id === param.fk_unit);

                            param.type_name = type ? type.type_name : null;
                            param.quantity_name = quantity ? quantity.quantity_name : null;
                            param.unit_symbol = unit ? unit.unit_symbol : null;
                        });

                        this.displayParameters();
                        this.drawGrid();
                    });
                } else {
                    console.error('Failed to load parameters:', data.error);
                }
            })
            .catch(error => console.error('Error:', error));
    }

    /**
     * Display parameters in table
     */
    displayParameters() {
        const list = document.getElementById('parameterList');

        if (this.parameters.length === 0) {
            list.innerHTML = '<em style="color: #999;">No parameters in this page yet</em>';
            return;
        }

        const tableRows = this.parameters.map((param, index) => {
            const color = this.PARAM_COLORS[index % this.PARAM_COLORS.length];
            const address = param.address;
            const alignment = param.alignment || 1;
            const totalSizeBits = param.bitsize * param.count;
            const totalSizeBytes = Math.ceil(param.bitsize / 8) * param.count;
            const isModified = this.modifiedParameters.has(param.id);
            const modifiedStyle = isModified ? 'background-color: #fff3cd;' : '';
            const modifiedBadge = isModified ? '<span style="color: #ff9800; font-weight: bold;" title="Unsaved changes"> ●</span>' : '';
            
            // Check if address is properly aligned
            const offset = address & this.PAGE_MASK;
            const isAligned = (offset % alignment) === 0;
            const alignmentBadge = !isAligned ? '<span style="color: #f44336;" title="Misaligned!"> ⚠</span>' : '';

            return `
                <tr class="parameter-row" data-param-id="${param.id}" style="border-left: 10px solid ${color}; ${modifiedStyle}" 
                    onmouseover="gridCanvas.highlightParameter(${param.id})" 
                    onmouseout="gridCanvas.unhighlightParameter()">
                    <td style="font-weight: bold;">${param.name}${modifiedBadge}${alignmentBadge}</td>
                    <td><span class="address-display">0x${address.toString(16).toUpperCase().padStart(8, '0')}</span></td>
                    <td>${totalSizeBits}</td>
                    <td>${param.type_name || 'N/A'} × ${param.count}</td>
                    <td>${alignment}B</td>
                    <td>${param.unit_symbol || '-'}</td>
                </tr>
            `;
        }).join('');

        list.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                <thead>
                    <tr style="background-color: #f0f0f0; border-bottom: 2px solid #333;">
                        <th style="padding: 8px; text-align: left;">Name</th>
                        <th style="padding: 8px; text-align: left;">Address</th>
                        <th style="padding: 8px; text-align: left;">bitsize</th>
                        <th style="padding: 8px; text-align: left;">Type</th>
                        <th style="padding: 8px; text-align: left;">Align</th>
                        <th style="padding: 8px; text-align: left;">Unit</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;
    }

    /**
     * Highlight parameter on grid and table row
     */
    highlightParameter(paramId) {
        this.hoveredParameter = this.parameters.find(p => p.id == paramId);
        this.highlightTableRow(paramId);
        this.drawGrid();
    }

    /**
     * Unhighlight parameter on grid and table row
     */
    unhighlightParameter() {
        this.hoveredParameter = null;
        this.unhighlightTableRow();
        this.drawGrid();
    }

    /**
     * Highlight table row for parameter
     */
    highlightTableRow(paramId) {
        // Remove previous highlights
        document.querySelectorAll('.parameter-row').forEach(row => {
            row.style.backgroundColor = row.style.backgroundColor.includes('#fff3cd') ? '#fff3cd' : '';
        });

        // Highlight the corresponding row
        const row = document.querySelector(`.parameter-row[data-param-id="${paramId}"]`);
        if (row) {
            const isModified = this.modifiedParameters.has(paramId);
            row.style.backgroundColor = isModified ? '#ffe4a3' : '#e3f2fd';
        }
    }

    /**
     * Remove table row highlight
     */
    unhighlightTableRow() {
        document.querySelectorAll('.parameter-row').forEach(row => {
            const paramId = parseInt(row.dataset.paramId);
            const isModified = this.modifiedParameters.has(paramId);
            row.style.backgroundColor = isModified ? '#fff3cd' : '';
        });
    }

    /**
     * Update save button visibility and state
     */
    updateSaveButton() {
        const saveBtn = document.getElementById('saveChangesBtn');
        const discardBtn = document.getElementById('discardChangesBtn');
        const changesInfo = document.getElementById('unsavedChangesInfo');

        if (this.modifiedParameters.size > 0) {
            if (saveBtn) saveBtn.style.display = 'inline-block';
            if (discardBtn) discardBtn.style.display = 'inline-block';
            if (changesInfo) {
                changesInfo.style.display = 'block';
                changesInfo.textContent = `${this.modifiedParameters.size} parameter(s) with unsaved changes`;
            }
        } else {
            if (saveBtn) saveBtn.style.display = 'none';
            if (discardBtn) discardBtn.style.display = 'none';
            if (changesInfo) changesInfo.style.display = 'none';
        }
    }

    /**
     * Save all modified parameters to database
     */
    saveAllChanges() {
        if (this.modifiedParameters.size === 0) {
            alert('No changes to save');
            return;
        }

        // Prepare batch update data
        const updates = [];
        this.parameters.forEach(param => {
            if (this.modifiedParameters.has(param.id)) {
                updates.push({
                    id: param.id,
                    address: param.address
                });
            }
        });

        // Send batch update to server
        fetch('api/update.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'parameters',
                updates
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(`Successfully saved ${this.modifiedParameters.size} parameter(s)!`);
                    this.modifiedParameters.clear();
                    this.updateSaveButton();
                    this.loadParameters();
                } else {
                    alert('Error saving changes: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                alert('Error: ' + error);
            });
    }

    /**
     * Discard all unsaved changes
     */
    discardAllChanges() {
        if (this.modifiedParameters.size === 0) {
            return;
        }

        const confirmed = confirm(`Discard ${this.modifiedParameters.size} unsaved change(s)?`);
        if (!confirmed) return;

        // Restore original values
        this.parameters.forEach(param => {
            if (this.modifiedParameters.has(param.id)) {
                const original = this.modifiedParameters.get(param.id);
                param.address = original.originalAddress;
            }
        });

        this.modifiedParameters.clear();
        this.updateSaveButton();
        this.displayParameters();
        this.drawGrid();
    }

    /**
     * Load dropdown data for form
     */
    loadDropdowns() {
        // Load types
        fetch(`${this.API_REQPATH_SELECT}?table=types`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const typeSelect = document.getElementById('paramType');
                    data.data.forEach(type => {
                        const option = document.createElement('option');
                        option.value = type.id;
                        option.dataset.size = type.size_bytes;
                        option.textContent = `${type.type_name} (${type.size_bytes * 8} bits)`;
                        typeSelect.appendChild(option);
                    });
                }
            })
            .catch(error => console.error('Error loading types:', error));

        // Load quantities
        fetch(`${this.API_REQPATH_SELECT}?table=quantities`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const quantitySelect = document.getElementById('paramQuantity');
                    data.data.forEach(qty => {
                        const option = document.createElement('option');
                        option.value = qty.id;
                        option.textContent = qty.quantity_name;
                        quantitySelect.appendChild(option);
                    });
                }
            })
            .catch(error => console.error('Error loading quantities:', error));

        // Load units
        fetch(`${this.API_REQPATH_SELECT}?table=units`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const unitSelect = document.getElementById('paramUnit');
                    data.data.forEach(unit => {
                        const option = document.createElement('option');
                        option.value = unit.id;
                        const unitText = unit.unit_symbol + (unit.unit_name ? ` (${unit.unit_name})` : '');
                        option.textContent = unitText;
                        unitSelect.appendChild(option);
                    });
                }
            })
            .catch(error => console.error('Error loading units:', error));
    }

    /**
     * Setup form event listeners
     */
    setupFormListeners() {
        document.getElementById('paramType').addEventListener('change', () => this.updateSize());
        document.getElementById('paramCount').addEventListener('input', () => this.updateSize());

        document.getElementById('parameterForm').addEventListener('submit', (event) => {
            event.preventDefault();

            const formData = new FormData(event.target);
            formData.append('action', 'add_parameter');

            fetch('', {
                method: 'POST',
                body: new URLSearchParams(formData)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Parameter added successfully!');
                        this.clearSelection();
                        this.loadParameters();
                    } else {
                        alert('Error: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(error => {
                    alert('Error: ' + error);
                });
        });
    }

    /**
     * Initialize the grid canvas
     */
    init() {
        this.loadDropdowns();
        this.loadParameters();
        this.drawGrid();
        this.setupFormListeners();
        this.setupSaveButtons();
    }

    /**
     * Setup save/discard buttons
     */
    setupSaveButtons() {
        const saveBtn = document.getElementById('saveChangesBtn');
        const discardBtn = document.getElementById('discardChangesBtn');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAllChanges());
        }

        if (discardBtn) {
            discardBtn.addEventListener('click', () => this.discardAllChanges());
        }

        this.updateSaveButton();
    }
}
