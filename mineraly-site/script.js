// --- Stav aplikace ---
let rawData = [];
let filteredData = [];
let colIndex = {};
let currentSortCol = null;
let currentSortDir = 'asc';
let photosEnabled = false; // výchozí: fotky vypnuté

// --- Mapování názvů sloupců v CSV ---
const columnKeywords = {
    inv: ['inventarni', 'cislo', 'id'],
    name: ['nazev', 'mineral'],
    loc: ['lokalita'],
    locDetail: ['upresneni'],
    region: ['region', 'kraj', 'oblast'],
    year: ['rok'],
    date: ['datum'],
    quality: ['kvalita'],
    rarity: ['vzacnost'],
    condition: ['stav'],
    size: ['velikost'],
    group: ['grupa', 'skupina'],
    desc: ['popis', 'poznamka']
};

function normalizeHeader(str) {
    return str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

// --- Načtení CSV (UTF‑8) ---
function loadCSV() {
    fetch('data.csv?v=' + Date.now())
        .then(r => r.arrayBuffer())
        .then(buffer => {
            let text = new TextDecoder('utf-8').decode(buffer);
            // odstranění BOM
            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
            parseCSV(text);
        })
        .catch(err => {
            console.error(err);
            const el = document.getElementById('loading');
            if (el) el.textContent = 'Chyba načítání dat.';
        });
}

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(separator);

    // namapuj indexy sloupců
    colIndex = {};
    for (const key in columnKeywords) {
        colIndex[key] = -1;
        const keywords = columnKeywords[key];
        headers.forEach((h, idx) => {
            const normH = normalizeHeader(h);
            if (keywords.some(k => normH.includes(k))) {
                if (colIndex[key] === -1) colIndex[key] = idx;
            }
        });
    }

    rawData = lines.slice(1).map(line => {
        if (!line.trim()) return null;
        return line.split(separator);
    }).filter(Boolean);

    filteredData = [...rawData];

    initControls();
    renderTable();

    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';
}

// --- Pomocné funkce pro data ---
function getVal(row, key) {
    const idx = colIndex[key];
    if (idx === -1 || !row[idx]) return '';
    return row[idx].trim().replace(/^"|"$/g, '');
}

// --- vykreslení tabulky ---
function renderTable() {
    const tbody = document.querySelector('#mineralsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    filteredData.forEach(row => {
        const tr = document.createElement('tr');

        const invNum = getVal(row, 'inv');

        // fotka – jen pokud je zapnuto photosEnabled
        let imgHtml = '';
        if (photosEnabled && invNum) {
            const imgPath = `img/${invNum}.jpg`; // případně .JPG
            imgHtml = `
                <a href="${imgPath}" target="_blank">
                    <img src="${imgPath}" class="mineral-photo"
                         onerror="this.style.display='none'" alt="foto">
                </a>`;
        }

        tr.innerHTML = `
            <td>${invNum}</td>
            <td>${imgHtml}</td>
            <td><b>${getVal(row, 'name')}</b></td>
            <td>${getVal(row, 'loc')}</td>
            <td>${getVal(row, 'locDetail')}</td>
            <td>${getVal(row, 'region')}</td>
            <td>${getVal(row, 'year')}</td>
            <td>${getVal(row, 'date')}</td>
            <td>${getVal(row, 'quality')}</td>
            <td>${getVal(row, 'rarity')}</td>
            <td>${getVal(row, 'condition')}</td>
            <td>${getVal(row, 'size')}</td>
            <td>${getVal(row, 'group')}</td>
            <td><small>${getVal(row, 'desc')}</small></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- filtry a ovládání ---
function initControls() {
    const regionSelect = document.getElementById('regionFilter');
    const searchInput = document.getElementById('searchInput');
    const togglePhotos = document.getElementById('togglePhotos');

    // naplnění regionů
    if (regionSelect) {
        const regions = new Set();
        rawData.forEach(row => {
            const r = getVal(row, 'region');
            if (r) regions.add(r);
        });

        regionSelect.innerHTML = '<option value="">Všechny regiony</option>';
        [...regions].sort((a, b) => a.localeCompare(b, 'cs')).forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            regionSelect.appendChild(opt);
        });

        regionSelect.addEventListener('change', applyFilters);
    }

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    if (togglePhotos) {
        // výchozí stav – fotky vypnuté
        togglePhotos.checked = false;
        photosEnabled = false;

        togglePhotos.addEventListener('change', () => {
            photosEnabled = togglePhotos.checked;
            // jen překreslí tabulku – teprve teď se vloží <img src=...>
            renderTable();
        });
    }

    // klikání na hlavičky pro řazení
    document.querySelectorAll('#mineralsTable thead th[data-key]').forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const key = th.dataset.key;
            if (key === 'foto') return; // fotky neřadíme
            sortData(key);
        });
    });
}

// --- filtrování ---
function applyFilters() {
    const regionSelect = document.getElementById('regionFilter');
    const searchInput = document.getElementById('searchInput');

    const regionVal = regionSelect ? regionSelect.value : '';
    const searchVal = searchInput ? searchInput.value.toLowerCase() : '';

    filteredData = rawData.filter(row => {
        const region = getVal(row, 'region');
        const fullText = row.join(' ').toLowerCase();

        const matchRegion = !regionVal || region === regionVal;
        const matchSearch = !searchVal || fullText.includes(searchVal);

        return matchRegion && matchSearch;
    });

    renderTable();
}

// --- řazení ---
function sortData(key) {
    if (currentSortCol === key) {
        currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortCol = key;
        currentSortDir = 'asc';
    }

    // šipky v hlavičce
    document.querySelectorAll('#mineralsTable thead th[data-key]').forEach(th => {
        th.textContent = th.textContent.replace(' ▲', '').replace(' ▼', '');
    });
    const activeTh = document.querySelector(`#mineralsTable thead th[data-key="${key}"]`);
    if (activeTh) {
        activeTh.textContent += currentSortDir === 'asc' ? ' ▲' : ' ▼';
    }

    filteredData.sort((a, b) => {
        const valA = getVal(a, key);
        const valB = getVal(b, key);

        const numA = parseFloat(valA.replace(',', '.'));
        const numB = parseFloat(valB.replace(',', '.'));

        if (!isNaN(numA) && !isNaN(numB) && valA.length < 10 && valB.length < 10) {
            return currentSortDir === 'asc' ? numA - numB : numB - numA;
        }

        return currentSortDir === 'asc'
            ? valA.localeCompare(valB, 'cs')
            : valB.localeCompare(valA, 'cs');
    });

    renderTable();
}

// --- start ---
loadCSV();
