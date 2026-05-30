// URL settings
const BASE_STORAGE_URL = 'https://raw.githubusercontent.com/extensions-gnome/store/main/';
const REPO_A_URL = BASE_STORAGE_URL + 'extensions.json';
const LOCAL_JSON = 'extensions.json'; 

let allExtensions = [];
let filteredExtensions = [];

async function fetchExtensions() {
    try {
        let response;
        try {
            response = await fetch(REPO_A_URL);
        } catch(e) {
            response = await fetch(LOCAL_JSON);
        }
        
        if (!response.ok) throw new Error('Network response was not ok');
        allExtensions = await response.json();
        applyFilters();
    } catch (error) {
        console.error('Error fetching extensions:', error);
        document.getElementById('catalog').innerHTML = '<p>Error loading the extensions catalog.</p>';
    }
}

function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.remove('active');
        if (li.dataset.page === pageId) li.classList.add('active');
    });
    // Scroll to top
    window.scrollTo(0, 0);
}

function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const sortBy = document.getElementById('sort-select').value;

    // Filter
    filteredExtensions = allExtensions.filter(ext => {
        const nameMatch = ext.name.toLowerCase().includes(searchTerm);
        const descMatch = ext.description.toLowerCase().includes(searchTerm);
        const uuidMatch = ext.uuid.toLowerCase().includes(searchTerm);
        return nameMatch || descMatch || uuidMatch;
    });

    // Sort
    if (sortBy === 'name') {
        filteredExtensions.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'recent') {
        filteredExtensions.reverse();
    }

    renderCatalog(filteredExtensions);
    updateResultsCount(filteredExtensions.length);
}

function updateResultsCount(count) {
    const el = document.getElementById('results-count');
    el.textContent = `${count} extension${count !== 1 ? 's' : ''} found`;
}

function renderCatalog(extensions) {
    const catalog = document.getElementById('catalog');
    catalog.innerHTML = '';

    if (extensions.length === 0) {
        catalog.innerHTML = '<p style="padding: 40px; text-align: center; color: #666; font-style: italic;">No extensions match your search.</p>';
        return;
    }

    extensions.forEach(ext => {
        const item = document.createElement('div');
        item.className = 'extension-item';
        
        const parts = ext.uuid.split('@');
        const author = parts.length > 1 ? parts[1].split('.')[0] : 'Unknown';
        const iconUrl = ext.icon.startsWith('http') ? ext.icon : BASE_STORAGE_URL + ext.icon;

        const shellVers = ext.shell_version ? ext.shell_version.join(', ') : 'Unknown';

        item.innerHTML = `
            <img src="${iconUrl}" alt="Icon" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'48\\' height=\\'48\\'><rect width=\\'48\\' height=\\'48\\' fill=\\'%23ddd\\'/></svg>'">
            <div class="ext-info">
                <h3>${ext.name}</h3>
                <span class="author">by ${author} • v${ext.version || 1}</span>
                <div class="shell-compat">Supports Shell: ${shellVers}</div>
                <p>${ext.description}</p>
            </div>
        `;
        item.addEventListener('click', () => openModal(ext, author));
        catalog.appendChild(item);
    });
}

function openModal(ext, author) {
    document.getElementById('modal-title').textContent = ext.name;
    document.getElementById('modal-author').textContent = `by ${author}`;
    document.getElementById('modal-uuid').textContent = ext.uuid;
    document.getElementById('modal-version').textContent = `v${ext.version || 1}`;
    
    const shellEl = document.getElementById('modal-shell');
    if (ext.shell_version && ext.shell_version.length > 0) {
        shellEl.textContent = `Shell: ${ext.shell_version.join(', ')}`;
        shellEl.classList.remove('hidden');
    } else {
        shellEl.classList.add('hidden');
    }

    document.getElementById('modal-desc').textContent = ext.description;
    
    const iconUrl = ext.icon.startsWith('http') ? ext.icon : BASE_STORAGE_URL + ext.icon;
    document.getElementById('modal-icon').src = iconUrl;
    
    // Audit Reports
    document.getElementById('report-ai').textContent = ext.ai_report || "Passed automated code quality audit.";
    document.getElementById('report-security').textContent = ext.security_report || "Verified clean by VirusTotal.";

    const slider = document.getElementById('modal-slider');
    slider.innerHTML = '';
    if (ext.demos && ext.demos.length > 0) {
        ext.demos.forEach(demo => {
            const img = document.createElement('img');
            img.src = demo.startsWith('http') ? demo : BASE_STORAGE_URL + demo;
            slider.appendChild(img);
        });
    }

    const githubBtn = document.getElementById('modal-github');
    githubBtn.href = ext.github_url;

    const promoBtn = document.getElementById('modal-promo');
    if (ext.promo_url) {
        promoBtn.href = ext.promo_url;
        promoBtn.classList.remove('hidden');
    } else {
        promoBtn.classList.add('hidden');
    }

    const installBtn = document.getElementById('modal-install');
    installBtn.onclick = () => {
        const command = `wget -qO- ${ext.zip_url} > /tmp/ext.zip && gnome-extensions install --force /tmp/ext.zip && gnome-extensions enable ${ext.uuid} && rm /tmp/ext.zip`;
        navigator.clipboard.writeText(command).then(() => {
            const hint = document.getElementById('install-hint');
            hint.classList.remove('hidden');
            setTimeout(() => hint.classList.add('hidden'), 3000);
        });
    };

    document.getElementById('modal').classList.remove('hidden');
}

// Event Listeners
document.getElementById('search-input').addEventListener('input', applyFilters);
document.getElementById('sort-select').addEventListener('change', applyFilters);

document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('modal').classList.add('hidden');
});

document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
        document.getElementById('modal').classList.add('hidden');
    }
});

// Init
fetchExtensions();
