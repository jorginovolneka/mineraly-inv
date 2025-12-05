let rawData = [];
let filteredData = [];
let colIndex = {}; 
let currentSortCol = null;
let currentSortDir = 'asc';

// Klíčová slova pro hledání sloupců (bez diakritiky, malá písmena)
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
    // Přidáme timestamp, aby prohlížeč nenačítal starou verzi z mezipaměti
    fetch('data.csv?v=' + new Date().getTime())
        .then(r => r.arrayBuffer())
        .then(buffer => {
            // 1. Natvrdo čteme UTF-8 (protože tvůj soubor je v UTF-8)
            let text = new TextDecoder('utf-8').decode(buffer);
            
            // Ošetření BOM (Byte Order Mark) na začátku souboru, co tam dává Excel
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }

            parseCSV(text);
        })
        .catch(e => {
            console.error(e);
            document.getElementById('loading').textContent = 'Chyba načítání dat. Zkontrolujte console (F12).';
        });
}

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    // Detekce oddělovače (středník vs čárka)
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
            // Pokud hlavička obsahuje klíčové slovo
            if (keywords.some(k => normH.includes(k))) {
                if (colIndex[key] === -1) colIndex[key] = idx;
            }
        });
    }
    
    // Načtení dat
    rawData = lines.slice(1).map(line => {
        // Ošetření prázdných řádků
        if (!line.trim()) return null;
        return line.split(separator);
    }).filter(r => r !== null);

    filteredData = [...rawData];
    
    initFilters();
    renderTable();
    const loadingEl = document.getElementById('loading');
    if(loadingEl) loadingEl.style.display = 'none';
}

function getVal(row, key) {
    const idx = colIndex[key];
    if (idx === -1 || !row[idx]) return '';
    // Odstraníme uvozovky, které Excel někdy přidává
    return row[idx].trim().replace(/^"|"$/g, ''); 
}

function renderTable() {
    const tbody = document.querySelector('#mineralsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    filteredData.forEach(row => {
        const tr = document.createElement('tr');
        
        const invNum = getVal(row, 'inv');
        let imgHtml = '';
        
        // Logika pro fotku: pokud je inv. číslo 1, hledá 1.jpg (nebo 1.JPG)
        if (invNum) {
            // Zde si můžeš změnit příponu na .JPG pokud máš fotky z foťáku
            const imgPath = `img/${invNum}.jpg`; 
            imgHtml = `<a href="${imgPath}" target="_blank">
                        <img src="${imgPath}" class="mineral-photo" 
                             onerror="this.style.display='none'" 
                             alt="foto">
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

function initFilters() {
    const regionSelect = document.getElementById('regionFilter');
    if (!regionSelect) return;
    
    const regions = new Set();
    rawData.forEach(row => {
        const r = getVal(row, 'region');
        if (r) regions.add(r);
    });

    // Vyčistit a seřadit
    regionSelect.innerHTML = '<option value="">Všechny regiony</option>';
    [...regions].sort((a, b) => a.localeCompare(b, 'cs')).forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        regionSelect.appendChild(opt);
    });

    regionSelect.addEventListener('change', filterData);
    const searchIn = document.getElementById('searchInput');
    if (searchIn) searchIn.addEventListener('keyup', filterData);
    
    document.querySelectorAll('th[data-key]').forEach(th => {
        th.addEventListener('click', () => {
            if (th.dataset.key === 'foto') return;
            sortData(th.dataset.key);
        });
    });
}

function filterData() {
    const regionVal = document.getElementById('regionFilter').value;
    const searchVal = document.getElementById('searchInput').value.toLowerCase();

    filteredData = rawData.filter(row => {
        const r = getVal(row, 'region');
        const fullText = row.join(' ').toLowerCase();
        
        const matchRegion = !regionVal || r === regionVal;
        const matchSearch = !searchVal || fullText.includes(searchVal);
        
        return matchRegion && matchSearch;
    });

    renderTable();
}

function sortData(key) {
    if (currentSortCol === key) {
        currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortCol = key;
        currentSortDir = 'asc';
    }

    // Šipky v záhlaví
    document.querySelectorAll('th').forEach(th => {
        th.textContent = th.textContent.replace(' ▲','').replace(' ▼','');
    });
    const activeTh = document.querySelector(`th[data-key="${key}"]`);
    if(activeTh) activeTh.textContent += currentSortDir === 'asc' ? ' ▲' : ' ▼';

    filteredData.sort((a, b) => {
        const valA = getVal(a, key);
        const valB = getVal(b, key);

        const numA = parseFloat(valA.replace(',', '.'));
        const numB = parseFloat(valB.replace(',', '.'));

        // Pokud jsou oba sloupce čísla (např. rok nebo ID), řaď číselně
        if (!isNaN(numA) && !isNaN(numB) && valA.length < 10) {
            return currentSortDir === 'asc' ? numA - numB : numB - numA;
        }

        return currentSortDir === 'asc' 
            ? valA.localeCompare(valB, 'cs') 
            : valB.localeCompare(valA, 'cs');
    });

    renderTable();
}

// Spuštění
loadCSV();
