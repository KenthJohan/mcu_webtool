/**
 * Windows 98 Style Object Explorer
 * Recursively explores objects with collapsible tree view
 */
class ObjectExplorer {
    constructor(containerId, data) {
        this.container = document.getElementById(containerId);
        this.data = data;
        this.expandedNodes = new Set();
        this.nodeId = 0;

        if (!this.container) {
            console.error(`Container with id "${containerId}" not found`);
            return;
        }

        this.render();
    }

    /**
     * Generate unique ID for nodes
     */
    getNextId() {
        return `node-${this.nodeId++}`;
    }

    /**
     * Check if a value is an object (but not array, null, or date)
     */
    isObject(value) {
        return (
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            !(value instanceof Date) &&
            !(value instanceof RegExp)
        );
    }

    /**
     * Check if value is a container (has children)
     */
    isContainer(value) {
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        if (this.isObject(value)) {
            return Object.keys(value).length > 0;
        }
        return false;
    }

    /**
     * Get all keys/indices from a value
     */
    getKeys(value) {
        if (Array.isArray(value)) {
            return value.map((_, index) => index);
        }
        if (this.isObject(value)) {
            return Object.keys(value).sort();
        }
        return [];
    }

    /**
     * Format value for display
     */
    formatValue(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value}"`;
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'number') return value.toString();
        if (Array.isArray(value)) return `Array(${value.length})`;
        if (this.isObject(value)) {
            const keys = Object.keys(value).length;
            return `{${keys} items}`;
        }
        return String(value);
    }

    /**
     * Create tree structure
     */
    createTreeItem(key, value, depth, isLast, lastFlags = [], parentePath = '') {
        const itemId = this.getNextId();
        const isContainer = this.isContainer(value);
        const itemPath = parentePath ? `${parentePath}.${key}` : key;

        // Create main item wrapper
        const itemWrapper = document.createElement('div');
        itemWrapper.dataset.itemId = itemId;

        // Create the line for this item
        const lineDiv = document.createElement('div');
        lineDiv.className = 'tree-line';

        // Create indentation with tree lines
        const indentContainer = document.createElement('div');
        indentContainer.style.display = 'flex';
        indentContainer.style.alignItems = 'center';

        // Add tree lines for ancestors
        for (let i = 0; i < depth; i++) {
            const indent = document.createElement('div');
            indent.style.width = '18px';
            indent.style.height = '18px';
            indent.style.position = 'relative';

            // Only show vertical line if this ancestor level is not the last
            if (!lastFlags[i]) {
                const vline = document.createElement('div');
                vline.style.position = 'absolute';
                vline.style.width = '1px';
                vline.style.height = '18px';
                vline.style.left = '8px';
                vline.style.top = '0';
                vline.style.background = '#c0c0c0';
                indent.appendChild(vline);
            }

            indentContainer.appendChild(indent);
        }

        // Add toggle button or spacer
        const buttonContainer = document.createElement('div');
        buttonContainer.style.width = '18px';
        buttonContainer.style.height = '18px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.alignItems = 'center';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.position = 'relative';
        buttonContainer.style.flexShrink = '0';

        if (isContainer) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'toggle-btn';
            toggleBtn.textContent = '+';
            toggleBtn.id = `btn-${itemId}`;
            toggleBtn.title = 'Expand/Collapse';

            const isExpanded = this.expandedNodes.has(itemId);
            if (isExpanded) {
                toggleBtn.textContent = '−';
            }

            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNode(itemId);
            });

            buttonContainer.appendChild(toggleBtn);
        }

        // Add connector line (only on the rightmost level)
        const connectorDiv = document.createElement('div');
        connectorDiv.style.width = '18px';
        connectorDiv.style.height = '18px';
        connectorDiv.style.position = 'relative';
        connectorDiv.style.display = 'flex';
        connectorDiv.style.alignItems = 'center';
        connectorDiv.style.justifyContent = 'center';
        connectorDiv.style.flexShrink = '0';

        // Vertical line
        const vline = document.createElement('div');
        vline.style.position = 'absolute';
        vline.style.width = '1px';
        vline.style.height = isLast ? '9px' : '18px';
        vline.style.left = '8px';
        vline.style.top = isLast ? '0' : '-9px';
        vline.style.background = '#c0c0c0';
        connectorDiv.appendChild(vline);

        // Horizontal line
        const hline = document.createElement('div');
        hline.style.position = 'absolute';
        hline.style.height = '1px';
        hline.style.width = '9px';
        hline.style.left = '8px';
        hline.style.top = '8px';
        hline.style.background = '#c0c0c0';
        connectorDiv.appendChild(hline);

        indentContainer.appendChild(connectorDiv);
        indentContainer.appendChild(buttonContainer);

        // Add icon
        const icon = document.createElement('div');
        icon.className = 'icon';
        icon.id = `icon-${itemId}`;
        if (isContainer) {
            const isExpanded = this.expandedNodes.has(itemId);
            icon.className += isExpanded ? ' folder-open-icon' : ' folder-icon';
        } else {
            icon.className += ' file-icon';
        }

        // Add label
        const label = document.createElement('span');
        label.className = 'item-label';
        label.textContent = key;

        // Add value display
        const valueSpan = document.createElement('span');
        valueSpan.className = 'item-value';
        valueSpan.textContent = ` : ${this.formatValue(value)}`;

        lineDiv.appendChild(indentContainer);
        lineDiv.appendChild(icon);
        lineDiv.appendChild(label);
        lineDiv.appendChild(valueSpan);

        itemWrapper.appendChild(lineDiv);

        // Container for children
        if (isContainer) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children';
            childrenContainer.id = `children-${itemId}`;

            const isExpanded = this.expandedNodes.has(itemId);
            if (isExpanded) {
                childrenContainer.classList.add('open');
            }

            const keys = this.getKeys(value);
            keys.forEach((childKey, index) => {
                const childValue = value[childKey];
                // Build the lastFlags array for this child
                const childLastFlags = [...lastFlags, isLast];
                const childItem = this.createTreeItem(
                    childKey,
                    childValue,
                    depth + 1,
                    index === keys.length - 1,
                    childLastFlags,
                    itemPath
                );
                childrenContainer.appendChild(childItem);
            });

            itemWrapper.appendChild(childrenContainer);
        }

        return itemWrapper;
    }

    /**
     * Toggle node expansion
     */
    toggleNode(itemId) {
        if (this.expandedNodes.has(itemId)) {
            this.expandedNodes.delete(itemId);
        } else {
            this.expandedNodes.add(itemId);
        }

        // Update button text
        const button = document.getElementById(`btn-${itemId}`);
        if (button) {
            button.textContent = this.expandedNodes.has(itemId) ? '−' : '+';
        }

        // Update children visibility
        const childrenContainer = document.getElementById(`children-${itemId}`);
        if (childrenContainer) {
            childrenContainer.classList.toggle('open');
        }

        // Update icon
        const icon = document.getElementById(`icon-${itemId}`);
        if (icon) {
            if (this.expandedNodes.has(itemId)) {
                icon.classList.remove('folder-icon');
                icon.classList.add('folder-open-icon');
            } else {
                icon.classList.remove('folder-open-icon');
                icon.classList.add('folder-icon');
            }
        }
    }

    /**
     * Render the tree
     */
    render() {
        this.container.innerHTML = '';
        const keys = this.getKeys(this.data);

        keys.forEach((key, index) => {
            const value = this.data[key];
            const item = this.createTreeItem(key, value, 0, index === keys.length - 1, [], '');
            this.container.appendChild(item);
        });
    }

    /**
     * Expand all nodes recursively
     */
    expandAll() {
        const buttons = this.container.querySelectorAll('.toggle-btn');
        buttons.forEach((btn) => {
            const itemId = btn.id.replace('btn-', '');
            if (!this.expandedNodes.has(itemId)) {
                this.toggleNode(itemId);
            }
        });
    }

    /**
     * Collapse all nodes
     */
    collapseAll() {
        const buttons = this.container.querySelectorAll('.toggle-btn');
        buttons.forEach((btn) => {
            const itemId = btn.id.replace('btn-', '');
            if (this.expandedNodes.has(itemId)) {
                this.toggleNode(itemId);
            }
        });
    }
}
