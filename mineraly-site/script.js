let rawData = [];
let filteredData = [];
let colIndex = {};
let currentSortCol = null;
let currentSortDir = 'asc';
let photosEnabled = false; // výchozí: fotky se NENAČÍTAJÍ

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
            // odstranění BOM, pokud tam Excel něco přilepí
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
