/**
 * Recursively converts an object into an ASCII tree view representation
 * @param {*} obj - The object to explore
 * @param {string} prefix - The current line prefix (for indentation)
 * @param {boolean} isLast - Whether this is the last item at current level
 * @returns {string} The formatted tree string
 */
function objectToTree(obj, prefix = '', isLast = true) {
  let result = '';
  
  // Handle primitive types
  if (obj === null) {
    return 'null';
  }
  
  if (typeof obj !== 'object') {
    return String(obj);
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }
    
    obj.forEach((item, index) => {
      const isLastItem = index === obj.length - 1;
      const connector = isLastItem ? '└' : '├';
      const extension = isLastItem ? '  ' : '│ ';
      
      result += prefix + connector + '[' + index + ']\n';
      
      if (typeof item === 'object' && item !== null) {
        result += objectToTree(item, prefix + extension, isLastItem);
      } else {
        result += prefix + extension + String(item) + '\n';
      }
    });
    
    return result;
  }
  
  // Handle objects
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return '{}';
  }
  
  keys.forEach((key, index) => {
    const isLastItem = index === keys.length - 1;
    const connector = isLastItem ? '└' : '├';
    const extension = isLastItem ? '  ' : '│ ';
    const value = obj[key];
    
    result += prefix + connector + key;
    
    if (typeof value === 'object' && value !== null) {
      result += '\n';
      result += objectToTree(value, prefix + extension, isLastItem);
    } else {
      result += ': ' + String(value) + '\n';
    }
  });
  
  return result;
}

/**
 * Renders an object tree in the DOM with proper formatting
 * @param {*} obj - The object to explore
 * @param {HTMLElement} container - The container element
 */
function renderObjectTree(obj, container) {
  const tree = objectToTree(obj);
  
  const preElement = document.createElement('pre');
  preElement.style.fontFamily = 'monospace';
  preElement.style.fontSize = '14px';
  preElement.style.lineHeight = '1.5';
  preElement.style.whiteSpace = 'pre-wrap';
  preElement.style.wordWrap = 'break-word';
  preElement.textContent = tree;
  
  container.innerHTML = '';
  container.appendChild(preElement);
}

// Export for use in modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { objectToTree, renderObjectTree };
}
