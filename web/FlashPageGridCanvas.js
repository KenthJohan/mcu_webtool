/**
 * FlashPageGridCanvas - A visual grid representation of MCU flash page memory
 * Displays parameters mapped to memory locations with interactive selection
 */
class FlashPageGridCanvas {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // Grid configuration
        this.COLS = config.cols || 64;
        this.ROWS = config.rows || 32;
        this.CELL_SIZE = config.cellSize || 30;
        this.LINE_WIDTH = config.lineWidth || 1;
        this.PAGE_BASE_ADDRESS = config.pageBaseAddress || 0x08003000;
        this.API_REQPATH_SELECT = config.apiPath || 'api/select.php';
        
        // Canvas dimensions
        this.canvas.width = this.COLS * this.CELL_SIZE + this.LINE_WIDTH;
        this.canvas.height = this.ROWS * this.CELL_SIZE + this.LINE_WIDTH;
        
        // State
        this.parameters = [];
        this.selectionMode = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.isDragging = false;
        this.hoveredParameter = null;
        
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
        const x = event.clientX - rect.left;
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
    
    /**
     * Draw the grid
     */
    drawGrid() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw cells
        for (let row = 0; row < this.ROWS; row++) {
            for (let col = 0; col < this.COLS; col++) {
                const x = col * this.CELL_SIZE;
                const y = row * this.CELL_SIZE;
                const offset = this.cellToOffset(row, col);
                
                // Determine cell color
                let fillColor = '#ffffff';
                let isPartOfParam = false;
                
                // Check if cell is part of a parameter
                for (let i = 0; i < this.parameters.length; i++) {
                    const param = this.parameters[i];
                    const totalSize = param.size * param.count;
                    if (offset >= param.offset && offset < param.offset + totalSize) {
                        fillColor = this.PARAM_COLORS[i % this.PARAM_COLORS.length];
                        isPartOfParam = true;
                        
                        // Highlight if hovered
                        if (this.hoveredParameter && this.hoveredParameter.id === param.id) {
                            fillColor = '#ffeb3b';
                        }
                        break;
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
                
                // Fill cell
                this.ctx.fillStyle = fillColor;
                this.ctx.fillRect(x, y, this.CELL_SIZE, this.CELL_SIZE);
                
                // Draw cell border
                this.ctx.strokeStyle = '#cccccc';
                this.ctx.lineWidth = this.LINE_WIDTH;
                this.ctx.strokeRect(x, y, this.CELL_SIZE, this.CELL_SIZE);
            }
        }
    }
    
    /**
     * Handle mouse down event
     */
    handleMouseDown(event) {
        if (!this.selectionMode) return;
        
        const cell = this.getCellFromMouse(event);
        if (cell) {
            this.isDragging = true;
            this.selectionStart = cell;
            this.selectionEnd = cell;
            this.updateSelectionInfo();
            this.drawGrid();
        }
    }
    
    /**
     * Handle mouse move event
     */
    handleMouseMove(event) {
        const cell = this.getCellFromMouse(event);
        if (!cell) return;
        
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
                this.hoveredParameter = foundParam;
                this.drawGrid();
                
                if (foundParam) {
                    const address = this.PAGE_BASE_ADDRESS + offset;
                    document.getElementById('cellInfo').innerHTML = `
                        <strong>${foundParam.name}</strong><br>
                        Type: ${foundParam.type_name || 'N/A'} | 
                        Size: ${foundParam.size} bytes × ${foundParam.count}<br>
                        Address: <span class="address-display">0x${address.toString(16).toUpperCase().padStart(8, '0')}</span> 
                        (offset: ${offset})<br>
                        ${foundParam.quantity_name ? 'Quantity: ' + foundParam.quantity_name : ''} 
                        ${foundParam.unit_symbol ? '(' + foundParam.unit_symbol + ')' : ''}<br>
                        ${foundParam.description || ''}
                    `;
                } else {
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
        fetch(`${this.API_REQPATH_SELECT}?table=mcu_parameters`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Filter parameters by page address range
                    const page_base = this.PAGE_BASE_ADDRESS;
                    const page_size = 2048;
                    
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
     * Display parameters in list
     */
    displayParameters() {
        const list = document.getElementById('parameterList');
        
        if (this.parameters.length === 0) {
            list.innerHTML = '<em style="color: #999;">No parameters in this page yet</em>';
            return;
        }
        
        list.innerHTML = this.parameters.map((param, index) => {
            const color = this.PARAM_COLORS[index % this.PARAM_COLORS.length];
            const address = this.PAGE_BASE_ADDRESS + param.offset;
            const totalSize = param.size * param.count;
            
            return `
                <div class="parameter-item" style="border-color: ${color};" 
                     onmouseover="gridCanvas.highlightParameter(${param.id})" 
                     onmouseout="gridCanvas.unhighlightParameter()">
                    <strong>${param.name}</strong>
                    Address: <span class="address-display">0x${address.toString(16).toUpperCase().padStart(8, '0')}</span><br>
                    Offset: ${param.offset}-${param.offset + totalSize - 1} (${totalSize} bytes)<br>
                    Type: ${param.type_name || 'N/A'} × ${param.count}
                    ${param.unit_symbol ? ' [' + param.unit_symbol + ']' : ''}
                </div>
            `;
        }).join('');
    }
    
    /**
     * Highlight parameter on grid
     */
    highlightParameter(paramId) {
        this.hoveredParameter = this.parameters.find(p => p.id == paramId);
        this.drawGrid();
    }
    
    /**
     * Unhighlight parameter on grid
     */
    unhighlightParameter() {
        this.hoveredParameter = null;
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
    }
}
