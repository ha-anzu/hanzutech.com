(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.PricingEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

  function numberValue(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function percentValue(value) {
    return numberValue(value, 0) / 100;
  }

  function sumRows(rows, mapper) {
    if (!Array.isArray(rows)) return 0;
    return rows.reduce((total, row) => total + numberValue(mapper(row), 0), 0);
  }

  function getVolumeReductionPercent(batchSize, customReductionPercent) {
    if (Number.isFinite(Number(customReductionPercent))) {
      return Math.max(0, Math.min(95, numberValue(customReductionPercent)));
    }

    const qty = numberValue(batchSize, 1);
    if (qty <= 5) return 0;
    if (qty <= 15) return 20;
    if (qty <= 50) return 35;
    return 45;
  }

  function calculateMetalRow(row) {
    const finishedWeight = numberValue(row.finishedWeight);
    const wastageMultiplier = 1 + percentValue(row.wastagePercent);
    const unitPrice = numberValue(row.unitPrice);
    const purityFactor = numberValue(row.purityFactor, 1);
    const handlingCharge = numberValue(row.handlingCharge);
    const rawCost = finishedWeight * wastageMultiplier * unitPrice * purityFactor + handlingCharge;

    return {
      id: row.id,
      label: row.label || row.materialName || row.materialKey || 'Material',
      finishedWeight,
      usedWeight: finishedWeight * wastageMultiplier,
      unitPrice,
      purityFactor,
      handlingCharge,
      cost: rawCost
    };
  }

  function calculateStoneRow(row) {
    const carats = numberValue(row.carats);
    const ratePerCt = numberValue(row.ratePerCt);
    return {
      id: row.id,
      label: row.stoneType || row.shape || 'Stone',
      quantity: numberValue(row.quantity),
      carats,
      ratePerCt,
      cost: carats * ratePerCt
    };
  }

  function calculateQuantityCostRow(row) {
    const quantity = numberValue(row.quantity, 1);
    const unitCost = numberValue(row.unitCost);
    return {
      id: row.id,
      label: row.description || row.process || row.category || 'Cost row',
      quantity,
      unit: row.unit || 'pc',
      unitCost,
      cost: quantity * unitCost
    };
  }

  function calculateActuals(state, estimatedCogs) {
    const actual = state.actuals || {};
    const actualMaterial = numberValue(actual.materialCost);
    const actualLabor = numberValue(actual.laborCost);
    const actualRework = numberValue(actual.reworkCost);
    const actualOther = numberValue(actual.otherCost);
    const explicitActualCogs = numberValue(actual.actualCogs);
    const derivedActualCogs = actualMaterial + actualLabor + actualRework + actualOther;
    const hasActuals = explicitActualCogs > 0 || derivedActualCogs > 0;
    const actualCogs = explicitActualCogs > 0 ? explicitActualCogs : derivedActualCogs;
    const variance = hasActuals ? actualCogs - estimatedCogs : 0;
    const variancePercent = hasActuals && estimatedCogs > 0 ? (variance / estimatedCogs) * 100 : 0;

    return {
      hasActuals,
      actualMaterial,
      actualLabor,
      actualRework,
      actualOther,
      actualCogs,
      variance,
      variancePercent
    };
  }

  function calculatePricing(state) {
    const batchSize = Math.max(1, numberValue(state.batchSize, 1));
    const metalLines = (state.materials || []).map(calculateMetalRow);
    const stoneLines = (state.stones || []).map(calculateStoneRow);
    const componentLines = (state.components || []).map(calculateQuantityCostRow);
    const laborLines = (state.labor || []).map(calculateQuantityCostRow);
    const finishingLines = (state.finishing || []).map(calculateQuantityCostRow);

    const metalsSubtotal = sumRows(metalLines, (row) => row.cost);
    const stonesSubtotal = sumRows(stoneLines, (row) => row.cost);
    const componentsSubtotal = sumRows(componentLines, (row) => row.cost);
    const materialsSubtotal = metalsSubtotal + stonesSubtotal + componentsSubtotal;
    const laborSubtotal = sumRows(laborLines, (row) => row.cost);
    const volumeReductionPercent = getVolumeReductionPercent(batchSize, state.volumeReductionPercent);
    const adjustedLabor = laborSubtotal * (1 - volumeReductionPercent / 100);
    const overhead = (materialsSubtotal + adjustedLabor) * percentValue(state.overheadPercent);
    const finishingSubtotal = sumRows(finishingLines, (row) => row.cost);
    const freightAdmin = numberValue(state.freightAdminCost);
    const contingencyBase = materialsSubtotal + adjustedLabor + overhead;
    const contingency = contingencyBase * percentValue(state.contingencyPercent);
    const cogs = materialsSubtotal + adjustedLabor + overhead + finishingSubtotal + freightAdmin + contingency;

    const channels = {};
    Object.entries(state.channels || {}).forEach(([key, channel]) => {
      const multiplier = numberValue(channel.multiplier, 1);
      const sellPrice = cogs * multiplier;
      channels[key] = {
        key,
        label: channel.label || key,
        multiplier,
        sellPrice,
        margin: sellPrice > 0 ? ((sellPrice - cogs) / sellPrice) * 100 : 0
      };
    });

    const selectedChannelKey = channels[state.selectedChannel] ? state.selectedChannel : Object.keys(channels)[0];
    const selectedChannel = channels[selectedChannelKey] || {
      key: 'direct',
      label: 'Direct',
      multiplier: 1,
      sellPrice: cogs,
      margin: 0
    };

    return {
      batchSize,
      metalLines,
      stoneLines,
      componentLines,
      laborLines,
      finishingLines,
      totals: {
        metalsSubtotal,
        stonesSubtotal,
        componentsSubtotal,
        materialsSubtotal,
        laborSubtotal,
        volumeReductionPercent,
        adjustedLabor,
        overhead,
        finishingSubtotal,
        freightAdmin,
        contingencyBase,
        contingency,
        cogs,
        batchCogs: cogs * batchSize
      },
      channels,
      selectedChannelKey,
      selectedChannel,
      actuals: calculateActuals(state, cogs)
    };
  }

  function buildInvoiceHandoff(state, calculation) {
    const channel = calculation.selectedChannel;
    return {
      sourceFormat: 'jewelry-pricing',
      quoteNumber: state.quoteNumber || '',
      designName: state.designName || '',
      clientName: state.clientName || '',
      currency: state.currency || 'USD',
      quantity: calculation.batchSize,
      selectedChannel: channel.key,
      unitPrice: roundMoney(channel.sellPrice),
      total: roundMoney(channel.sellPrice * calculation.batchSize),
      internalCogs: roundMoney(calculation.totals.cogs)
    };
  }

  return {
    roundMoney,
    numberValue,
    getVolumeReductionPercent,
    calculateMetalRow,
    calculateStoneRow,
    calculateQuantityCostRow,
    calculatePricing,
    buildInvoiceHandoff
  };
});
