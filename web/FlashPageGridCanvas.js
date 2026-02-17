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
    }

    /**
     * Get cell coordinates from mouse position
     */
    getCellFromMouse(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left - this.LEFT_MARGIN;
        const y = event.clientY - rect.top;

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

    // Draw border around parameter group
    drawParameterBorder(param, color) {
        const totalSize = param.size * param.count;
        const startOffset = param.offset;
        const endOffset = param.offset + totalSize - 1;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;

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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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
                    const totalSize = param.size * param.count;
                    if (offset >= param.offset && offset < param.offset + totalSize) {
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

                // Show dragged parameter at new position
                if (this.isDraggingParameter && this.draggedParameter && this.dragCurrentCell) {
                    const newOffset = this.cellToOffset(this.dragCurrentCell.row, this.dragCurrentCell.col);
                    const totalSize = this.draggedParameter.size * this.draggedParameter.count;

                    if (offset >= newOffset && offset < newOffset + totalSize) {
                        fillColor = '#4CAF50'; // Green for new position
                    }
                }

                // Fill cell
                this.ctx.fillStyle = fillColor;
                this.ctx.fillRect(x, y, this.CELL_SIZE, this.CELL_SIZE);

                // Draw cell border
                this.ctx.strokeStyle = '#dbdbdb';
                this.ctx.lineWidth = this.LINE_WIDTH;
                this.ctx.strokeRect(x, y, this.CELL_SIZE, this.CELL_SIZE);
            }
        }

        // Draw parameter IDs in the center of each parameter group
        this.parameters.forEach(param => {
            const totalSize = param.size * param.count;
            const startOffset = param.offset;
            const endOffset = param.offset + totalSize - 1;

            // Calculate center offset
            const centerOffset = startOffset + Math.floor(totalSize / 2);
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
    }

    /**
     * Draw alignment grid overlay
     */
    drawAlignmentGrid() {
        this.ctx.strokeStyle = 'rgba(200, 0, 170, 0.5)';
        this.ctx.lineWidth = 2;
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
            this.draggedParameterOriginalOffset = this.draggedParameter.offset;
            this.dragCurrentCell = cell;
            this.canvas.style.cursor = 'grabbing';
            this.drawGrid();
        }
    }

    /**
     * Handle mouse move event
     */
    handleMouseMove(event) {
        const cell = this.getCellFromMouse(event);
        if (!cell) return;

        // Handle parameter dragging
        if (this.isDraggingParameter && this.draggedParameter) {
            this.dragCurrentCell = cell;
            const newOffset = this.cellToOffset(cell.row, cell.col);
            const address = this.PAGE_BASE_ADDRESS + newOffset;

            document.getElementById('cellInfo').innerHTML = `
                <strong>Moving: ${this.draggedParameter.name}</strong><br>
                New Offset: ${newOffset} (0x${newOffset.toString(16).toUpperCase().padStart(4, '0')})<br>
                New Address: <span class="address-display">0x${address.toString(16).toUpperCase().padStart(8, '0')}</span><br>
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
                const totalSize = param.size * param.count;
                if (offset >= param.offset && offset < param.offset + totalSize) {
                    foundParam = param;
                    break;
                }
            }

            if (foundParam !== this.hoveredParameter) {
                if (foundParam) {
                    this.highlightParameter(foundParam.id);
                    const address = this.PAGE_BASE_ADDRESS + offset;
                    const relativeOffset = offset - foundParam.offset;
                    const totalSize = foundParam.size * foundParam.count;
                    document.getElementById('cellInfo').innerHTML = `
                        <strong>${foundParam.name}</strong><br>
                        Type: ${foundParam.type_name || 'N/A'} | 
                        Size: ${foundParam.size} bytes × ${foundParam.count}<br>
                        Address: <span class="address-display">0x${address.toString(16).toUpperCase().padStart(8, '0')}</span> 
                        (offset: ${foundParam.offset}-${foundParam.offset + totalSize - 1})<br>
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
        if (this.selectionMode && this.isDragging) {
            this.isDragging = false;
            return;
        }

        // Handle parameter drop
        if (this.isDraggingParameter && this.draggedParameter && this.dragCurrentCell) {
            const newOffset = this.cellToOffset(this.dragCurrentCell.row, this.dragCurrentCell.col);
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

                // Update parameter offset and address locally
                this.draggedParameter.offset = newOffset;
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
     * Update selection info in form fields
     */
    updateSelectionInfo() {
        if (!this.selectionStart || !this.selectionEnd) return;

        const startOffset = this.cellToOffset(this.selectionStart.row, this.selectionStart.col);
        const endOffset = this.cellToOffset(this.selectionEnd.row, this.selectionEnd.col);
        const minOffset = Math.min(startOffset, endOffset);
        const maxOffset = Math.max(startOffset, endOffset);
        const size = maxOffset - minOffset + 1;

        document.getElementById('paramOffset').value = minOffset;
        document.getElementById('paramSize').value = size;

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
            const typeSize = parseInt(selectedOption.dataset.size);
            const count = parseInt(countInput.value) || 1;
            sizeInput.value = typeSize * count;
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
                        .map(p => {
                            // Calculate offset
                            p.offset = p.address - page_base;
                            return p;
                        })
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
            const address = this.PAGE_BASE_ADDRESS + param.offset;
            const totalSize = param.size * param.count;
            const isModified = this.modifiedParameters.has(param.id);
            const modifiedStyle = isModified ? 'background-color: #fff3cd;' : '';
            const modifiedBadge = isModified ? '<span style="color: #ff9800; font-weight: bold;" title="Unsaved changes"> ●</span>' : '';

            return `
                <tr class="parameter-row" data-param-id="${param.id}" style="border-left: 10px solid ${color}; ${modifiedStyle}" 
                    onmouseover="gridCanvas.highlightParameter(${param.id})" 
                    onmouseout="gridCanvas.unhighlightParameter()">
                    <td style="font-weight: bold;">${param.name}${modifiedBadge}</td>
                    <td><span class="address-display">0x${address.toString(16).toUpperCase().padStart(8, '0')}</span></td>
                    <td>${param.offset}-${param.offset + totalSize - 1}</td>
                    <td>${totalSize}</td>
                    <td>${param.type_name || 'N/A'} × ${param.count}</td>
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
                        <th style="padding: 8px; text-align: left;">Offset</th>
                        <th style="padding: 8px; text-align: left;">Size (B)</th>
                        <th style="padding: 8px; text-align: left;">Type</th>
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
                param.offset = original.originalOffset;
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
                        option.textContent = `${type.type_name} (${type.size_bytes} bytes)`;
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
