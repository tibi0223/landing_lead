// ─── Nexus Klima - Calculator Configuration ────────────────────────────
// Edit these values to match your business

const CONFIG = {
    // Google Sheets API
    spreadsheetId: '10UkTdUYUQ3Hveg3wjp_j8Sw_SN3U18Ylg0_j2Lcc9rA',
    apiKey: 'AIzaSyC8wLlvvegZXcZA2wiDytXHlM2XpXg_Dmc',
    sheetRange: 'A:G',                     // Kategoria, Marka, Termek Neve, URL, AR, FUNKCIOK, Futesre optimalizalt

    // Pricing constants
    munkadijNetto: 90000,                    // 90,000 Ft + VAT - fixed installation labor
    pipePricePerMeterNetto: 12000,           // 12,000 Ft/m + VAT for extra pipe
    standardPipeMeters: 3,                   // 3m included in base price
    vatRate: 0.27,                           // 27% Hungarian VAT
    vatRateDisplay: '27',

    // Service pricing for non-installation
    serviceFee: {
        'Karbantartás': 25000,
        'Javítás': 40000,
    },

    // Size-to-kW mapping for filtering products
    sizeToKw: {
        '<20m²': '2,6',
        '20–35m²': '3,5',
        '35–50m²': '5,0',
        '50m²+': '7,0',
    },

    // Fallback products when sheet can't be loaded
    fallbackProducts: [
        { category: '1. Alap modellek', brand: 'Hisense', name: 'Eco Comfort 2,6 kW', url: '', price: 238950, features: 'Garancia: 5 ev \u2022 WiFi \u2022 ParaTlanIto \u2022 I Feel \u2022 Energia: A++/A+ \u2022 Ejszakai mod \u2022 Motoros lamella: Fuggoleges \u2022 OntisztIto \u2022 ECO mod \u2022 Csepptálca fűtés \u2022 Fűtési határ: -20°C', heatingOptimized: true },
    ],
};
