/**
 * SVG image data URLs for tree connectors
 */
const TREE_IMAGES = {
  tee: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmUgeDE9IjgiIHkxPSIwIiB4Mj0iOCIgeTI9IjI0IiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIvPjxsaW5lIHgxPSI4IiB5MT0iMTIiIHgyPSIxNiIgeTI9IjEyIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
  corner: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmUgeDE9IjgiIHkxPSIwIiB4Mj0iOCIgeTI9IjEyIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIvPjxsaW5lIHgxPSI4IiB5MT0iMTIiIHgyPSIxNiIgeTI9IjEyIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
  line: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmUgeDE9IjgiIHkxPSIwIiB4Mj0iOCIgeTI9IjI0IiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
  blank: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PC9zdmc+'
};

/**
 * Mapping of data types to icon file paths
 */
const TYPE_ICONS = {
  'object': './icons/w95_5.ico',
  'array': './icons/w98_address_book_cards.ico',
  'string': './icons/w98_write_file.ico',
  'number': './icons/w98_calculator.ico',
  'boolean': './icons/w98_battery.ico'
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
    
    // Add prefix images
    prefixImages.forEach(imgType => {
      const img = document.createElement('img');
      img.src = TREE_IMAGES[imgType];
      img.style.width = '16px';
      img.style.height = '24px';
      img.style.flexShrink = '0';
      line.appendChild(img);
    });
    
    // Add connector image
    const connectorImg = document.createElement('img');
    connectorImg.src = isLast ? TREE_IMAGES.corner : TREE_IMAGES.tee;
    connectorImg.style.width = '16px';
    connectorImg.style.height = '24px';
    connectorImg.style.flexShrink = '0';
    line.appendChild(connectorImg);
    
    // Add label with name and type icon
    const label = document.createElement('span');
    label.textContent = node.name;
    label.style.lineHeight = '24px';
    label.style.marginRight = '8px';
    line.appendChild(label);
    
    // Add type icon if available
    if (node.type in TYPE_ICONS) {
      const typeIcon = document.createElement('img');
      typeIcon.src = TYPE_ICONS[node.type];
      typeIcon.title = node.type;
      typeIcon.style.width = '16px';
      typeIcon.style.height = '16px';
      typeIcon.style.lineHeight = '24px';
      typeIcon.style.verticalAlign = 'middle';
      line.appendChild(typeIcon);
    }
    
    container.appendChild(line);
    
    // Handle the value
    const value = node.value;
    
    if (Array.isArray(value)) {
      // Value is an array of nodes
      if (value.length > 0) {
        const newPrefix = [...prefixImages, isLast ? 'blank' : 'line'];
        value.forEach((childNode, index) => {
          const isLastChild = index === value.length - 1;
          const childTree = objectToTree(childNode, newPrefix, isLastChild);
          container.appendChild(childTree);
        });
      }
    } else if (typeof value === 'object' && value !== null) {
      // Value is an object
      const newPrefix = [...prefixImages, isLast ? 'blank' : 'line'];
      const childTree = objectToTree(value, newPrefix, true);
      container.appendChild(childTree);
    } else {
      // Value is a primitive
      const valueLine = document.createElement('div');
      valueLine.style.display = 'flex';
      valueLine.style.alignItems = 'flex-start';
      
      // Add prefix images
      prefixImages.forEach(imgType => {
        const img = document.createElement('img');
        img.src = TREE_IMAGES[imgType];
        img.style.width = '16px';
        img.style.height = '24px';
        img.style.flexShrink = '0';
        valueLine.appendChild(img);
      });
      
      // Add extension image
      const extImg = document.createElement('img');
      extImg.src = isLast ? TREE_IMAGES.blank : TREE_IMAGES.line;
      extImg.style.width = '16px';
      extImg.style.height = '24px';
      extImg.style.flexShrink = '0';
      valueLine.appendChild(extImg);
      
      const valueText = document.createElement('span');
      valueText.textContent = String(value);
      valueText.style.lineHeight = '24px';
      valueLine.appendChild(valueText);
      
      container.appendChild(valueLine);
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
    
    // Add connector image
    const connectorImg = document.createElement('img');
    connectorImg.src = isLastItem ? TREE_IMAGES.corner : TREE_IMAGES.tee;
    connectorImg.style.width = '16px';
    connectorImg.style.height = '24px';
    connectorImg.style.flexShrink = '0';
    line.appendChild(connectorImg);
    
    // Add key
    const keySpan = document.createElement('span');
    const value = node[key];
    
    if (typeof value === 'object' && value !== null) {
      keySpan.textContent = key;
      keySpan.style.lineHeight = '24px';
      line.appendChild(keySpan);
      container.appendChild(line);
      
      const newPrefix = [...prefixImages, isLastItem ? 'blank' : 'line'];
      const childTree = objectToTree(value, newPrefix, isLastItem);
      container.appendChild(childTree);
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
