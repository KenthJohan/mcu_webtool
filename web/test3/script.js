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


function grid_add_row(grid, r, rows, cols) {
    console.assert(grid instanceof HTMLElement, 'Grid should be a valid HTMLElement.');
    for (let c = 0; c < cols; c++) {
        let index = r + c * rows;  // Calculate the index for column-major order
        let ref = grid.children[index] || null;  // Get the reference child node
        let cell = document.createElement('div');
        cell.textContent = `Row ${r + 1}, Col ${c + 1}`;
        cell.setAttribute('r', r); // Store row index for reference
        cell.setAttribute('c', c); // Store column index for reference
        grid.insertBefore(cell, ref);  // Insert the cell before the reference child
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
    }

    // Private methods to update grid layout
    _set_cols(cols) {
        this.cols = cols;
        this.grid.style.gridTemplateColumns = `repeat(${this.cols}, auto)`;
    }

    add_column(c) {
        if (c == -1) {
            c = this.cols-1; // Add at the end
        } else if (c > this.cols) {
            console.error('Invalid column index:', c);
            return;
        }
        grid_add_column(this.grid, c, this.rows);
        this._set_cols(this.cols + 1);
    }

    add_row(r) {
        this._display(false); // Pause rendering
        try {
            grid_add_row(this.grid, r, this.rows, this.cols);
        } finally {
            this._set_rows(this.rows + 1);
            this._display(true); // Resume rendering
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
