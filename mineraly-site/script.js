let rawData = [];
let filteredData = [];
let colIndex = {};
let currentSortCol = null;
let currentSortDir = 'asc';
let photosEnabled = false; // výchozí: fotky vypnuté

// Klíčová slova pro mapování hlaviček
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

function loadCSV() {
    fetch('data.csv?v=' + new Date().getTime())
        .then(r => r.arrayBuffer())
        .then(buffer => {
            let text = new TextDecoder('utf-8').decode(buffer);
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }
            parseCSV(text);
        })
        .catch(e => {
            console.error(e);
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

    // Mapování sloupců
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
    }).filter(r => r !== null);

    filteredData = [...rawData];

    initControls();
    renderTable();

    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';
}

function getVal(row, key) {
    const idx = colIndex[key];
    if (idx === -1 || !row[idx]) return '';
    return row[idx].trim().replace(/^"|"$/g, '');
}

function renderTable() {
    const tbody = document.querySelector('#mineralsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    filteredData.forEach(row => {
        const tr = document.createElement('tr');

        const invNum = getVal(row, 'inv');

        // Fotka – jen když je zapnutý přepínač
        let imgHtml = '';
        if (photosEnabled && invNum) {
            const imgPath = `img/${invNum}.jpg`; // případně změň na .JPG
            imgHtml = `<a href="${imgPath}" target="_blank">
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
