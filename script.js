// URL settings
const REPO_A_URL = 'https://raw.githubusercontent.com/extensions-gnome/store/main/extensions.json';
const LOCAL_JSON = 'extensions.json'; // Set to localized path for production or local testing

let allExtensions = [];

async function fetchExtensions() {
    try {
        // Try production URL first, then local if it fails
        let response;
        try {
            response = await fetch(REPO_A_URL);
        } catch(e) {
            response = await fetch(LOCAL_JSON);
        }
        
        if (!response.ok) throw new Error('Network response was not ok');
        allExtensions = await response.json();
        renderCatalog(allExtensions);
    } catch (error) {
        console.error('Error fetching extensions:', error);
        document.getElementById('catalog').innerHTML = '<p>Error loading the extensions catalog.</p>';
    }
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    // Show selected
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    
    // Update active nav link
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.remove('active');
        if (li.dataset.page === pageId) li.classList.add('active');
    });
}

function renderCatalog(extensions) {
    const catalog = document.getElementById('catalog');
    catalog.innerHTML = '';

    if (extensions.length === 0) {
        catalog.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">No extensions found.</p>';
        return;
    }

    extensions.forEach(ext => {
        const item = document.createElement('div');
        item.className = 'extension-item';
        
        // Extract author: use everything before @, or everything after if it's a domain
        const parts = ext.uuid.split('@');
        const author = parts.length > 1 ? parts[1].split('.')[0] : 'Unknown';

        item.innerHTML = `
            <img src="../${ext.icon}" alt="Icon" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'48\\' height=\\'48\\'><rect width=\\'48\\' height=\\'48\\' fill=\\'%23ddd\\'/></svg>'">
            <div class="ext-info">
                <h3>${ext.name}</h3>
                <span class="author">by ${author}</span>
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
    document.getElementById('modal-desc').textContent = ext.description;
    document.getElementById('modal-icon').src = `../${ext.icon}`;
    
    // Audit Reports
    document.getElementById('report-ai').textContent = ext.ai_report || "Audit in progress or results pending.";
    document.getElementById('report-security').textContent = ext.security_report || "Verification in progress.";

    const slider = document.getElementById('modal-slider');
    slider.innerHTML = '';
    if (ext.demos && ext.demos.length > 0) {
        ext.demos.forEach(demo => {
            const img = document.createElement('img');
            img.src = `../${demo}`;
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

// Search functionality
document.getElementById('search-input').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allExtensions.filter(ext => 
        ext.name.toLowerCase().includes(term) || 
        ext.description.toLowerCase().includes(term) ||
        ext.uuid.toLowerCase().includes(term)
    );
    renderCatalog(filtered);
});

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
