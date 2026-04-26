        // ─── State ────────────────────────────────────────────────────────
        const state = {
            postcode: '',
            service: '',
            property: '',
            size: '',
            heatingPreference: '',
            goal: '',
            product: null,
            pipeMeters: 0,
            photo: null,
            name: '',
            email: '',
            phone: '',
        };

        let allProducts = [];
        let filteredProducts = [];
        const stepLabels = ['Hol lesz a klíma?', 'Mire van szüksége?', 'Milyen otthon?', 'Mekkora a helyiség?', 'Fűtés is kellene?', 'Melyik klíma illik Önhöz?', 'Milyen hosszú a cső?', 'Egy fotó segít', 'Az Ön becsült ára'];
        let currentStep = 1;
        const TOTAL_STEPS = 9;

        // ─── Google Sheets API ────────────────────────────────────────────
        async function fetchProducts() {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}/values/${CONFIG.sheetRange}?key=${CONFIG.apiKey}`;
            const ctrl = new AbortController();
            const t = setTimeout(function() { ctrl.abort(); }, 18000);
            try {
                const res = await fetch(url, { signal: ctrl.signal });
                if (!res.ok) throw new Error('API error: ' + res.status);
                const data = await res.json();
                const rows = data.values;
                if (!rows || rows.length < 2) throw new Error('No data rows');
                const products = [];
                const seenNames = new Set();
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const name = (row[2] || '').trim();
                    if (!name) continue;
                    if (seenNames.has(name)) continue;
                    seenNames.add(name);

                    const price = parseInt(String(row[4] || '0').replace(/[\s,.]/g, '')) || 0;
                    if (price === 0) continue;

                    const spotVal = (row[7] || '').trim().toLowerCase();
                    products.push({
                        category: (row[0] || '').trim(),
                        brand: (row[1] || '').trim(),
                        name: name,
                        url: (row[3] || '').trim(),
                        price: price,
                        features: (row[5] || '').trim(),
                        heatingOptimized: (row[6] || '').trim().toLowerCase() === 'igen',
                        spotlight: ['legnépszerűbb', 'legolcsóbb', 'prémium'].includes(spotVal) ? spotVal : '',
                    });
                }
                return products;
            } catch (e) {
                console.warn('Sheet fetch failed:', e.message);
                return null;
            } finally {
                clearTimeout(t);
            }
        }

        function loadFallbackProducts() {
            allProducts = CONFIG.fallbackProducts.map(p => ({ ...p, heatingOptimized: p.heatingOptimized || false, spotlight: p.spotlight || '' }));
            document.getElementById('productLoader').classList.remove('show');
            document.getElementById('productError').style.display = 'none';
            renderProductGrid();
        }

        // ─── Product Grid Rendering ──────────────────────────────────────
        function filterProductsBySize() {
            let products = allProducts;
            // Exclude multi and indoor-unit categories
            products = products.filter(p => {
                const cat = (p.category || '').toLowerCase();
                return !cat.startsWith('4.') && !cat.startsWith('5.') && cat.indexOf('multi') === -1 && cat.indexOf('beltéri') === -1;
            });
            const kw = CONFIG.sizeToKw[state.size];
            if (kw) {
                const kwNorm = String(kw).trim();
                const kwDot = kwNorm.replace(',', '.');
                const kwComma = kwNorm.replace('.', ',');
                products = products.filter(function(p) {
                    const n = (p.name || '');
                    return n.includes(kwNorm) || n.includes(kwDot) || n.includes(kwComma);
                });
            }
            if (state.heatingPreference === 'futes') {
                products = products.filter(p => p.heatingOptimized);
            } else if (state.heatingPreference === 'hutes') {
                products = products.filter(p => !p.heatingOptimized);
            }
            return products;
        }

        // ─── Curated Product Selection ──────────────────────────────────
        let showAllProducts = false;

        function getCuratedProducts(products) {
            // 1 cheapest, up to 2 bestseller, 1 premium, remaining shown via "show all"
            const cheapest = [...products].sort((a, b) => a.price - b.price).slice(0, 1);

            const markedBestsellers = products.filter(p => p.spotlight === 'legnépszerűbb');
            const shuffled = [...markedBestsellers].sort(() => Math.random() - 0.5);
            const bestsellers = shuffled.slice(0, 2);

            const premium = [...products].sort((a, b) => b.price - a.price).slice(0, 1);

            // Build curated set (no duplicates by name)
            const curatedMap = new Map();
            [...cheapest, ...bestsellers, ...premium].forEach(p => {
                if (!curatedMap.has(p.name)) curatedMap.set(p.name, p);
            });
            const curated = Array.from(curatedMap.values());

            // Remaining products (not in curated set)
            const curatedNames = new Set(curated.map(p => p.name));
            const remaining = products.filter(p => !curatedNames.has(p.name));

            return { curated, remaining };
        }

        function renderProductGrid() {
            const grid = document.getElementById('productGrid');
            const loader = document.getElementById('productLoader');
            const errorDiv = document.getElementById('productError');
            try {
            filteredProducts = filterProductsBySize();

            if (!filteredProducts.length) {
                filteredProducts = [...allProducts];
            }

            if (!filteredProducts.length) {
                grid.style.display = 'none';
                errorDiv.style.display = 'block';
                return;
            }

            const { curated, remaining } = getCuratedProducts(filteredProducts);
            const selectedName = state.product ? state.product.name : '';

            function renderCard(p, idx, showBadge) {
                const isSelected = p.name === selectedName;
                const priceFormatted = fmt(p.price);
                const brandEsc = p.brand ? escapeHtml(p.brand) : '';
                const nameEsc = escapeHtml(p.name);

                // Tags: category and heating use unified product-tag class
                const categoryTag = p.category
                    ? '<span class="product-tag" style="background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.55);">' + escapeHtml(p.category) + '</span>'
                    : '';
                const heatingTag = p.heatingOptimized
                    ? '<span class="product-tag" style="background:rgba(76,175,80,0.08);color:#66bb6a;">Hűtés + fűtés</span>'
                    : '<span class="product-tag" style="background:rgba(255,152,0,0.06);color:#ffa726;">Csak hűtés</span>';

                // Badge
                let badgeHtml = '';
                if (showBadge) {
                    if (p.spotlight === 'legnépszerűbb') {
                        badgeHtml = '<div class="curated-badge badge-bestseller">Legnépszerűbb</div>';
                    } else if (p.price === Math.min(...filteredProducts.map(x => x.price))) {
                        badgeHtml = '<div class="curated-badge badge-cheapest">Legjobb ár</div>';
                    } else if (p.price === Math.max(...filteredProducts.map(x => x.price))) {
                        badgeHtml = '<div class="curated-badge badge-premium">Prémium</div>';
                    }
                    if (p.spotlight === 'legolcsóbb') {
                        badgeHtml = '<div class="curated-badge badge-cheapest">Legjobb ár</div>';
                    } else if (p.spotlight === 'prémium') {
                        badgeHtml = '<div class="curated-badge badge-premium">Prémium</div>';
                    }
                }

                // Features list — split by pipe or bullet
                let featuresHtml = '';
                if (p.features) {
                    const items = p.features.split('\u2022').map(s => s.trim()).filter(Boolean);
                    // If no bullet found, try pipe
                    const finalItems = items.length > 1 ? items : p.features.split('|').map(s => s.trim()).filter(Boolean);
                    if (finalItems.length > 0) {
                        featuresHtml = '<div class="card-features">' +
                            finalItems.map(function(f) {
                                return '<div class="card-feature-item">' +
                                    '<svg class="card-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
                                    '<span>' + escapeHtml(f) + '</span>' +
                                '</div>';
                            }).join('') +
                        '</div>';
                    } else {
                        // Fallback: show raw truncated
                        const shortFeatures = p.features ? p.features.substring(0, 100) + (p.features.length > 100 ? '...' : '') : '';
                        featuresHtml = '<div class="card-features" style="font-size:11px;color:rgba(255,255,255,0.5);line-height:1.4;">' + escapeHtml(shortFeatures) + '</div>';
                    }
                }

                // Expand/collapse arrow
                const expandId = 'details-' + idx;
                const expandArrow = '<button type="button" class="card-expand-btn" onclick="event.stopPropagation();toggleCardDetails(\'' + expandId + '\', this)" aria-label="Részletek">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
                '</button>';

                return '<div class="choice-card items-center' + (isSelected ? ' selected' : '') + '" onclick="selectProduct(' + idx + ')" data-index="' + idx + '">' +
                    (badgeHtml || '<div class="check-badge"><svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>') +
                    '<div class="card-header">' +
                        '<div class="card-title-row">' +
                            '<div class="card-name-group">' +
                                (brandEsc ? '<span class="card-brand">' + brandEsc + '</span>' : '') +
                                '<span class="card-model">' + nameEsc + '</span>' +
                            '</div>' +
                            '<span class="card-price">' + priceFormatted + '</span>' +
                        '</div>' +
                        '<div class="card-meta-row">' +
                            categoryTag +
                            heatingTag +
                        '</div>' +
                        '<div class="card-details" id="' + expandId + '">' +
                            featuresHtml +
                        '</div>' +
                    '</div>' +
                    '<div class="card-footer">' +
                        expandArrow +
                        '<span class="card-select-hint">Ezt választom</span>' +
                    '</div>' +
                '</div>';
            }

            let html = '';

            // Curated section
            curated.forEach((p, cIdx) => {
                const globalIdx = filteredProducts.indexOf(p);
                html += renderCard(p, globalIdx, true);
            });

            // "Show all" toggle
            if (remaining.length > 0) {
                const remainingCount = remaining.length;
                html += '<button type="button" class="show-all-btn" onclick="toggleShowAll()" id="showAllBtn">Összes megjelenítése (' + remainingCount + ')</button>';
                html += '<div id="remainingProducts" class="product-grid-extra" style="display:none;">';
                remaining.forEach((p, rIdx) => {
                    const globalIdx = filteredProducts.indexOf(p);
                    html += renderCard(p, globalIdx, false);
                });
                html += '</div>';
            }

            grid.innerHTML = html;
            grid.style.display = 'block';
            errorDiv.style.display = 'none';

            // Scroll to grid so products are visible
            try { grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e) {}

            if (state.product) {
                setTimeout(() => goToStep(7), 260);
            }
            } catch (err) {
                console.error('renderProductGrid', err);
                grid.style.display = 'none';
                errorDiv.style.display = 'block';
            } finally {
                loader.classList.remove('show');
            }
        }

        function toggleShowAll() {
            const el = document.getElementById('remainingProducts');
            const btn = document.getElementById('showAllBtn');
            if (el.style.display === 'none') {
                el.style.display = 'block';
                el.style.maxHeight = el.scrollHeight + 'px';
                btn.textContent = 'Kevesebb mutatása';
            } else {
                el.style.display = 'none';
                btn.textContent = 'Összes megjelenítése (' + (el.querySelectorAll('.choice-card').length || '') + ')' ;
            }
        }

        function toggleCardDetails(id, btn) {
            const el = document.getElementById(id);
            if (!el) return;
            const isOpen = el.classList.contains('open');
            el.classList.toggle('open');
            const arrow = btn.querySelector('svg');
            if (arrow) {
                arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        }

        function selectProduct(idx) {
            const product = filteredProducts[idx];
            if (!product) return;
            state.product = product;

            const cards = document.querySelectorAll('.choice-card.selected');
            cards.forEach(c => c.classList.remove('selected'));
            const selected = document.querySelector('.choice-card[data-index="' + idx + '"]');
            if (selected) selected.classList.add('selected');

            setTimeout(() => goToStep(7), 260);
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // ─── Navigation ───────────────────────────────────────────────────
        function goToStep(n) {
            document.getElementById('step-' + currentStep).classList.remove('active');
            currentStep = n;
            if (n === 'success') {
                document.getElementById('step-success').classList.add('active');
                document.getElementById('progressWrap').style.display = 'none';
                return;
            }
            document.getElementById('step-' + n).classList.add('active');
            updateProgress(n);
            if (n === 6) loadProductsForStep6();
            if (n === 9) buildQuote();
            document.getElementById('contact').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function goBack(n) {
            goToStep(n);
        }

        function updateProgress(n) {
            document.getElementById('stepCount').textContent = n + ' / ' + TOTAL_STEPS;
            document.getElementById('stepLabel').textContent = stepLabels[n - 1] || '';
            const dots = document.querySelectorAll('#progressDots .progress-dot');
            dots.forEach(function(dot, i) {
                dot.classList.remove('done', 'current');
                const step = i + 1;
                if (step < n) dot.classList.add('done');
                else if (step === n) dot.classList.add('current');
            });
            // legacy – no-op on hidden bar
            var fill = document.getElementById('progressFill');
            if (fill) fill.style.width = ((n / TOTAL_STEPS) * 100) + '%';
        }

        // ─── Step 1: Postcode ─────────────────────────────────────────────
        function validatePostcode() {
            const val = document.getElementById('postcodeInput').value.trim();
            const err = document.getElementById('postcodeError');
            const inp = document.getElementById('postcodeInput');
            if (/^\d{4}$/.test(val)) {
                state.postcode = val;
                inp.classList.remove('error');
                err.style.display = 'none';
                document.getElementById('serviceAreaNote').classList.remove('show');
                goToStep(2);
            } else {
                inp.classList.add('error');
                err.style.display = 'block';
                inp.focus();
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            var pcInput = document.getElementById('postcodeInput');
            if (pcInput) {
                pcInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') validatePostcode();
                });
            }
        });

        // ─── Step 5: Heating Preference ──────────────────────────────────
        function selectHeatingPref(value) {
            state.heatingPreference = value;
            state.goal = value === 'futes' ? 'Hűtés + fűtés' : 'Csak hűtés';
            goToStep(6);
        }

        // ─── Choice cards ─────────────────────────────────────────────────
        function selectChoice(key, value, el) {
            state[key] = value;
            const siblings = el.parentElement.querySelectorAll('.choice-card');
            siblings.forEach(function(c) { c.classList.remove('selected'); });
            el.classList.add('selected');

            setTimeout(function() { goToStep(currentStep + 1); }, 260);
        }

        // ─── Step 6: Product Loading ──────────────────────────────────────
        async function loadProductsForStep6() {
            const grid = document.getElementById('productGrid');
            const loader = document.getElementById('productLoader');
            const errorDiv = document.getElementById('productError');
            const hint = document.getElementById('productFilterHint');

            grid.style.display = 'none';
            loader.classList.add('show');
            loader.style.removeProperty('display');
            errorDiv.style.display = 'none';
            hint.style.display = 'none';

            // Show filter hints
            const kw = CONFIG.sizeToKw[state.size];
            let hintText = '';
            if (kw) {
                hintText = 'Ehhez a mérethez (' + state.size + ') nagyjából ' + kw + ' kW körüli készülék illik jól.';
            } else {
                hintText = 'Ehhez a megadott mérethez válogattunk készülékeket.';
            }
            if (state.heatingPreference === 'futes') {
                hintText += ' Fűtésre is alkalmas modellek.';
            } else {
                hintText += ' Inkább hűtésre való, egyszerűbb megoldások.';
            }
            hint.innerHTML = '<strong>' + hintText + '</strong>';
            hint.style.display = 'block';

            if (!allProducts.length) {
                const result = await fetchProducts();
                if (result && result.length) {
                    allProducts = result;
                } else {
                    allProducts = [...CONFIG.fallbackProducts];
                }
            }

            if (allProducts.length) {
                renderProductGrid();
            } else {
                loader.classList.remove('show');
                errorDiv.style.display = 'block';
            }
        }

        // ─── Step 7: Pipe Length ──────────────────────────────────────────
        function updatePipeCalc() {
            const val = parseFloat(document.getElementById('pipeMetersInput').value) || 0;
            const extra = Math.max(0, val - CONFIG.standardPipeMeters);
            const pipeCostNetto = extra * CONFIG.pipePricePerMeterNetto;
            const pipeCostBrutto = pipeCostNetto * (1 + CONFIG.vatRate);

            state.pipeMeters = val;

            const resultEl = document.getElementById('pipeCalcResult');
            if (val > 0 && extra > 0) {
                resultEl.textContent = '+ ' + fmt(pipeCostBrutto);
                resultEl.style.color = 'var(--brand-light)';
            } else if (val > 0) {
                resultEl.textContent = '0 Ft (benne van az árban)';
                resultEl.style.color = '#4caf50';
            } else {
                resultEl.textContent = '— (alap 3 m)';
                resultEl.style.color = '#9a9a9a';
            }

            const extraRow = document.getElementById('pipeExtraRow');
            const extraLabel = document.getElementById('pipeExtraLabel');
            const extraPrice = document.getElementById('pipeExtraPrice');
            if (val > 0 && extra > 0) {
                extraRow.style.display = 'flex';
                extraLabel.textContent = 'Többlet: ' + extra + ' m';
                extraPrice.textContent = '+ ' + fmt(pipeCostBrutto) + ' a többlet';
            } else {
                extraRow.style.display = 'none';
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            var pipeInput = document.getElementById('pipeMetersInput');
            if (pipeInput) {
                pipeInput.addEventListener('input', updatePipeCalc);
                pipeInput.addEventListener('change', updatePipeCalc);
            }
        });

        // ─── Step 8: Photo ────────────────────────────────────────────────
        function handleFileSelect(input) {
            const file = input.files[0];
            if (!file) return;
            state.photo = file;
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('previewImg').src = e.target.result;
                document.getElementById('previewName').textContent = file.name + ' (' + (file.size / 1024 / 1024).toFixed(2) + ' MB)';
                document.getElementById('filePreview').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }

        document.addEventListener('DOMContentLoaded', function() {
            var drop = document.getElementById('fileDrop');
            if (drop) {
                drop.addEventListener('dragover', function(e) { e.preventDefault(); drop.classList.add('dragover'); });
                drop.addEventListener('dragleave', function() { drop.classList.remove('dragover'); });
                drop.addEventListener('drop', function(e) {
                    e.preventDefault(); drop.classList.remove('dragover');
                    var file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                        state.photo = file;
                        var reader = new FileReader();
                        reader.onload = function(ev) {
                            document.getElementById('previewImg').src = ev.target.result;
                            document.getElementById('previewName').textContent = file.name;
                            document.getElementById('filePreview').style.display = 'block';
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }
        });

        // ─── Pricing logic ────────────────────────────────────────────────
        function calculatePrice() {
            const breakdown = {};
            let nettoTotal = 0;

            if (state.service === 'Klímatelepítés') {
                breakdown['Munkadíj'] = CONFIG.munkadijNetto;
                nettoTotal += CONFIG.munkadijNetto;

                const productPrice = state.product ? state.product.price : 0;
                if (productPrice > 0) {
                    breakdown['Klíma'] = productPrice;
                    nettoTotal += productPrice;
                }

                const pipeMeters = parseFloat(state.pipeMeters) || 0;
                const extraMeters = Math.max(0, pipeMeters - CONFIG.standardPipeMeters);
                if (extraMeters > 0) {
                    const pipeCost = extraMeters * CONFIG.pipePricePerMeterNetto;
                    breakdown['Csőhosszabbítás (' + extraMeters + ' m)'] = pipeCost;
                    nettoTotal += pipeCost;
                }
            } else {
                // Map page service names to config keys
                var svcMap = {
                    'Klímatelepítés': 'Beszerelés',
                    'Éves karbantartás': 'Karbantartás',
                    'Mély tisztítás': 'Javítás'
                };
                var svcKey = svcMap[state.service] || state.service;
                const fee = CONFIG.serviceFee[svcKey] || 0;
                breakdown[state.service] = fee;
                nettoTotal += fee;
            }

            const bruttoTotal = Math.round(nettoTotal * (1 + CONFIG.vatRate));

            return { breakdown, nettoTotal, bruttoTotal };
        }

        function fmt(n) {
            return Math.round(n).toLocaleString('hu-HU') + ' Ft';
        }

        function formatQuoteHeroHtml(price) {
            var afa = price.bruttoTotal - price.nettoTotal;
            return '<div class="quote-price-stack">' +
                '<p class="quote-price-lead">A becsült összeg <strong style="color:rgba(255,255,255,0.88);">nettó + ÁFA</strong> formában van feltüntetve — így könnyen átlátható, miből jön ki, amit végül fizet.</p>' +
                '<div class="quote-price-formula">' +
                '<span class="quote-price-num">' + fmt(price.nettoTotal) + '</span> <span class="quote-price-words">nettó összeg</span>' +
                ' <span class="quote-price-plus-inline">+</span> ' +
                '<span class="quote-price-num">' + fmt(afa) + '</span> <span class="quote-price-words">ÁFA (27%)</span>' +
                '</div>' +
                '<div class="quote-price-line quote-price-line--sum">' +
                '<span class="quote-price-equals">=</span> <span class="quote-price-num">' + fmt(price.bruttoTotal) + '</span>' +
                '<span class="quote-price-suffix">Ez az összesen fizetendő becsült összeg.</span>' +
                '</div>' +
                '</div>';
        }

        function buildQuote() {
            const price = calculatePrice();

            document.getElementById('quotePrice').innerHTML = formatQuoteHeroHtml(price);
            document.getElementById('finalPrice').innerHTML = formatQuoteHeroHtml(price);

            // ── Section 1: Price breakdown ─────────────────────────
            let itemHtml = '<div class="quote-section">';
            itemHtml += '<div class="quote-section-title">Miből áll ez az összeg?</div>';
            for (const [key, val] of Object.entries(price.breakdown)) {
                itemHtml += '<div class="quote-row"><span class="quote-row-key">' + key + '</span><span class="quote-row-val">' + fmt(val) + '</span></div>';
            }
            itemHtml += '<div class="quote-row quote-row--subtotal"><span class="quote-row-key">Nettó összeg összesen</span><span class="quote-row-val">' + fmt(price.nettoTotal) + '</span></div>';
            itemHtml += '<div class="quote-row quote-row--vat"><span class="quote-row-key">+ ÁFA (27%)</span><span class="quote-row-val">' + fmt(price.bruttoTotal - price.nettoTotal) + '</span></div>';
            itemHtml += '<div class="quote-row quote-row--total"><span class="quote-row-key">Összesen fizetendő</span><span class="quote-row-val">' + fmt(price.bruttoTotal) + '</span></div>';
            itemHtml += '</div>';
            document.getElementById('itemizedQuote').innerHTML = itemHtml;

            // ── Section 2: Order details ───────────────────────────
            const labels = {
                service: 'Szolgáltatás',
                property: 'Ingatlan',
                size: 'Alapterület',
                heatingPreference: 'Használat',
                postcode: 'Irányítószám'
            };
            const heatingLabels = { futes: 'Hűtés + fűtés', hutes: 'Csak hűtés' };
            const keys = ['service', 'property', 'size', 'postcode'];
            let summHtml = '<div class="quote-section">';
            summHtml += '<div class="quote-section-title">Összefoglalva</div>';
            keys.forEach(function(k) {
                if (state[k]) {
                    summHtml += '<div class="quote-row quote-row--detail"><span class="quote-row-key">' + labels[k] + '</span><span class="quote-row-val">' + state[k] + '</span></div>';
                }
            });
            if (state.heatingPreference) {
                summHtml += '<div class="quote-row quote-row--detail"><span class="quote-row-key">' + labels.heatingPreference + '</span><span class="quote-row-val">' + (heatingLabels[state.heatingPreference] || state.heatingPreference) + '</span></div>';
            }
            if (state.product) {
                summHtml += '<div class="quote-row quote-row--detail"><span class="quote-row-key">Készülék</span><span class="quote-row-val">' + state.product.name + '</span></div>';
            }
            if (state.service === 'Klímatelepítés') {
                const pipeMeters = parseFloat(state.pipeMeters) || 0;
                const extraMeters = Math.max(0, pipeMeters - CONFIG.standardPipeMeters);
                let pipeLabel = '3 m (alap)';
                if (pipeMeters > 0) {
                    pipeLabel = pipeMeters + ' m';
                    if (extraMeters > 0) {
                        pipeLabel += ' (' + extraMeters + ' m fizetős)';
                    }
                }
                summHtml += '<div class="quote-row quote-row--detail"><span class="quote-row-key">Csőhossz</span><span class="quote-row-val">' + pipeLabel + '</span></div>';
            }
            summHtml += '</div>';
            document.getElementById('summaryRows').innerHTML = summHtml;
        }

        // ─── Submit to contact.php ────────────────────────────────────────
        function submitForm() {
            const name = document.getElementById('nameInput').value.trim();
            const email = document.getElementById('emailInput').value.trim();
            const phone = document.getElementById('phoneInput').value.trim();

            let valid = true;
            function showErr(id, show) {
                document.getElementById(id).style.display = show ? 'block' : 'none';
                var inp = document.getElementById(id.replace('Error', 'Input'));
                if (inp) inp.classList.toggle('error', show);
            }

            if (!name) { showErr('nameError', true); valid = false; } else showErr('nameError', false);
            if (!email || !/\S+@\S+\.\S+/.test(email)) { showErr('emailError', true); valid = false; } else showErr('emailError', false);
            if (!phone || phone.length < 7) { showErr('phoneError', true); valid = false; } else showErr('phoneError', false);

            if (!valid) return;

            state.name = name;
            state.email = email;
            state.phone = phone;

            const price = calculatePrice();
            const priceRange = 'nettó összeg: ' + fmt(price.nettoTotal) + ' + ÁFA: ' + fmt(price.bruttoTotal - price.nettoTotal) + ' = összesen: ' + fmt(price.bruttoTotal);

            document.getElementById('submitBtn').style.display = 'none';
            document.getElementById('loaderWrap').classList.add('show');

            const fd = new FormData();
            fd.append('postcode', state.postcode);
            fd.append('service_area', state.postcode >= 1011 && state.postcode <= 1239 ? 'Budapest' : 'Budapest környéke');
            fd.append('service', state.service);
            fd.append('property', state.property);
            fd.append('size', state.size);
            fd.append('heating_preference', state.heatingPreference);
            fd.append('goal', state.goal);
            fd.append('product_name', state.product ? state.product.name : '');
            fd.append('product_price', state.product ? String(state.product.price) : '0');
            fd.append('ac_device', state.product ? state.product.name : state.goal);
            fd.append('ac_price', state.product ? String(state.product.price) : '');
            fd.append('pipe_meters', String(state.pipeMeters));
            fd.append('price_netto', String(price.nettoTotal));
            fd.append('price_brutto', String(price.bruttoTotal));
            fd.append('price_range', priceRange);
            fd.append('name', name);
            fd.append('email', email);
            fd.append('phone', phone);

            // CSRF token
            var csrfToken = document.getElementById('csrfToken');
            if (csrfToken && csrfToken.value) {
                fd.append('csrf_token', csrfToken.value);
            }

            // Honeypot
            var websiteField = document.getElementById('websiteField');
            if (websiteField && websiteField.value) {
                fd.append('website', websiteField.value);
            }

            if (state.photo) fd.append('photo', state.photo, state.photo.name);

            fetch('contact.php', { method: 'POST', body: fd })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    document.getElementById('loaderWrap').classList.remove('show');
                    document.getElementById('finalPrice').innerHTML = formatQuoteHeroHtml(price);
                    goToStep('success');
                })
                .catch(function() {
                    document.getElementById('loaderWrap').classList.remove('show');
                    document.getElementById('finalPrice').innerHTML = formatQuoteHeroHtml(price);
                    goToStep('success');
                });
        }
