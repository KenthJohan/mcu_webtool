/**
 * SVG image data URLs for tree connectors
 */
const TREE_IMAGES = {
  tee: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmUgeDE9IjgiIHkxPSIwIiB4Mj0iOCIgeTI9IjI0IiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIvPjxsaW5lIHgxPSI4IiB5MT0iMTIiIHgyPSIxNiIgeTI9IjEyIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
  corner: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmUgeDE9IjgiIHkxPSIwIiB4Mj0iOCIgeTI9IjEyIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIvPjxsaW5lIHgxPSI4IiB5MT0iMTIiIHgyPSIxNiIgeTI9IjEyIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
  line: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmUgeDE9IjgiIHkxPSIwIiB4Mj0iOCIgeTI9IjI0IiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
  blank: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PC9zdmc+',
  expanded: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMSIgeT0iMSIgd2lkdGg9IjE0IiBoZWlnaHQ9IjE0IiBmaWxsPSIjZmZmIiBzdHJva2U9IiM5OTkiLz48bGluZSB4MT0iNCIgeTE9IjgiIHgyPSIxMiIgeTI9IjgiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48L3N2Zz4=',
  collapsed: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMSIgeT0iMSIgd2lkdGg9IjE0IiBoZWlnaHQ9IjE0IiBmaWxsPSIjZmZmIiBzdHJva2U9IiM5OTkiLz48bGluZSB4MT0iNCIgeTE9IjgiIHgyPSIxMiIgeTI9IjgiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48bGluZSB4MT0iOCIgeTE9IjQiIHgyPSI4IiB5Mj0iMTIiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48L3N2Zz4='
};

/**
 * Icon sizes for tree elements
 */
const TREE_ICON_WIDTH = 16;
const TREE_ICON_HEIGHT = 20;
const TYPE_ICON_SIZE = 20;
const TREE_ROW_HEIGHT = 20;
const TOGGLE_BUTTON_SIZE = 10;

/**
 * Mapping of data types to icon file paths
 */
const TYPE_ICONS = {
  'object': '../icons/icons_w95/w95_5.ico',
  'array': '../icons/icons_w98/w98_directory_open_file_mydocs.ico',
  'string': '../icons/icons_w98/w98_font_opentype.ico',
  'number': '../icons/icons_w98/w98_address_book_card.ico',
  'boolean': '../icons/icons_w98/w98_address_book_card.ico'
};

let TREE_LEFT_COLUMN_WIDTH = 320;
const TREE_LEFT_COLUMN_MIN_WIDTH = 120;
const TREE_LEFT_COLUMN_MAX_WIDTH = 1200;

function setTreeLineLayout(line) {
  line.dataset.treeLine = '1';
  line.style.display = 'grid';
  line.style.gridTemplateColumns = `${TREE_LEFT_COLUMN_WIDTH}px 6px minmax(0, 1fr)`;
  line.style.columnGap = '0';
  line.style.alignItems = 'flex-start';
}

function updateTreeLineWidths(treeRoot) {
  if (!treeRoot) {
    return;
  }

  treeRoot.querySelectorAll('[data-tree-line="1"]').forEach(line => {
    line.style.gridTemplateColumns = `${TREE_LEFT_COLUMN_WIDTH}px 6px minmax(0, 1fr)`;
  });
}

