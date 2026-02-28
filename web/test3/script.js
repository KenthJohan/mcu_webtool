function aux_create_shadow_column(rows, c) {
    let fragment = document.createDocumentFragment();
    for (let i = 0; i < rows; i++) {
        let cell = document.createElement('div');
        cell.textContent = `Shadow ${i + 1}`;
        cell.setAttribute('r', i); // Store row index for reference
        cell.setAttribute('c', c); // Store column index for reference (shadow column)
        fragment.appendChild(cell);
    }
    return fragment;
}

function grid_add_column(grid, c, rows) {
    console.assert(grid instanceof HTMLElement, 'Grid should be a valid HTMLElement.');
    let fragment = aux_create_shadow_column(rows, c);
    let index = c * rows; // Calculate the starting index for this column
    let ref = grid.children[index] || null;  // Get the reference child node
    console.log(grid.children);
    grid.insertBefore(fragment, ref); // Insert the fragment before the reference child
}


function grid_add_row(grid, r, rows, cols, cssclass = null) {
    console.assert(grid instanceof HTMLElement, 'Grid should be a valid HTMLElement.');
    for (let c = 0; c < cols; c++) {
        // Calculate the index for column-major order.
        // plus (c) for adjusting for already added cells in this row because each insertion shifts the indices:
        let index = (r + c * rows) + (c);
        let ref = grid.children[index] || null;  // Get the reference child node as the current position for insertion
        let cell = document.createElement('div');
        cell.textContent = `R${r + 1}C${c + 1}`;
        cell.setAttribute('r', r); // Store row index for reference
        cell.setAttribute('c', c); // Store column index for reference
        cell.className = cssclass || ''; // Apply CSS class if provided
        grid.insertBefore(cell, ref);  // Insert the cell before the reference child
        console.log(`Adding row at index: ${index} (r=${r}, c=${c} innerContent=${ref ? ref.innerHTML : 'null'})`);
    }
}


class GridExplorer {
    constructor(el) {
        this.cols = parseInt(el.getAttribute('cols')); // Get from attribute or default
        this.rows = parseInt(el.getAttribute('rows')); // Get from attribute or default
        this.grid = el;
        this.grid.style.gridAutoFlow = 'column'; // Set column-major order
        this._set_cols(this.cols);
        this._set_rows(this.rows);
        this._display(true); // Ensure grid is visible
        this.logChildren();
    }

    logChildren() {
        console.log('Grid children:', this.grid.children);
    }

    _display(enabled) {
        this.grid.style.display = enabled ? 'grid' : 'none';
    }

    // Private methods to update grid layout
    _set_rows(rows) {
        this.rows = rows;
        this.grid.style.gridTemplateRows = `repeat(${this.rows}, auto)`;
        this.grid.setAttribute('rows', this.rows); // Update attribute for reference
    }

    // Private methods to update grid layout
    _set_cols(cols) {
        this.cols = cols;
        this.grid.style.gridTemplateColumns = `repeat(${this.cols}, auto)`;
        this.grid.setAttribute('cols', this.cols); // Update attribute for reference
    }

    add_column(c) {
        if (c == -1) {
            c = this.cols - 1; // Add at the end
        } else if (c > this.cols) {
            console.error('Invalid column index:', c);
            return;
        }
        grid_add_column(this.grid, c, this.rows);
        this._set_cols(this.cols + 1);
        return c; // Return the index of the added column
    }

    add_row(r, cssclass = null) {
        if (r == -1) {
            r = this.rows - 1; // Add at the end
        } else if (r > this.rows) {
            console.error('Invalid row index:', r);
            return;
        }
        this._display(false); // Pause rendering
        try {
            grid_add_row(this.grid, r, this.rows, this.cols, cssclass);
        } finally {
            this._set_rows(this.rows + 1);
            this._display(true); // Resume rendering
        }
        return r; // Return the index of the added row
    }

    set_cell(r, c, content) {
        if (r >= this.rows || c >= this.cols) {
            console.error('Invalid cell coordinates:', r, c);
            return;
        }
        let index = r + c * this.rows; // Calculate index for column-major order
        if (index < this.grid.children.length) {
            this.grid.children[index].textContent = content;
        } else {
            console.error('Cell index out of bounds:', r, c);
        }
    }

    rm_column(c) {
        let startIndex = c * this.rows;
        for (let i = 0; i < this.rows; i++) {
            let index = startIndex + i;
            if (index < this.grid.children.length) {
                this.grid.removeChild(this.grid.children[index]);
            }
        }
        this._set_cols(this.cols - 1);
    }

    rm_row(r) {
        for (let c = 0; c < this.cols; c++) {
            let index = r + c * this.rows;
            if (index < this.grid.children.length) {
                this.grid.removeChild(this.grid.children[index]);
            }
        }
        this._set_rows(this.rows - 1);
    }
}

window.GridExplorer = GridExplorer;
