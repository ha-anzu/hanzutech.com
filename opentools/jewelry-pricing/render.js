(function (root) {
  const State = root.JewelryPricingState;
  const Engine = root.PricingEngine;
  const Exports = root.JewelryPricingExports;

  let appState = State.createCrimsonPetalSample();
  let lastCalculation = Engine.calculatePricing(appState);

  const embeddedDailyMetalPriceFallback = {
    updated_at: '2026-05-08T12:00:00+07:00',
    base_currency: 'USD',
    unit: 'USD_per_gram',
    source: 'manual_market_snapshot',
    status: 'bootstrap_fallback',
    fallback_reason: 'Daily price file could not be loaded; using the built-in bootstrap snapshot.',
    prices: {
      XAU: { price_per_gram_usd: 151.591735 },
      XAG: { price_per_gram_usd: 2.583312 },
      XPT: { price_per_gram_usd: 66.079429 },
      XPD: { price_per_gram_usd: 48.033215 }
    }
  };

  const fieldIds = {
    issuerLegalName: 'issuer-legal-name',
    issuerAddress: 'issuer-address',
    issuerVat: 'issuer-vat',
    issuerRegistry: 'issuer-registry',
    issuerContact: 'issuer-contact',
    bankName: 'bank-name',
    bankBranch: 'bank-branch',
    bankAccountHolder: 'bank-account-holder',
    bankAccountNumber: 'bank-account-number',
    bankIban: 'bank-iban',
    bankSwift: 'bank-swift',
    bankAddress: 'bank-address',
    paymentMethod: 'payment-method',
    paymentHandler: 'payment-handler',
    paymentReceivedDate: 'payment-received-date',
    clientName: 'client-name',
    clientContact: 'client-contact',
    clientVat: 'client-vat',
    clientAddress: 'client-address',
    quoteTitle: 'quote-title',
    quoteSubtitle: 'quote-subtitle',
    quoteNumber: 'quote-number',
    quoteDate: 'quote-date',
    validUntil: 'valid-until',
    currency: 'quote-currency',
    designName: 'design-name',
    sku: 'sku',
    revision: 'revision',
    batchNumber: 'batch-number',
    productionStage: 'production-stage',
    selectedChannel: 'selected-channel',
    designDescription: 'design-description',
    clientNotes: 'client-notes',
    legalTerms: 'legal-terms',
    paymentNotes: 'payment-notes',
    factoryNotes: 'factory-notes',
    supplierEvidenceNotes: 'supplier-evidence-notes',
    approvalNotes: 'approval-notes'
  };

  const numberFieldIds = {
    paymentReceivedAmount: 'payment-received-amount',
    batchSize: 'batch-size',
    volumeReductionPercent: 'volume-reduction',
    overheadPercent: 'overhead-percent',
    contingencyPercent: 'contingency-percent',
    freightAdminCost: 'freight-admin-cost'
  };

  const actualFieldIds = {
    materialCost: 'actual-material-cost',
    laborCost: 'actual-labor-cost',
    reworkCost: 'actual-rework-cost',
    otherCost: 'actual-other-cost',
    actualCogs: 'actual-cogs'
  };

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function textToHtml(value) {
    const safe = escapeHtml(value || '');
    return safe ? safe.replace(/\n/g, '<br>') : '-';
  }

  function setText(id, value) {
    const node = el(id);
    if (node) node.textContent = value;
  }

  function setHtml(id, value) {
    const node = el(id);
    if (node) node.innerHTML = value;
  }

  function numberValue(value) {
    return Engine.numberValue(value, 0);
  }

  function getCurrencyMeta() {
    return State.currencyMeta[appState.currency] || State.currencyMeta.USD;
  }

  function formatCurrency(amount) {
    const meta = getCurrencyMeta();
    const value = Engine.roundMoney(amount);
    if (appState.currency === 'USD') {
      return `${meta.symbol}${value.toLocaleString(meta.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${meta.symbol}${value.toLocaleString(meta.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatPercent(value) {
    return `${Engine.roundMoney(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
  }

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  }

  function setInputValue(id, value) {
    const node = el(id);
    if (node) node.value = value ?? '';
  }

  function syncStateFromForm() {
    Object.entries(fieldIds).forEach(([key, id]) => {
      const node = el(id);
      if (node) appState[key] = node.value;
    });
    Object.entries(numberFieldIds).forEach(([key, id]) => {
      const node = el(id);
      if (node) appState[key] = numberValue(node.value);
    });
    Object.entries(actualFieldIds).forEach(([key, id]) => {
      const node = el(id);
      if (node) appState.actuals[key] = numberValue(node.value);
    });

    ['wholesale', 'direct', 'premium', 'custom'].forEach((key) => {
      const node = el(`channel-${key}`);
      if (node && appState.channels[key]) appState.channels[key].multiplier = numberValue(node.value);
    });

    document.querySelectorAll('[data-visibility-key]').forEach((node) => {
      appState.visibility[node.dataset.visibilityKey] = Boolean(node.checked);
    });
  }

  function syncFormFromState() {
    Object.entries(fieldIds).forEach(([key, id]) => setInputValue(id, appState[key]));
    Object.entries(numberFieldIds).forEach(([key, id]) => setInputValue(id, appState[key]));
    Object.entries(actualFieldIds).forEach(([key, id]) => setInputValue(id, appState.actuals[key]));
    ['wholesale', 'direct', 'premium', 'custom'].forEach((key) => {
      setInputValue(`channel-${key}`, appState.channels[key]?.multiplier ?? 1);
    });
    document.querySelectorAll('[data-visibility-key]').forEach((node) => {
      node.checked = Boolean(appState.visibility[node.dataset.visibilityKey]);
    });
    renderAllRows();
    renderChecklists();
    syncReferenceUploadUI();
    updatePreview();
  }

  function materialOptions(selected) {
    return Object.entries(State.materialLibrary).map(([key, material]) => (
      `<option value="${key}" ${key === selected ? 'selected' : ''}>${escapeHtml(material.label)}</option>`
    )).join('');
  }

  function rowShell(title, body, removeCall) {
    return `
      <div class="row-card">
        <div class="row-card-head">
          <strong>${escapeHtml(title)}</strong>
          <button type="button" class="mini-link" onclick="${removeCall}">Remove</button>
        </div>
        ${body}
      </div>
    `;
  }

  function renderMaterialRows() {
    const container = el('materials-container');
    if (!container) return;
    container.innerHTML = appState.materials.map((row) => rowShell(row.label || 'Material', `
      <div class="grid-two">
        <label>Material<select onchange="updateMaterialRow('${row.id}', 'materialKey', this.value)">${materialOptions(row.materialKey)}</select></label>
        <label>Label<input value="${escapeHtml(row.label)}" oninput="updateMaterialRow('${row.id}', 'label', this.value)"></label>
      </div>
      <div class="grid-four">
        <label>Finished g<input type="number" step="0.01" value="${row.finishedWeight}" oninput="updateMaterialRow('${row.id}', 'finishedWeight', this.value)"></label>
        <label>Wastage %<input type="number" step="0.1" value="${row.wastagePercent}" oninput="updateMaterialRow('${row.id}', 'wastagePercent', this.value)"></label>
        <label>Unit/g<input type="number" step="0.01" value="${row.unitPrice}" oninput="updateMaterialRow('${row.id}', 'unitPrice', this.value)"></label>
        <label>Purity factor<input type="number" step="0.001" value="${row.purityFactor}" oninput="updateMaterialRow('${row.id}', 'purityFactor', this.value)"></label>
      </div>
      <div class="grid-two">
        <label>Handling<input type="number" step="0.01" value="${row.handlingCharge}" oninput="updateMaterialRow('${row.id}', 'handlingCharge', this.value)"></label>
        <button type="button" class="button inline-row-button" onclick="fetchMetalPriceForMaterial('${row.id}')">Use Spot/Snapshot</button>
      </div>
      <label>Supplier note<textarea rows="2" oninput="updateMaterialRow('${row.id}', 'supplierNote', this.value)">${escapeHtml(row.supplierNote)}</textarea></label>
      <label>Finish / coating note<textarea rows="2" oninput="updateMaterialRow('${row.id}', 'finishNote', this.value)">${escapeHtml(row.finishNote)}</textarea></label>
    `, `removeMaterialRow('${row.id}')`)).join('');
  }

  function renderStoneRows() {
    const container = el('stones-container');
    if (!container) return;
    container.innerHTML = appState.stones.map((row) => rowShell(row.stoneType || 'Stone', `
      <div class="grid-four">
        <label>Shape<input value="${escapeHtml(row.shape)}" oninput="updateStoneRow('${row.id}', 'shape', this.value)"></label>
        <label>Size mm<input value="${escapeHtml(row.sizeMm)}" oninput="updateStoneRow('${row.id}', 'sizeMm', this.value)"></label>
        <label>Qty<input type="number" step="1" value="${row.quantity}" oninput="updateStoneRow('${row.id}', 'quantity', this.value)"></label>
        <label>Total ct<input type="number" step="0.001" value="${row.carats}" oninput="updateStoneRow('${row.id}', 'carats', this.value)"></label>
      </div>
      <div class="grid-two">
        <label>Stone type<input value="${escapeHtml(row.stoneType)}" oninput="updateStoneRow('${row.id}', 'stoneType', this.value)"></label>
        <label>Rate/ct<input type="number" step="0.01" value="${row.ratePerCt}" oninput="updateStoneRow('${row.id}', 'ratePerCt', this.value)"></label>
      </div>
      <label>Supplier note<textarea rows="2" oninput="updateStoneRow('${row.id}', 'supplierNote', this.value)">${escapeHtml(row.supplierNote)}</textarea></label>
    `, `removeStoneRow('${row.id}')`)).join('');
  }

  function renderComponentRows() {
    const container = el('components-container');
    if (!container) return;
    container.innerHTML = appState.components.map((row) => quantityRowMarkup(row, 'Component', 'updateComponentRow', 'removeComponentRow')).join('');
  }

  function renderLaborRows() {
    const container = el('labor-container');
    if (!container) return;
    container.innerHTML = appState.labor.map((row) => rowShell(row.process || 'Labor', `
      <div class="grid-two">
        <label>Process<input value="${escapeHtml(row.process)}" oninput="updateLaborRow('${row.id}', 'process', this.value)"></label>
        <label>Unit<input value="${escapeHtml(row.unit)}" oninput="updateLaborRow('${row.id}', 'unit', this.value)"></label>
      </div>
      <div class="grid-two">
        <label>Qty<input type="number" step="0.01" value="${row.quantity}" oninput="updateLaborRow('${row.id}', 'quantity', this.value)"></label>
        <label>Unit cost<input type="number" step="0.01" value="${row.unitCost}" oninput="updateLaborRow('${row.id}', 'unitCost', this.value)"></label>
      </div>
      <label>Factory note<textarea rows="2" oninput="updateLaborRow('${row.id}', 'supplierNote', this.value)">${escapeHtml(row.supplierNote)}</textarea></label>
    `, `removeLaborRow('${row.id}')`)).join('');
  }

  function quantityRowMarkup(row, title, updateFn, removeFn) {
    return rowShell(row.description || title, `
      <div class="grid-two">
        <label>Description<input value="${escapeHtml(row.description)}" oninput="${updateFn}('${row.id}', 'description', this.value)"></label>
        <label>Unit<input value="${escapeHtml(row.unit)}" oninput="${updateFn}('${row.id}', 'unit', this.value)"></label>
      </div>
      <div class="grid-two">
        <label>Qty<input type="number" step="0.01" value="${row.quantity}" oninput="${updateFn}('${row.id}', 'quantity', this.value)"></label>
        <label>Unit cost<input type="number" step="0.01" value="${row.unitCost}" oninput="${updateFn}('${row.id}', 'unitCost', this.value)"></label>
      </div>
      <label>Supplier note<textarea rows="2" oninput="${updateFn}('${row.id}', 'supplierNote', this.value)">${escapeHtml(row.supplierNote)}</textarea></label>
    `, `${removeFn}('${row.id}')`);
  }

  function renderFinishingRows() {
    const container = el('finishing-container');
    if (!container) return;
    container.innerHTML = appState.finishing.map((row) => rowShell(row.description || 'Finishing', `
      <div class="grid-two">
        <label>Description<input value="${escapeHtml(row.description)}" oninput="updateFinishingRow('${row.id}', 'description', this.value)"></label>
        <label>Category<input value="${escapeHtml(row.category)}" oninput="updateFinishingRow('${row.id}', 'category', this.value)"></label>
      </div>
      <div class="grid-three">
        <label>Qty<input type="number" step="0.01" value="${row.quantity}" oninput="updateFinishingRow('${row.id}', 'quantity', this.value)"></label>
        <label>Unit<input value="${escapeHtml(row.unit)}" oninput="updateFinishingRow('${row.id}', 'unit', this.value)"></label>
        <label>Unit cost<input type="number" step="0.01" value="${row.unitCost}" oninput="updateFinishingRow('${row.id}', 'unitCost', this.value)"></label>
      </div>
      <label>Supplier note<textarea rows="2" oninput="updateFinishingRow('${row.id}', 'supplierNote', this.value)">${escapeHtml(row.supplierNote)}</textarea></label>
    `, `removeFinishingRow('${row.id}')`)).join('');
  }

  function renderAllRows() {
    renderMaterialRows();
    renderStoneRows();
    renderComponentRows();
    renderLaborRows();
    renderFinishingRows();
  }

  function renderChecklist(containerId, items, stateKey) {
    const container = el(containerId);
    if (!container) return;
    container.innerHTML = items.map(([key, label]) => `
      <label class="section-toggle">
        <input type="checkbox" ${appState[stateKey][key] ? 'checked' : ''} onchange="setChecklistValue('${stateKey}', '${key}', this.checked)">
        ${escapeHtml(label)}
      </label>
    `).join('');
  }

  function renderChecklists() {
    renderChecklist('routing-checklist-container', State.routingSteps, 'routingChecklist');
    renderChecklist('qc-checklist-container', State.qcSteps, 'qcChecklist');
    renderChecklist('risk-flags-container', State.riskFlags, 'riskFlags');
  }

  function updateRow(collection, id, field, value, numericFields = []) {
    const row = appState[collection].find((item) => item.id === id);
    if (!row) return;
    row[field] = numericFields.includes(field) ? numberValue(value) : value;
    updatePreview();
  }

  function removeRow(collection, id, renderFn) {
    appState[collection] = appState[collection].filter((item) => item.id !== id);
    renderFn();
    updatePreview();
  }

  function addMaterialRow() {
    appState.materials.push(State.makeMaterial('sterling-silver-925'));
    renderMaterialRows();
    updatePreview();
  }

  function updateMaterialRow(rowId, field, value) {
    const row = appState.materials.find((item) => item.id === rowId);
    if (!row) return;
    if (field === 'materialKey') {
      const lib = State.materialLibrary[value] || State.materialLibrary.custom;
      Object.assign(row, {
        materialKey: value,
        label: lib.label,
        marketSymbol: lib.marketSymbol,
        purityFactor: lib.purityFactor,
        wastagePercent: lib.wastagePercent,
        unitPrice: lib.unitPrice,
        supplierNote: lib.note
      });
      renderMaterialRows();
    } else {
      row[field] = ['finishedWeight', 'wastagePercent', 'unitPrice', 'purityFactor', 'handlingCharge'].includes(field)
        ? numberValue(value)
        : value;
    }
    updatePreview();
  }

  function addStoneRow() {
    appState.stones.push({ id: State.id('stone'), shape: '', sizeMm: '', quantity: 1, carats: 0, stoneType: 'Stone', ratePerCt: 0, supplierNote: '' });
    renderStoneRows();
    updatePreview();
  }

  function addComponentRow() {
    appState.components.push({ id: State.id('comp'), description: 'Component', quantity: 1, unit: 'pc', unitCost: 0, supplierNote: '' });
    renderComponentRows();
    updatePreview();
  }

  function addLaborRow() {
    appState.labor.push({ id: State.id('labor'), process: 'Factory process', quantity: 1, unit: 'piece', unitCost: 0, supplierNote: '' });
    renderLaborRows();
    updatePreview();
  }

  function addFinishingRow() {
    appState.finishing.push({ id: State.id('finish'), description: 'Finishing / packaging', category: 'other', quantity: 1, unit: 'pc', unitCost: 0, supplierNote: '' });
    renderFinishingRows();
    updatePreview();
  }

  function setChecklistValue(stateKey, key, checked) {
    appState[stateKey][key] = Boolean(checked);
    updatePreview();
  }

  function buildRows(rows, columns, emptyText) {
    if (!rows.length) return `<tr><td colspan="${columns.length}" class="muted-cell">${escapeHtml(emptyText)}</td></tr>`;
    return rows.map((row) => `
      <tr>${columns.map((col) => `<td class="${col.className || ''}">${col.render(row)}</td>`).join('')}</tr>
    `).join('');
  }

  function materialSummary() {
    return appState.materials.map((row) => row.label || State.materialLibrary[row.materialKey]?.label || 'Material').join(', ') || '-';
  }

  function gemstoneSummary() {
    const qty = appState.stones.reduce((total, row) => total + numberValue(row.quantity), 0);
    const carats = appState.stones.reduce((total, row) => total + numberValue(row.carats), 0);
    const names = [...new Set(appState.stones.map((row) => row.stoneType).filter(Boolean))].join(', ');
    if (!appState.stones.length) return 'No stones listed';
    return `${qty} stones, ${carats.toFixed(3)} ct total (${names || 'mixed stones'})`;
  }

  function updateScreenSummary(calc) {
    setText('kpi-cogs', formatCurrency(calc.totals.cogs));
    setText('kpi-sell', formatCurrency(calc.selectedChannel.sellPrice));
    setText('kpi-margin', formatPercent(calc.selectedChannel.margin));
    setText('kpi-batch', formatCurrency(calc.selectedChannel.sellPrice * calc.batchSize));
    setText('spot-status', el('spot-status')?.textContent || 'Manual rates loaded.');
  }

  function updateClientQuote(calc) {
    const channel = calc.selectedChannel;
    setText('quote-preview-title', appState.quoteTitle || 'Jewelry Quote');
    setText('quote-preview-subtitle', appState.quoteSubtitle || '');
    setText('quote-preview-company', appState.issuerLegalName || 'YOUR COMPANY NAME');
    setText('quote-preview-number', appState.quoteNumber || '-');
    setText('quote-preview-date', formatDate(appState.quoteDate));
    setText('quote-preview-valid', formatDate(appState.validUntil));
    setHtml('quote-preview-issuer-address', textToHtml(appState.issuerAddress || 'Company address'));
    setText('quote-preview-issuer-contact', appState.issuerContact || '-');
    setText('quote-preview-client', appState.clientName || 'Client name');
    setText('quote-preview-client-contact', appState.clientContact || '-');
    setHtml('quote-preview-client-address', textToHtml(appState.clientAddress || '-'));
    setText('quote-preview-design', appState.designName || 'Custom jewelry design');
    setText('quote-preview-sku', appState.sku || '-');
    setText('quote-preview-revision', appState.revision || '-');
    setText('quote-preview-material', materialSummary());
    setText('quote-preview-gems', gemstoneSummary());
    setHtml('quote-preview-description', textToHtml(appState.designDescription));
    setText('quote-preview-quantity', calc.batchSize.toLocaleString());
    setText('quote-preview-channel', channel.label);
    setText('quote-preview-unit-price', formatCurrency(channel.sellPrice));
    setText('quote-preview-total-price', formatCurrency(channel.sellPrice * calc.batchSize));
    setHtml('quote-preview-client-notes', textToHtml(appState.clientNotes));
    setHtml('quote-preview-payment-notes', textToHtml(appState.paymentNotes));
    setText('quote-preview-payment-method', appState.paymentMethod || '-');
    setText('quote-preview-payment-handler', appState.paymentHandler || '-');
    setText('quote-preview-bank-name', appState.bankName || '-');
    setText('quote-preview-bank-account', [appState.bankAccountHolder, appState.bankAccountNumber].filter(Boolean).join(' / ') || '-');
    setText('quote-preview-bank-wire', [appState.bankSwift, appState.bankIban].filter(Boolean).join(' / ') || '-');
    setHtml('quote-preview-legal-terms', textToHtml(appState.legalTerms));
    setText('quote-preview-footer', `${new Date().getFullYear()} ${appState.issuerLegalName || 'Issuer'}. All rights reserved.`);

    const logoWrap = el('quote-company-logo-wrap');
    const logo = el('quote-company-logo');
    if (logoWrap && logo) {
      logoWrap.classList.toggle('is-hidden', !appState.companyLogo);
      logo.src = appState.companyLogo || '';
    }
    const refWrap = el('quote-reference-wrap');
    const ref = el('quote-reference-image');
    if (refWrap && ref) {
      refWrap.classList.toggle('is-hidden', !appState.imageRefs[0]);
      ref.src = appState.imageRefs[0] || '';
    }
  }

  function updateFactoryWorksheet(calc) {
    setText('factory-preview-title', 'Factory Pricing Worksheet');
    setText('factory-preview-company', appState.issuerLegalName || 'INTERNAL FACTORY RECORD');
    setText('factory-preview-number', appState.quoteNumber || '-');
    setText('factory-preview-design', appState.designName || 'Custom jewelry design');
    setText('factory-preview-sku', appState.sku || '-');
    setText('factory-preview-revision', appState.revision || '-');
    setText('factory-preview-batch', appState.batchNumber || '-');
    setText('factory-preview-stage', appState.productionStage || '-');
    setText('factory-preview-quantity', calc.batchSize.toLocaleString());
    setText('factory-preview-date', formatDate(appState.quoteDate));
    setHtml('factory-preview-description', textToHtml(appState.designDescription));
    setHtml('factory-preview-supplier-notes', textToHtml(appState.supplierEvidenceNotes));
    setHtml('factory-preview-factory-notes', textToHtml(appState.factoryNotes));
    setHtml('factory-preview-approval-notes', textToHtml(appState.approvalNotes));

    setHtml('factory-material-body', buildRows(calc.metalLines, [
      { render: (row) => escapeHtml(row.label) },
      { render: (row) => `${row.finishedWeight.toFixed(2)} g` },
      { render: (row) => `${row.usedWeight.toFixed(2)} g` },
      { render: (row) => row.purityFactor.toFixed(3) },
      { render: (row) => formatCurrency(row.unitPrice) },
      { render: (row) => formatCurrency(row.cost), className: 'numeric' }
    ], 'No metal rows.'));

    setHtml('factory-stone-body', buildRows(calc.stoneLines, [
      { render: (row) => escapeHtml(row.label) },
      { render: (row) => row.quantity.toLocaleString() },
      { render: (row) => `${row.carats.toFixed(3)} ct` },
      { render: (row) => formatCurrency(row.ratePerCt) },
      { render: (row) => formatCurrency(row.cost), className: 'numeric' }
    ], 'No gemstone rows.'));

    setHtml('factory-component-body', buildRows(calc.componentLines, [
      { render: (row) => escapeHtml(row.label) },
      { render: (row) => `${row.quantity} ${escapeHtml(row.unit)}` },
      { render: (row) => formatCurrency(row.unitCost) },
      { render: (row) => formatCurrency(row.cost), className: 'numeric' }
    ], 'No finding/component rows.'));

    setHtml('factory-labor-body', buildRows(calc.laborLines, [
      { render: (row) => escapeHtml(row.label) },
      { render: (row) => `${row.quantity} ${escapeHtml(row.unit)}` },
      { render: (row) => formatCurrency(row.unitCost) },
      { render: (row) => formatCurrency(row.cost), className: 'numeric' }
    ], 'No labor rows.'));

    setHtml('factory-finishing-body', buildRows(calc.finishingLines, [
      { render: (row) => escapeHtml(row.label) },
      { render: (row) => `${row.quantity} ${escapeHtml(row.unit)}` },
      { render: (row) => formatCurrency(row.unitCost) },
      { render: (row) => formatCurrency(row.cost), className: 'numeric' }
    ], 'No finishing rows.'));

    setText('factory-material-total', formatCurrency(calc.totals.materialsSubtotal));
    setText('factory-labor-base', formatCurrency(calc.totals.laborSubtotal));
    setText('factory-volume-reduction', formatPercent(calc.totals.volumeReductionPercent));
    setText('factory-labor-adjusted', formatCurrency(calc.totals.adjustedLabor));
    setText('factory-overhead', `${formatCurrency(calc.totals.overhead)} (${formatPercent(appState.overheadPercent)})`);
    setText('factory-finishing-total', formatCurrency(calc.totals.finishingSubtotal));
    setText('factory-freight-admin', formatCurrency(calc.totals.freightAdmin));
    setText('factory-contingency', `${formatCurrency(calc.totals.contingency)} (${formatPercent(appState.contingencyPercent)})`);
    setText('factory-cogs', formatCurrency(calc.totals.cogs));
    setText('factory-batch-cogs', formatCurrency(calc.totals.batchCogs));

    setHtml('factory-channel-body', Object.values(calc.channels).map((channel) => `
      <tr>
        <td>${escapeHtml(channel.label)}</td>
        <td>${channel.multiplier.toFixed(2)}x</td>
        <td>${formatCurrency(channel.sellPrice)}</td>
        <td>${formatCurrency(channel.sellPrice * calc.batchSize)}</td>
        <td>${formatPercent(channel.margin)}</td>
      </tr>
    `).join(''));

    setHtml('factory-routing-list', checklistPreview(State.routingSteps, appState.routingChecklist));
    setHtml('factory-qc-list', checklistPreview(State.qcSteps, appState.qcChecklist));
    setHtml('factory-risk-list', checklistPreview(State.riskFlags, appState.riskFlags, true));

    if (calc.actuals.hasActuals) {
      setHtml('factory-actuals-body', `
        <tr><td>Actual material</td><td>${formatCurrency(calc.actuals.actualMaterial)}</td></tr>
        <tr><td>Actual labor</td><td>${formatCurrency(calc.actuals.actualLabor)}</td></tr>
        <tr><td>Actual rejects / rework</td><td>${formatCurrency(calc.actuals.actualRework)}</td></tr>
        <tr><td>Actual other</td><td>${formatCurrency(calc.actuals.actualOther)}</td></tr>
        <tr><td>Actual COGS used</td><td>${formatCurrency(calc.actuals.actualCogs)}</td></tr>
        <tr><td>Variance vs estimate</td><td>${formatCurrency(calc.actuals.variance)} (${formatPercent(calc.actuals.variancePercent)})</td></tr>
      `);
    } else {
      setHtml('factory-actuals-body', '<tr><td colspan="2" class="muted-cell">No actual costs entered yet. Worksheet remains estimate-ready.</td></tr>');
    }
  }

  function checklistPreview(items, values, highlightOnly = false) {
    const rows = items
      .filter(([key]) => !highlightOnly || values[key])
      .map(([key, label]) => `<span class="check-pill ${values[key] ? 'checked' : ''}">${values[key] ? 'Done' : 'Open'} - ${escapeHtml(label)}</span>`);
    return rows.length ? rows.join('') : '<span class="check-pill">No active flags</span>';
  }

  function applyVisibility() {
    Object.entries(appState.visibility || {}).forEach(([key, enabled]) => {
      document.querySelectorAll(`[data-visible-section="${key}"]`).forEach((node) => {
        node.classList.toggle('is-hidden', !enabled);
      });
    });
  }

  function updatePreview() {
    syncStateFromForm();
    lastCalculation = Engine.calculatePricing(appState);
    updateScreenSummary(lastCalculation);
    updateClientQuote(lastCalculation);
    updateFactoryWorksheet(lastCalculation);
    applyVisibility();
    root.__JEWELRY_PRICING_STATE__ = appState;
    root.__JEWELRY_PRICING_CALC__ = lastCalculation;
  }

  function syncReferenceUploadUI() {
    for (let index = 0; index < 3; index += 1) {
      const label = el(`reference-upload-label-${index}`);
      if (label) label.textContent = appState.imageRefs[index] ? `Reference ${index + 1} loaded` : `Upload reference image ${index + 1}`;
    }
  }

  function handleImageUpload(event, index) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      appState.imageRefs[index] = readerEvent.target.result;
      syncReferenceUploadUI();
      updatePreview();
    };
    reader.readAsDataURL(file);
  }

  function clearReferenceImage(index) {
    appState.imageRefs[index] = '';
    const input = el(`image-upload-${index}`);
    if (input) input.value = '';
    syncReferenceUploadUI();
    updatePreview();
  }

  function handleLogoUpload(event, field) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      appState[field] = readerEvent.target.result;
      updatePreview();
    };
    reader.readAsDataURL(file);
  }

  function clearLogo(field, inputId) {
    appState[field] = '';
    const input = el(inputId);
    if (input) input.value = '';
    updatePreview();
  }

  function getDailyPrice(data, symbol) {
    const price = Number(data?.prices?.[symbol]?.price_per_gram_usd);
    return Number.isFinite(price) && price > 0 ? price : null;
  }

  async function loadDailySnapshot(symbol) {
    try {
      const response = await fetch('../jeweler-invoice-2.0/daily-metal-prices.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Daily price file unavailable.');
      return await response.json();
    } catch (error) {
      return embeddedDailyMetalPriceFallback;
    }
  }

  async function fetchMetalPriceForMaterial(rowId) {
    const row = appState.materials.find((item) => item.id === rowId);
    if (!row) return;
    const lib = State.materialLibrary[row.materialKey] || {};
    const symbol = row.marketSymbol || lib.marketSymbol || 'CUSTOM';
    const status = el('spot-status');

    if (!['XAU', 'XAG', 'XPT', 'XPD'].includes(symbol)) {
      if (status) status.textContent = 'Manual supplier rate required for this material.';
      return;
    }

    if (appState.apiKey) {
      try {
        if (status) status.textContent = 'Fetching live metal price...';
        const response = await fetch(`https://www.goldapi.io/api/${symbol}/USD`, {
          headers: { 'x-access-token': appState.apiKey }
        });
        if (!response.ok) throw new Error('Live API failed.');
        const data = await response.json();
        row.unitPrice = Number(data.price) / 31.1034768;
        if (status) status.textContent = `Live ${symbol} loaded: ${formatCurrency(row.unitPrice)}/g before purity factor.`;
        renderMaterialRows();
        updatePreview();
        return;
      } catch (error) {
        if (status) status.textContent = 'Live fetch failed; using daily snapshot if available.';
      }
    }

    const snapshot = await loadDailySnapshot(symbol);
    const price = getDailyPrice(snapshot, symbol);
    if (price) {
      row.unitPrice = price;
      if (status) status.textContent = `Snapshot ${symbol} loaded: ${formatCurrency(price)}/g before purity factor.`;
      renderMaterialRows();
      updatePreview();
    } else if (status) {
      status.textContent = 'No valid snapshot available. Enter manual supplier rate.';
    }
  }

  function applyApiKey() {
    const key = window.prompt('Enter GoldAPI.io key for this tab only. It will not be saved.', appState.apiKey || '');
    if (key !== null) {
      appState.apiKey = key.trim();
      const status = el('spot-status');
      if (status) status.textContent = appState.apiKey ? 'API key loaded for this active tab only.' : 'Manual price mode.';
    }
  }

  function applyVolumeDefault() {
    const batchNode = el('batch-size');
    const reductionNode = el('volume-reduction');
    const batchSize = numberValue(batchNode?.value || appState.batchSize);
    const nextReduction = Engine.getVolumeReductionPercent(batchSize);
    appState.batchSize = batchSize;
    appState.volumeReductionPercent = nextReduction;
    if (reductionNode) reductionNode.value = nextReduction;
    updatePreview();
  }

  function savePricingFile() {
    updatePreview();
    const payload = Exports.buildPricingPayload(appState, lastCalculation);
    Exports.downloadJson(payload, `pricing_${Exports.sanitizeFilename(appState.quoteNumber || appState.designName)}.json`);
  }

  async function loadPricingFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await Exports.readJsonFile(file);
      appState = State.migratePricingFile(parsed);
      syncFormFromState();
    } catch (error) {
      console.error(error);
      alert('Could not load pricing JSON. Please use a jewelry-pricing export.');
    }
  }

  function saveCompanyProfile() {
    updatePreview();
    const payload = Exports.buildCompanyProfilePayload(appState);
    Exports.downloadJson(payload, `jewelry_pricing_company_${Exports.sanitizeFilename(appState.issuerLegalName || 'profile')}.json`);
  }

  async function loadCompanyProfile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await Exports.readJsonFile(file);
      appState = State.applyCompanyProfile(appState, parsed);
      syncFormFromState();
    } catch (error) {
      console.error(error);
      alert('Could not load company profile JSON.');
    }
  }

  function triggerFileInput(id) {
    const input = el(id);
    if (!input) return;
    input.value = '';
    input.click();
  }

  function newBlankPricing() {
    if (!confirm('Start a new blank pricing file? Unsaved inputs will be cleared.')) return;
    appState = State.createBlankState();
    syncFormFromState();
  }

  function loadCrimsonPetalSample() {
    appState = State.createCrimsonPetalSample();
    syncFormFromState();
  }

  async function exportClientQuotePdf() {
    updatePreview();
    await Exports.exportElementPdf('client-quote-document', `client_quote_${appState.quoteNumber || appState.designName || 'jewelry'}`);
  }

  async function exportFactoryWorksheetPdf() {
    updatePreview();
    await Exports.exportElementPdf('factory-worksheet-document', `factory_worksheet_${appState.quoteNumber || appState.designName || 'jewelry'}`);
  }

  function bindMobileNav() {
    const container = document.querySelector('[data-top-nav-wrap]');
    const btn = container?.querySelector('[data-mobile-nav-toggle]');
    const mq = window.matchMedia('(max-width: 900px)');
    if (!container || !btn) return;
    const closeMenu = () => {
      container.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    };
    const sync = () => {
      container.classList.toggle('mobile-js', mq.matches);
      if (!mq.matches) closeMenu();
    };
    btn.addEventListener('click', (event) => {
      if (!mq.matches) return;
      event.stopPropagation();
      const isOpen = container.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    document.addEventListener('click', (event) => {
      if (mq.matches && container.classList.contains('is-open') && !container.contains(event.target)) closeMenu();
    });
    if (mq.addEventListener) mq.addEventListener('change', sync);
    sync();
  }

  function init() {
    syncFormFromState();
    bindMobileNav();
  }

  root.updatePreview = updatePreview;
  root.addMaterialRow = addMaterialRow;
  root.updateMaterialRow = updateMaterialRow;
  root.removeMaterialRow = (id) => removeRow('materials', id, renderMaterialRows);
  root.addStoneRow = addStoneRow;
  root.updateStoneRow = (id, field, value) => updateRow('stones', id, field, value, ['quantity', 'carats', 'ratePerCt']);
  root.removeStoneRow = (id) => removeRow('stones', id, renderStoneRows);
  root.addComponentRow = addComponentRow;
  root.updateComponentRow = (id, field, value) => updateRow('components', id, field, value, ['quantity', 'unitCost']);
  root.removeComponentRow = (id) => removeRow('components', id, renderComponentRows);
  root.addLaborRow = addLaborRow;
  root.updateLaborRow = (id, field, value) => updateRow('labor', id, field, value, ['quantity', 'unitCost']);
  root.removeLaborRow = (id) => removeRow('labor', id, renderLaborRows);
  root.addFinishingRow = addFinishingRow;
  root.updateFinishingRow = (id, field, value) => updateRow('finishing', id, field, value, ['quantity', 'unitCost']);
  root.removeFinishingRow = (id) => removeRow('finishing', id, renderFinishingRows);
  root.setChecklistValue = setChecklistValue;
  root.handleImageUpload = handleImageUpload;
  root.clearReferenceImage = clearReferenceImage;
  root.handleCompanyLogoUpload = (event) => handleLogoUpload(event, 'companyLogo');
  root.handleBankLogoUpload = (event) => handleLogoUpload(event, 'bankLogo');
  root.clearCompanyLogo = () => clearLogo('companyLogo', 'company-logo-upload');
  root.clearBankLogo = () => clearLogo('bankLogo', 'bank-logo-upload');
  root.fetchMetalPriceForMaterial = fetchMetalPriceForMaterial;
  root.applyApiKey = applyApiKey;
  root.applyVolumeDefault = applyVolumeDefault;
  root.savePricingFile = savePricingFile;
  root.loadPricingFile = loadPricingFile;
  root.saveCompanyProfile = saveCompanyProfile;
  root.loadCompanyProfile = loadCompanyProfile;
  root.triggerFileInput = triggerFileInput;
  root.newBlankPricing = newBlankPricing;
  root.loadCrimsonPetalSample = loadCrimsonPetalSample;
  root.exportClientQuotePdf = exportClientQuotePdf;
  root.exportFactoryWorksheetPdf = exportFactoryWorksheetPdf;

  document.addEventListener('DOMContentLoaded', init);
})(typeof globalThis !== 'undefined' ? globalThis : window);
