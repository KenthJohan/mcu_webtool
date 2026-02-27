let allIcons = {};
let filteredIcons = {};

async function loadIcons() {
    try {
        const response = await fetch('lookup.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allIcons = await response.json();
        filteredIcons = { ...allIcons };
        
        document.getElementById('loadingContainer').style.display = 'none';
        document.getElementById('totalCount').textContent = Object.keys(allIcons).length;
        document.getElementById('foundCount').textContent = Object.keys(allIcons).length;
        
        renderIcons();
        setupSearchListener();
    } catch (error) {
        console.error('Error loading icons:', error);
        document.getElementById('loadingContainer').innerHTML = 
            '<h2 style="color: white;">Error loading icons</h2>';
    }
}

function renderIcons() {
    const gridContainer = document.getElementById('gridContainer');
    const noResults = document.getElementById('noResults');
    
    // Clear grid
    gridContainer.innerHTML = '';
    
    const entries = Object.entries(filteredIcons);
    
    if (entries.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    entries.forEach(([name, path]) => {
        const card = createIconCard(name, "../" + path);
        gridContainer.appendChild(card);
    });
}

function createIconCard(name, path) {
    const card = document.createElement('div');
    card.className = 'icon-card';
    
    card.innerHTML = `
        <div class="icon-preview">
            <img 
                src="${path}" 
                alt="${name}"
                onerror="this.style.display='none'; this.parentElement.textContent='⚠️';"
                loading="lazy"
            >
        </div>
        <div class="icon-name" title="${name}">${name}</div>
        <div class="icon-path" title="${path}">${path}</div>
        <div class="copy-hint">Click to copy</div>
    `;
    
    card.addEventListener('click', () => copyToClipboard(name));
    
    return card;
}

function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            filteredIcons = { ...allIcons };
        } else {
            filteredIcons = {};
            Object.entries(allIcons).forEach(([name, path]) => {
                if (name.toLowerCase().includes(searchTerm) || 
                    path.toLowerCase().includes(searchTerm)) {
                    filteredIcons[name] = path;
                }
            });
        }
        
        document.getElementById('foundCount').textContent = Object.keys(filteredIcons).length;
        renderIcons();
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show feedback
        const previousText = event.target.textContent;
        
        // Find the card element
        const card = event.currentTarget;
        const nameElement = card.querySelector('.icon-name');
        const originalText = nameElement.textContent;
        
        nameElement.textContent = '✓ Copied!';
        nameElement.style.color = '#667eea';
        
        setTimeout(() => {
            nameElement.textContent = originalText;
            nameElement.style.color = '#333';
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Load icons when page is ready
document.addEventListener('DOMContentLoaded', loadIcons);
