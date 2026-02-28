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

function aux_remove_cssclass(grid, cssclass) {
    for (let i = 0; i < grid.children.length; i++) {
        grid.children[i].classList.remove(cssclass);
    }
}

function aux_add_cssclass_column(grid, cssclass, c, rows) {
    for (let r = 0; r < rows; r++) {
        let index = r + c * rows; // Calculate the index for column-major order
        if (index < grid.children.length) {
            grid.children[index].classList.add(cssclass);
        }
    }
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


function grid_swap_columns(grid, c1, c2, rows) {
    console.assert(grid instanceof HTMLElement, 'Grid should be a valid HTMLElement.');
    for (let r = 0; r < rows; r++) {
        let index1 = r + c1 * rows;
        let index2 = r + c2 * rows;
        if (index1 < grid.children.length && index2 < grid.children.length) {
            let temp = grid.children[index1].textContent;
            grid.children[index1].textContent = grid.children[index2].textContent;
            grid.children[index2].textContent = temp;
        }
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
        this.display(true); // Ensure grid is visible

        // Drag state for column swapping
        this._dragCol = null;
        this._setupColumnDrag();
    }

    _drag_column(c) {
        this._dragCol = c;
        this.grid.classList.add('dragging-col');
        aux_add_cssclass_column(this.grid, 'drag-src', c, this.rows);
    }

    _setupColumnDrag() {
        // Add event listeners to grid for column drag
        this.grid.addEventListener('mousedown', (e) => {
            const cell = e.target.closest('div');
            if (!cell || !cell.hasAttribute('c')) return;
            if (cell.classList.contains('colswap')) {
                this._dragCol = parseInt(cell.getAttribute('c'));
                this.grid.classList.add('dragging-col');
                aux_add_cssclass_column(this.grid, 'drag-src', this._dragCol, this.rows);
            }
        });
        document.addEventListener('mouseup', (e) => {
            this.grid.style.userSelect = 'auto';
            aux_remove_cssclass(this.grid, 'drag-over');
            aux_remove_cssclass(this.grid, 'drag-src');
            if (this._dragCol === null) return;
            const cell = e.target.closest('div');
            if (!cell || !cell.hasAttribute('c')) {
                this._dragCol = null;
                this.grid.classList.remove('dragging-col');
                return;
            }
            const targetCol = parseInt(cell.getAttribute('c'));
            if (targetCol !== this._dragCol) {
                this.swap_columns(this._dragCol, targetCol);
            }
            this._dragCol = null;
            this.grid.classList.remove('dragging-col');
        });
        // Optional: add visual feedback for dragover
        this.grid.addEventListener('mouseover', (e) => {
            if (this._dragCol === null) return;
            const cell = e.target.closest('div');
            if (!cell || !cell.hasAttribute('c')) return;
            const targetCol = parseInt(cell.getAttribute('c'));
            if (targetCol !== this._dragCol) {
                aux_remove_cssclass(this.grid, 'drag-over');
                aux_add_cssclass_column(this.grid, 'drag-over', targetCol, this.rows);
            }
        });
    }

    display(enabled) {
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
            c = this.cols; // Add at the end
        } else if (c < -1) {
            console.error('Invalid column index:', c);
            return;
        }  else if (c > this.cols) {
            console.error('Invalid column index:', c);
            return;
        }
        grid_add_column(this.grid, c, this.rows);
        this._set_cols(this.cols + 1);
        return c; // Return the index of the added column
    }

    add_row(r, cssclass = null) {
        if (r == -1) {
            r = this.rows; // Add at the end
        } else if (r < -1) {
            console.error('Invalid row index:', r);
            return;
        } else if (r > this.rows) {
            console.error('Invalid row index:', r);
            return;
        }
        console.log('Adding row at index:', r, 'with cssclass:', cssclass);
        this.display(false); // Pause rendering
        try {
            grid_add_row(this.grid, r, this.rows, this.cols, cssclass);
        } finally {
            this._set_rows(this.rows + 1);
            this.display(true); // Resume rendering
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

    swap_columns(c1, c2) {
        if (c1 >= this.cols || c2 >= this.cols) {
            console.error('Invalid column indices:', c1, c2);
            return;
        }
        // Swap the content of the columns (c1 and c2) in the grid
        grid_swap_columns(this.grid, c1, c2, this.rows);
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
