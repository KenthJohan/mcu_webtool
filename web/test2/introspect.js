// Load JSON data and create tree view
let treeData = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('introspect.json');
    treeData = await response.json();
    renderTreeView(treeData);
  } catch (error) {
    console.error('Error loading JSON:', error);
    document.getElementById('tree-container').innerHTML = '<p style="color: red;">Error loading data</p>';
  }
});

// Recursive function to render tree view
function renderTreeView(data, parentElement = null) {
  if (!parentElement) {
    parentElement = document.getElementById('tree-container');
    parentElement.innerHTML = ''; // Clear existing content
  }

  const table = document.createElement('table');
  table.className = 'tree-table';

  const tbody = document.createElement('tbody');

  function createRows(items, level = 0) {
    items.forEach((item, index) => {
      const row = document.createElement('tr');
      row.className = `tree-row level-${level}`;
      row.dataset.level = level;

      // Create expand/collapse button cell
      const expandCell = document.createElement('td');
      expandCell.className = 'tree-expand-cell';

      if (item.children && item.children.length > 0) {
        const expandBtn = document.createElement('button');
        expandBtn.className = 'tree-toggle';
        expandBtn.textContent = '▼';
        expandBtn.dataset.expanded = 'true';
        
        expandBtn.addEventListener('click', (e) => {
          const wasCollapsed = expandBtn.dataset.expanded === 'false';
          expandBtn.dataset.expanded = wasCollapsed ? 'true' : 'false';
          expandBtn.textContent = wasCollapsed ? '▼' : '▶';
          
          // Toggle visibility of all nested rows (both direct children and descendants)
          let nextRow = row.nextElementSibling;
          while (nextRow && parseInt(nextRow.dataset.level) > level) {
            nextRow.style.display = wasCollapsed ? 'table-row' : 'none';
            nextRow = nextRow.nextElementSibling;
          }
        });

        expandCell.appendChild(expandBtn);
      }

      row.appendChild(expandCell);

      // Create name cell
      const nameCell = document.createElement('td');
      nameCell.className = 'tree-name-cell';
      nameCell.style.paddingLeft = (30 * level) + 'px';
      
      // Add emoji icon based on type
      const emoji = getEmojiForType(item.type);
      
      nameCell.innerHTML = `<span style="margin-right: 6px;">${emoji}</span>${item.name}`;
      row.appendChild(nameCell);

      // Create type cell
      const typeCell = document.createElement('td');
      typeCell.className = 'tree-type-cell';
      const typeSpan = document.createElement('span');
      typeSpan.className = `type-tag type-${item.type}`;
      typeSpan.textContent = item.type;
      typeCell.appendChild(typeSpan);
      row.appendChild(typeCell);

      // Create value cell
      const valueCell = document.createElement('td');
      valueCell.className = 'tree-value-cell';
      
      if (item.value !== undefined) {
        const valueSpan = document.createElement('span');
        valueSpan.className = 'tree-value';
        
        if (item.type === 'string') {
          valueSpan.textContent = `"${item.value}"`;
          valueSpan.style.color = '#22ab94';
        } else if (item.type === 'number') {
          valueSpan.textContent = item.value;
          valueSpan.style.color = '#d4a574';
        } else if (item.type === 'boolean') {
          valueSpan.textContent = item.value ? 'true' : 'false';
          valueSpan.style.color = '#ff7b7b';
        } else {
          valueSpan.textContent = String(item.value);
        }
        
        valueCell.appendChild(valueSpan);
      }
      
      row.appendChild(valueCell);

      tbody.appendChild(row);

      // Recursively add child rows
      if (item.children && item.children.length > 0) {
        createRows(item.children, level + 1);
      }
    });
  }

  createRows(data.children || [data]);
  table.appendChild(tbody);
  parentElement.appendChild(table);
}

// Get emoji icon based on data type
function getEmojiForType(type) {
  const emojiMap = {
    'object': '📁',
    'array': '📋',
    'string': '📄',
    'number': '🔢',
    'boolean': '☑️'
  };
  return emojiMap[type] || '📦';
}

// Allow loading custom JSON
function loadCustomJson(jsonString) {
  try {
    treeData = JSON.parse(jsonString);
    renderTreeView(treeData);
  } catch (error) {
    console.error('Invalid JSON:', error);
    alert('Invalid JSON format');
  }
}