function createColumnResizer(line) {
  const resizer = document.createElement('div');
  resizer.style.width = '6px';
  resizer.style.height = `${TREE_ROW_HEIGHT}px`;
  resizer.style.cursor = 'col-resize';
  resizer.style.userSelect = 'none';
  resizer.style.position = 'relative';

  const grip = document.createElement('div');
  grip.style.position = 'absolute';
  grip.style.left = '2px';
  grip.style.top = '0';
  grip.style.bottom = '0';
  grip.style.width = '1px';
  grip.style.backgroundColor = '#bbb';
  resizer.appendChild(grip);

  resizer.addEventListener('mousedown', event => {
    event.preventDefault();

    const treeRoot = line.closest('[data-tree-root="1"]');
    const startX = event.clientX;
    const startWidth = TREE_LEFT_COLUMN_WIDTH;

    const onMouseMove = moveEvent => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.min(
        TREE_LEFT_COLUMN_MAX_WIDTH,
        Math.max(TREE_LEFT_COLUMN_MIN_WIDTH, startWidth + delta)
      );

      TREE_LEFT_COLUMN_WIDTH = nextWidth;
      updateTreeLineWidths(treeRoot);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  return resizer;
}

/**
 * Recursively converts a node (with name, type, value structure) into a tree
 * @param {*} node - The node object or primitive to explore
 * @param {Array} prefixImages - Array of image types for the prefix
 * @param {boolean} isLast - Whether this is the last item at current level
 * @returns {HTMLElement} The formatted tree element
 */
function objectToTree(node, prefixImages = [], isLast = true) {
  const container = document.createElement('div');
  
  // Handle primitive types
  if (node === null) {
    const textNode = document.createTextNode('null');
    container.appendChild(textNode);
    return container;
  }
  
  if (typeof node !== 'object') {
    const textNode = document.createTextNode(String(node));
    container.appendChild(textNode);
    return container;
  }
  
  // Check if this is a node with name, type, value structure
  if ('name' in node && 'type' in node && 'value' in node) {
    const line = document.createElement('div');
    setTreeLineLayout(line);

    const leftColumn = document.createElement('div');
    leftColumn.style.display = 'flex';
    leftColumn.style.alignItems = 'flex-start';
    line.appendChild(leftColumn);

    const columnResizer = createColumnResizer(line);
    line.appendChild(columnResizer);
    
    const value = node.value;
    const hasChildren = (Array.isArray(value) && value.length > 0) || (typeof value === 'object' && value !== null);
    
    // Add prefix images
    prefixImages.forEach(imgType => {
      const img = document.createElement('img');
      img.src = TREE_IMAGES[imgType];
      img.style.width = `${TREE_ICON_WIDTH}px`;
      img.style.height = `${TREE_ICON_HEIGHT}px`;
      img.style.flexShrink = '0';
      leftColumn.appendChild(img);
    });
    
    // Add connector image with optional toggle button overlay
    const connectorContainer = document.createElement('div');
    connectorContainer.style.position = 'relative';
    connectorContainer.style.width = `${TREE_ICON_WIDTH}px`;
    connectorContainer.style.height = `${TREE_ICON_HEIGHT}px`;
    connectorContainer.style.flexShrink = '0';
    
    const connectorImg = document.createElement('img');
    connectorImg.src = isLast ? TREE_IMAGES.corner : TREE_IMAGES.tee;
    connectorImg.style.width = `${TREE_ICON_WIDTH}px`;
    connectorImg.style.height = `${TREE_ICON_HEIGHT}px`;
    connectorImg.style.display = 'block';
    connectorContainer.appendChild(connectorImg);
    leftColumn.appendChild(connectorContainer);

    let childrenContainer = null;
    if (hasChildren) {
      const toggleButton = document.createElement('img');
      toggleButton.src = TREE_IMAGES.expanded;
      toggleButton.style.width = `${TOGGLE_BUTTON_SIZE}px`;
      toggleButton.style.height = `${TOGGLE_BUTTON_SIZE}px`;
      toggleButton.style.position = 'absolute';
      toggleButton.style.top = `${(TREE_ROW_HEIGHT - TOGGLE_BUTTON_SIZE) / 2}px`;
      toggleButton.style.left = '3px';
      toggleButton.style.cursor = 'pointer';
      connectorContainer.appendChild(toggleButton);

      childrenContainer = document.createElement('div');
      childrenContainer.style.display = '';

      toggleButton.addEventListener('click', () => {
        const isExpanded = childrenContainer.style.display !== 'none';
        childrenContainer.style.display = isExpanded ? 'none' : '';
        toggleButton.src = isExpanded ? TREE_IMAGES.collapsed : TREE_IMAGES.expanded;
      });
    }
    
    
    // Add type icon if available
    if (node.type in TYPE_ICONS) {
      const typeIcon = document.createElement('img');
      typeIcon.src = TYPE_ICONS[node.type];
      typeIcon.title = node.type;
      typeIcon.style.width = `${TYPE_ICON_SIZE}px`;
      typeIcon.style.height = `${TYPE_ICON_SIZE}px`;
      typeIcon.style.flexShrink = '0';
      typeIcon.style.alignSelf = 'center';
      leftColumn.appendChild(typeIcon);
    }

    // Add label with name
    const label = document.createElement('span');
    label.textContent = node.name;
    label.style.lineHeight = `${TREE_ROW_HEIGHT}px`;
    label.style.marginRight = '8px';
    label.style.marginLeft= '8px';
    leftColumn.appendChild(label);
    
    if (typeof value !== 'object' || value === null) {
      // Value is a primitive - add it to right column
      const valueText = document.createElement('span');
      valueText.textContent = String(value);
      valueText.style.lineHeight = `${TREE_ROW_HEIGHT}px`;
      valueText.style.color = '#666';
      valueText.style.justifySelf = 'start';
      valueText.style.textAlign = 'left';
      valueText.style.paddingLeft = '8px';
      line.appendChild(valueText);
    }
    
    container.appendChild(line);
    
    if (Array.isArray(value)) {
      // Value is an array of nodes
      if (value.length > 0) {
        const newPrefix = [...prefixImages, isLast ? 'blank' : 'line'];
        value.forEach((childNode, index) => {
          const isLastChild = index === value.length - 1;
          const childTree = objectToTree(childNode, newPrefix, isLastChild);
          if (childrenContainer) {
            childrenContainer.appendChild(childTree);
          } else {
            container.appendChild(childTree);
          }
        });
      }
    } else if (typeof value === 'object' && value !== null) {
      // Value is an object
      const newPrefix = [...prefixImages, isLast ? 'blank' : 'line'];
      const childTree = objectToTree(value, newPrefix, true);
      if (childrenContainer) {
        childrenContainer.appendChild(childTree);
      } else {
        container.appendChild(childTree);
      }
    }

    if (childrenContainer) {
      container.appendChild(childrenContainer);
    }
    
    return container;
  }
  
  // Handle arrays (fallback for arrays without name/type structure)
  if (Array.isArray(node)) {
    if (node.length === 0) {
      const textNode = document.createTextNode('[]');
      container.appendChild(textNode);
      return container;
    }
    
    node.forEach((item, index) => {
      const isLastItem = index === node.length - 1;
      const childTree = objectToTree(item, prefixImages, isLastItem);
      container.appendChild(childTree);
    });
    
    return container;
  }
  
  // Handle plain objects (fallback)
  const keys = Object.keys(node);
  if (keys.length === 0) {
    const textNode = document.createTextNode('{}');
    container.appendChild(textNode);
    return container;
  }
  
  keys.forEach((key, index) => {
    const isLastItem = index === keys.length - 1;
    const line = document.createElement('div');
    setTreeLineLayout(line);

    const leftColumn = document.createElement('div');
    leftColumn.style.display = 'flex';
    leftColumn.style.alignItems = 'flex-start';
    line.appendChild(leftColumn);

    const columnResizer = createColumnResizer(line);
    line.appendChild(columnResizer);
    
    // Add prefix images
    prefixImages.forEach(imgType => {
      const img = document.createElement('img');
      img.src = TREE_IMAGES[imgType];
      img.style.width = `${TREE_ICON_WIDTH}px`;
      img.style.height = `${TREE_ICON_HEIGHT}px`;
      img.style.flexShrink = '0';
      leftColumn.appendChild(img);
    });
    
    // Add connector image with optional toggle button overlay
    const connectorContainer = document.createElement('div');
    connectorContainer.style.position = 'relative';
    connectorContainer.style.width = `${TREE_ICON_WIDTH}px`;
    connectorContainer.style.height = `${TREE_ICON_HEIGHT}px`;
    connectorContainer.style.flexShrink = '0';
    
    const connectorImg = document.createElement('img');
    connectorImg.src = isLastItem ? TREE_IMAGES.corner : TREE_IMAGES.tee;
    connectorImg.style.width = `${TREE_ICON_WIDTH}px`;
    connectorImg.style.height = `${TREE_ICON_HEIGHT}px`;
    connectorImg.style.display = 'block';
    connectorContainer.appendChild(connectorImg);
    leftColumn.appendChild(connectorContainer);
  });
  
  return container;
}

/**
 * Renders an object tree in the DOM with proper formatting
 * @param {*} obj - The object to explore
 * @param {HTMLElement} container - The container element
 */
function renderObjectTree(obj, container) {
  const tree = objectToTree(obj);
  tree.dataset.treeRoot = '1';
  
  tree.style.fontFamily = 'MS Sans Serif';
  tree.style.fontSize = '14px';
  
  container.innerHTML = '';
  container.appendChild(tree);
}

// Export for use in modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { objectToTree, renderObjectTree };
}
