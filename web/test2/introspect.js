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
 * Recursively converts an object into a tree structure with image elements
 * @param {*} obj - The object to explore
 * @param {Array} prefixImages - Array of image types for the prefix
 * @param {boolean} isLast - Whether this is the last item at current level
 * @returns {HTMLElement} The formatted tree element
 */
function objectToTree(obj, prefixImages = [], isLast = true) {
  const container = document.createElement('div');
  
  // Handle primitive types
  if (obj === null) {
    const textNode = document.createTextNode('null');
    container.appendChild(textNode);
    return container;
  }
  
  if (typeof obj !== 'object') {
    const textNode = document.createTextNode(String(obj));
    container.appendChild(textNode);
    return container;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      const textNode = document.createTextNode('[]');
      container.appendChild(textNode);
      return container;
    }
    
    obj.forEach((item, index) => {
      const isLastItem = index === obj.length - 1;
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
      
      // Add label
      const label = document.createElement('span');
      label.textContent = '[' + index + ']';
      label.style.lineHeight = '24px';
      line.appendChild(label);
      
      container.appendChild(line);
      
      if (typeof item === 'object' && item !== null) {
        const newPrefix = [...prefixImages, isLastItem ? 'blank' : 'line'];
        const childTree = objectToTree(item, newPrefix, isLastItem);
        container.appendChild(childTree);
      } else {
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
        extImg.src = isLastItem ? TREE_IMAGES.blank : TREE_IMAGES.line;
        extImg.style.width = '16px';
        extImg.style.height = '24px';
        extImg.style.flexShrink = '0';
        valueLine.appendChild(extImg);
        
        const valueText = document.createElement('span');
        valueText.textContent = String(item);
        valueText.style.lineHeight = '24px';
        valueLine.appendChild(valueText);
        
        container.appendChild(valueLine);
      }
    });
    
    return container;
  }
  
  // Handle objects
  const keys = Object.keys(obj);
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
    const value = obj[key];
    
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
