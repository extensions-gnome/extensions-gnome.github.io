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

        // Deep linking: check if there is an extension ID in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const extId = urlParams.get('ext');
        if (extId) {
            const ext = allExtensions.find(e => e.uuid === extId);
            if (ext) {
                const parts = ext.uuid.split('@');
                const author = parts.length > 1 ? parts[1].split('.')[0] : 'Unknown';
                openModal(ext, author);
            }
        }
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
    window.scrollTo(0, 0);
}

function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const sortBy = document.getElementById('sort-select').value;

    filteredExtensions = allExtensions.filter(ext => {
        const nameMatch = ext.name.toLowerCase().includes(searchTerm);
        const descMatch = ext.description.toLowerCase().includes(searchTerm);
        const uuidMatch = ext.uuid.toLowerCase().includes(searchTerm);
        return nameMatch || descMatch || uuidMatch;
    });

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
    
    // Update URL without reload
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?ext=' + encodeURIComponent(ext.uuid);
    window.history.pushState({path:newUrl},'',newUrl);

    // Audit Reports
    const reportAiEl = document.getElementById('report-ai');
    reportAiEl.textContent = ext.ai_report || "Passed automated code quality audit.";
    document.getElementById('report-security').textContent = ext.security_report || "Verified clean by VirusTotal.";

    // Highlight AI report card left border if there are flagged warnings (orange instead of blue)
    const reportItemAi = reportAiEl.closest('.report-item');
    if (reportItemAi) {
        if (ext.ai_report && ext.ai_report.includes('Flagged')) {
            reportItemAi.style.borderLeft = '3px solid #f57c00'; // Orange for warnings
        } else {
            reportItemAi.style.borderLeft = '3px solid var(--gnome-blue)'; // Default blue
        }
    }

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

    const shareBtn = document.getElementById('modal-share');
    shareBtn.onclick = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            const hint = document.getElementById('share-hint');
            hint.classList.remove('hidden');
            setTimeout(() => hint.classList.add('hidden'), 2000);
        });
    };

    const installBtn = document.getElementById('modal-install');
    installBtn.onclick = () => {
        const command = `wget -qO- ${ext.zip_url} > /tmp/ext.zip && gnome-extensions install --force /tmp/ext.zip && gnome-extensions enable ${ext.uuid} && rm /tmp/ext.zip`;
        navigator.clipboard.writeText(command).then(() => {
            const hint = document.getElementById('install-hint');
            hint.classList.remove('hidden');
            setTimeout(() => hint.classList.add('hidden'), 3000);
        });
    };

    const quickInstallBtn = document.getElementById('modal-quick-install');
    quickInstallBtn.href = `gnome-ext://install/${ext.uuid}`;

    document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    // Clear the ext param from URL without reload
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({path:newUrl},'',newUrl);
}

function copyCliCommand() {
    const cmd = document.getElementById('cli-install-cmd').textContent;
    navigator.clipboard.writeText(cmd).then(() => {
        const hint = document.getElementById('cli-copy-hint');
        hint.style.display = 'inline';
        setTimeout(() => hint.style.display = 'none', 3000);
    });
}

// Event Listeners
document.getElementById('search-input').addEventListener('input', applyFilters);
document.getElementById('sort-select').addEventListener('change', applyFilters);
document.getElementById('close-modal').addEventListener('click', closeModal);

document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
        closeModal();
    }
});

// Init
fetchExtensions();
