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
 * Mapping of data types to icon file paths
 */
const TYPE_ICONS = {
  'object': './icons/icons_w95/w95_5.ico',
  'array': './icons/icons_w95/w95_6.ico',
  'string': './icons/icons_w95/w95_7.ico',
  'number': './icons/icons_w95/w95_8.ico',
  'boolean': './icons/icons_w95/w95_9.ico'
};

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
    line.style.display = 'flex';
    line.style.alignItems = 'flex-start';
    
    const value = node.value;
    const hasChildren = (Array.isArray(value) && value.length > 0) || (typeof value === 'object' && value !== null);
    
    // Add prefix images
    prefixImages.forEach(imgType => {
      const img = document.createElement('img');
      img.src = TREE_IMAGES[imgType];
      img.style.width = '16px';
      img.style.height = '24px';
      img.style.flexShrink = '0';
      line.appendChild(img);
    });
    
    // Add connector image with optional toggle button overlay
    const connectorContainer = document.createElement('div');
    connectorContainer.style.position = 'relative';
    connectorContainer.style.width = '16px';
    connectorContainer.style.height = '24px';
    connectorContainer.style.flexShrink = '0';
    
    const connectorImg = document.createElement('img');
    connectorImg.src = isLast ? TREE_IMAGES.corner : TREE_IMAGES.tee;
    connectorImg.style.width = '16px';
    connectorImg.style.height = '24px';
    connectorImg.style.display = 'block';
    connectorContainer.appendChild(connectorImg);
    line.appendChild(connectorContainer);

    let childrenContainer = null;
    if (hasChildren) {
      const toggleButton = document.createElement('img');
      toggleButton.src = TREE_IMAGES.expanded;
      toggleButton.style.width = '10px';
      toggleButton.style.height = '10px';
      toggleButton.style.position = 'absolute';
      toggleButton.style.top = '6px';
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
      typeIcon.style.width = '16px';
      typeIcon.style.height = '16px';
      typeIcon.style.flexShrink = '0';
      line.appendChild(typeIcon);
    }

    // Add label with name
    const label = document.createElement('span');
    label.textContent = node.name;
    label.style.lineHeight = '24px';
    label.style.marginRight = '8px';
    line.appendChild(label);
    
    if (typeof value !== 'object' || value === null) {
      // Value is a primitive - add it to the same line
      const valueText = document.createElement('span');
      valueText.textContent = String(value);
      valueText.style.lineHeight = '24px';
      valueText.style.color = '#666';
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
    line.style.display = 'flex';
    line.style.alignItems = 'flex-start';
    
    // Add prefix images
    prefixImages.forEach(imgType => {
      const img = document.createElement('img');
      img.src = TREE_IMAGES[imgType];
      img.style.width = '16px';
      img.style.height = '24px';
      img.style.flexShrink = '0';
      line.appendChild(img);
    });
    
    // Add connector image with optional toggle button overlay
    const connectorContainer = document.createElement('div');
    connectorContainer.style.position = 'relative';
    connectorContainer.style.width = '16px';
    connectorContainer.style.height = '24px';
    connectorContainer.style.flexShrink = '0';
    
    const connectorImg = document.createElement('img');
    connectorImg.src = isLastItem ? TREE_IMAGES.corner : TREE_IMAGES.tee;
    connectorImg.style.width = '16px';
    connectorImg.style.height = '24px';
    connectorImg.style.display = 'block';
    connectorContainer.appendChild(connectorImg);
    line.appendChild(connectorContainer);
    
    // Add key
    const keySpan = document.createElement('span');
    const value = node[key];
    const hasChildren = typeof value === 'object' && value !== null;
    let childrenContainer = null;

    if (hasChildren) {
      const toggleButton = document.createElement('img');
      toggleButton.src = TREE_IMAGES.expanded;
      toggleButton.style.width = '16px';
      toggleButton.style.height = '16px';
      toggleButton.style.position = 'absolute';
      toggleButton.style.top = '4px';
      toggleButton.style.left = '0';
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
    
    if (typeof value === 'object' && value !== null) {
      keySpan.textContent = key;
      keySpan.style.lineHeight = '24px';
      line.appendChild(keySpan);
      container.appendChild(line);
      
      const newPrefix = [...prefixImages, isLastItem ? 'blank' : 'line'];
      const childTree = objectToTree(value, newPrefix, isLastItem);
      if (childrenContainer) {
        childrenContainer.appendChild(childTree);
        container.appendChild(childrenContainer);
      } else {
        container.appendChild(childTree);
      }
    } else {
      keySpan.textContent = key + ': ' + String(value);
      keySpan.style.lineHeight = '24px';
      line.appendChild(keySpan);
      container.appendChild(line);
    }
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
  
  tree.style.fontFamily = 'monospace';
  tree.style.fontSize = '14px';
  
  container.innerHTML = '';
  container.appendChild(tree);
}

// Export for use in modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { objectToTree, renderObjectTree };
}
