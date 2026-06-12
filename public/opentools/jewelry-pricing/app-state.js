(function (root) {
  const todayIso = () => new Date().toISOString().split('T')[0];

  function futureIso(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  function id(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  const currencyMeta = {
    USD: { symbol: '$', label: 'US Dollars', locale: 'en-US' },
    THB: { symbol: 'THB ', label: 'Thai Baht', locale: 'en-US' },
    EUR: { symbol: 'EUR ', label: 'Euros', locale: 'en-US' },
    GBP: { symbol: 'GBP ', label: 'British Pounds', locale: 'en-US' },
    AUD: { symbol: 'AUD ', label: 'Australian Dollars', locale: 'en-US' },
    CAD: { symbol: 'CAD ', label: 'Canadian Dollars', locale: 'en-US' },
    SGD: { symbol: 'SGD ', label: 'Singapore Dollars', locale: 'en-US' },
    MYR: { symbol: 'MYR ', label: 'Malaysian Ringgit', locale: 'en-US' },
    PHP: { symbol: 'PHP ', label: 'Philippine Pesos', locale: 'en-US' },
    JPY: { symbol: 'JPY ', label: 'Japanese Yen', locale: 'en-US' },
    CHF: { symbol: 'CHF ', label: 'Swiss Francs', locale: 'en-US' }
  };

  const materialLibrary = {
    'sterling-silver-925': {
      label: 'Sterling Silver 925',
      marketSymbol: 'XAG',
      purityFactor: 0.925,
      unitPrice: 3,
      wastagePercent: 10,
      precious: true,
      note: 'Use loaded supplier rate for production quotes when available.'
    },
    'fine-silver-999': {
      label: 'Fine Silver 999',
      marketSymbol: 'XAG',
      purityFactor: 0.999,
      unitPrice: 2.58,
      wastagePercent: 8,
      precious: true,
      note: 'Soft metal; confirm application before quoting structural parts.'
    },
    'gold-9k': { label: '9K Gold', marketSymbol: 'XAU', purityFactor: 0.375, unitPrice: 151.59, wastagePercent: 8, precious: true, note: 'Spot-linked pure gold base, multiplied by purity.' },
    'gold-10k': { label: '10K Gold', marketSymbol: 'XAU', purityFactor: 0.417, unitPrice: 151.59, wastagePercent: 8, precious: true, note: 'Spot-linked pure gold base, multiplied by purity.' },
    'gold-14k': { label: '14K Gold', marketSymbol: 'XAU', purityFactor: 0.583, unitPrice: 151.59, wastagePercent: 8, precious: true, note: 'Spot-linked pure gold base, multiplied by purity.' },
    'gold-18k': { label: '18K Gold', marketSymbol: 'XAU', purityFactor: 0.75, unitPrice: 151.59, wastagePercent: 8, precious: true, note: 'Spot-linked pure gold base, multiplied by purity.' },
    'gold-20k': { label: '20K Gold', marketSymbol: 'XAU', purityFactor: 0.833, unitPrice: 151.59, wastagePercent: 8, precious: true, note: 'Spot-linked pure gold base, multiplied by purity.' },
    'gold-22k': { label: '22K Gold', marketSymbol: 'XAU', purityFactor: 0.916, unitPrice: 151.59, wastagePercent: 8, precious: true, note: 'Spot-linked pure gold base, multiplied by purity.' },
    'gold-24k': { label: '24K Gold', marketSymbol: 'XAU', purityFactor: 0.999, unitPrice: 151.59, wastagePercent: 8, precious: true, note: 'Spot-linked pure gold base, multiplied by purity.' },
    'platinum-950': { label: 'Platinum 950', marketSymbol: 'XPT', purityFactor: 0.95, unitPrice: 66.08, wastagePercent: 10, precious: true, note: 'Confirm casting or machining route before production.' },
    'palladium-950': { label: 'Palladium 950', marketSymbol: 'XPD', purityFactor: 0.95, unitPrice: 48.03, wastagePercent: 10, precious: true, note: 'Confirm supplier availability and alloy details.' },
    titanium: { label: 'Titanium', marketSymbol: 'CUSTOM', purityFactor: 1, unitPrice: 0.08, wastagePercent: 15, precious: false, note: 'Manual supplier rate; machining route matters.' },
    aluminum: { label: 'Aluminum / Aluminium', marketSymbol: 'CUSTOM', purityFactor: 1, unitPrice: 0.01, wastagePercent: 12, precious: false, note: 'Manual supplier rate; anodizing can dominate cost.' },
    'stainless-steel': { label: 'Stainless Steel', marketSymbol: 'CUSTOM', purityFactor: 1, unitPrice: 0.03, wastagePercent: 12, precious: false, note: 'Manual supplier rate; polishing labor often dominates.' },
    brass: { label: 'Brass', marketSymbol: 'CUSTOM', purityFactor: 1, unitPrice: 0.02, wastagePercent: 10, precious: false, note: 'Manual supplier rate; tarnish/finish plan required.' },
    bronze: { label: 'Bronze', marketSymbol: 'CUSTOM', purityFactor: 1, unitPrice: 0.03, wastagePercent: 10, precious: false, note: 'Manual supplier rate; confirm patina and coating.' },
    custom: { label: 'Custom Material', marketSymbol: 'CUSTOM', purityFactor: 1, unitPrice: 0, wastagePercent: 10, precious: false, note: 'Enter supplier-specific rate and assumptions.' }
  };

  const routingSteps = [
    ['cadApproved', 'CAD approved'],
    ['sampleMade', 'Sample made'],
    ['setterRateLocked', 'Setter rate locked'],
    ['castingMachiningChecked', 'Casting / machining checked'],
    ['settingChecked', 'Setting checked'],
    ['polishChecked', 'Polish checked'],
    ['platingChecked', 'Plating / coating checked'],
    ['assemblyChecked', 'Assembly checked'],
    ['finalQc', 'Final QC'],
    ['packed', 'Packed']
  ];

  const qcSteps = [
    ['stoneCount', 'Stone count'],
    ['stoneTightness', 'Stone tightness'],
    ['claspFunction', 'Clasp function'],
    ['weightTolerance', 'Weight tolerance'],
    ['dimensions', 'Dimensions'],
    ['surfaceFinish', 'Surface finish'],
    ['platingCoating', 'Plating / coating'],
    ['hallmarkMarking', 'Hallmark / marking'],
    ['photoRecord', 'Photo record']
  ];

  const riskFlags = [
    ['newSetter', 'New setter'],
    ['newSupplier', 'New supplier'],
    ['fragileStones', 'Fragile stones'],
    ['tightPave', 'Tight pave'],
    ['firstRun', 'First production run'],
    ['rushJob', 'Rush job']
  ];

  function emptyChecklist(items) {
    return Object.fromEntries(items.map(([key]) => [key, false]));
  }

  function makeMaterial(materialKey = 'sterling-silver-925') {
    const lib = materialLibrary[materialKey] || materialLibrary.custom;
    return {
      id: id('mat'),
      materialKey,
      label: lib.label,
      marketSymbol: lib.marketSymbol,
      purityFactor: lib.purityFactor,
      finishedWeight: 5,
      wastagePercent: lib.wastagePercent,
      unitPrice: lib.unitPrice,
      handlingCharge: 0,
      supplierNote: lib.note,
      finishNote: ''
    };
  }

  function createBlankState() {
    return {
      format: 'jewelry-pricing',
      version: 1,
      issuerLegalName: '',
      issuerAddress: '',
      issuerVat: '',
      issuerRegistry: '',
      issuerContact: '',
      companyLogo: '',
      bankName: '',
      bankBranch: '',
      bankAccountHolder: '',
      bankAccountNumber: '',
      bankIban: '',
      bankSwift: '',
      bankAddress: '',
      bankLogo: '',
      paymentMethod: '',
      paymentHandler: '',
      paymentReceivedDate: '',
      paymentReceivedAmount: 0,
      clientName: '',
      clientContact: '',
      clientVat: '',
      clientAddress: '',
      quoteTitle: 'Jewelry Quote',
      quoteSubtitle: 'Production-aware jewelry pricing',
      quoteNumber: `JQ-${Math.floor(1000 + Math.random() * 9000)}`,
      quoteDate: todayIso(),
      validUntil: futureIso(14),
      currency: 'USD',
      designName: '',
      sku: '',
      revision: 'A',
      batchNumber: '',
      productionStage: 'sample',
      batchSize: 1,
      volumeReductionPercent: 0,
      selectedChannel: 'direct',
      designDescription: '',
      clientNotes: '',
      legalTerms: '1. Quote is valid until the date shown above.\n2. Custom approved designs are non-refundable once production starts.\n3. Balance is due before dispatch unless agreed in writing.',
      paymentNotes: 'Deposit confirms production slot. Balance due before dispatch.',
      factoryNotes: '',
      supplierEvidenceNotes: '',
      approvalNotes: '',
      overheadPercent: 35,
      contingencyPercent: 3.5,
      freightAdminCost: 0,
      imageRefs: ['', '', ''],
      materials: [makeMaterial('sterling-silver-925')],
      stones: [],
      components: [],
      labor: [],
      finishing: [],
      channels: {
        wholesale: { label: 'Wholesale / Trade', multiplier: 2.15 },
        direct: { label: 'Direct / Custom', multiplier: 3.7 },
        premium: { label: 'Premium / Limited', multiplier: 4.8 },
        custom: { label: 'Custom', multiplier: 3.5 }
      },
      routingChecklist: emptyChecklist(routingSteps),
      qcChecklist: emptyChecklist(qcSteps),
      riskFlags: emptyChecklist(riskFlags),
      actuals: {
        materialCost: 0,
        laborCost: 0,
        reworkCost: 0,
        otherCost: 0,
        actualCogs: 0
      },
      visibility: {
        quoteHeader: true,
        quoteClient: true,
        quoteImage: true,
        quotePayment: true,
        quoteTerms: true,
        quoteSignatures: true,
        factoryRouting: true,
        factoryQc: true,
        factoryActuals: true,
        factoryApprovals: true
      },
      apiKey: ''
    };
  }

  function createCrimsonPetalSample() {
    const state = createBlankState();
    Object.assign(state, {
      issuerLegalName: 'Aurora Fine Jewelry Co., Ltd.',
      issuerAddress: '99 Silom Road\nBangrak, Bangkok 10500',
      issuerVat: 'TH0105551234567',
      issuerRegistry: '0105551234567',
      issuerContact: 'sales@aurorajewelry.co | +66 2 123 4567',
      bankName: 'Bangkok Bank',
      bankBranch: 'Silom Branch',
      bankAccountHolder: 'Aurora Fine Jewelry Co., Ltd.',
      bankAccountNumber: '123-4-56789-0',
      bankIban: 'N/A',
      bankSwift: 'BKKBTHBK',
      bankAddress: '333 Silom Road, Bangkok 10500',
      paymentMethod: 'SWIFT',
      paymentHandler: 'Narin S.',
      clientName: 'Sample Client',
      clientContact: 'sample.client@email.com | +66 88 123 4567',
      clientVat: '',
      clientAddress: 'Bangkok, Thailand',
      quoteTitle: 'Client Jewelry Quote',
      quoteSubtitle: 'Crimson Petal ruby statement bracelet',
      quoteNumber: 'JQ-CRIMSON-001',
      batchNumber: 'BATCH-CRIMSON-12',
      designName: 'Crimson Petal Ruby Statement Bracelet',
      sku: 'CPR-BR-925-RUBY',
      revision: 'B',
      productionStage: 'first-run',
      batchSize: 12,
      volumeReductionPercent: 20,
      selectedChannel: 'direct',
      designDescription: 'Circular high-impact statement bracelet in rhodium-plated sterling silver with one 7 x 10 mm lab red ruby pear focal, seven 3 x 5 mm pear accents, one marquise accent, and dense 1.6 mm round micro-pave clusters.',
      clientNotes: 'Recommended launch price is set for direct custom sales. Wholesale can be adjusted by relationship and order size.',
      factoryNotes: 'Lock setter rate from sample before any repeat run. Protect stones during high-shine finishing.',
      supplierEvidenceNotes: 'Silver uses loaded $3/g sterling rate. Lab ruby and accent rates from internal June 2026 costing manual.',
      approvalNotes: 'Written approval required for any overhead, contingency, or labor-rate deviation.',
      overheadPercent: 35,
      contingencyPercent: 3.5,
      freightAdminCost: 0
    });

    state.materials = [{
      id: id('mat'),
      materialKey: 'sterling-silver-925',
      label: 'Sterling Silver 925 - loaded supplier rate',
      marketSymbol: 'XAG',
      purityFactor: 1,
      finishedWeight: 5,
      wastagePercent: 0,
      unitPrice: 3,
      handlingCharge: 0,
      supplierNote: '$3/g loaded sterling rate, already including wastage for this manual example.',
      finishNote: 'Rhodium plating required for white-gold look and tarnish resistance.'
    }];

    state.stones = [
      { id: id('stone'), shape: 'Pear focal', sizeMm: '7 x 10', quantity: 1, carats: 2.843, stoneType: 'Lab Red Ruby', ratePerCt: 30, supplierNote: 'Big statement stone' },
      { id: id('stone'), shape: 'Pear accent', sizeMm: '3 x 5', quantity: 7, carats: 1.828, stoneType: 'Lab ruby accent', ratePerCt: 10, supplierNote: 'Flower cluster centers' },
      { id: id('stone'), shape: 'Marquise', sizeMm: '3 x 6', quantity: 1, carats: 0.274, stoneType: 'White CZ accent', ratePerCt: 5, supplierNote: 'Small accent' },
      { id: id('stone'), shape: 'Round micro', sizeMm: '1.6', quantity: 18, carats: 0.435, stoneType: 'White CZ micro', ratePerCt: 5, supplierNote: 'Dense pave clusters' }
    ];

    state.components = [
      { id: id('comp'), description: 'Findings - clasp, components, jump rings', quantity: 1, unit: 'set', unitCost: 20, supplierNote: 'Supplier quote plus buffer' }
    ];

    state.labor = [
      { id: id('labor'), process: 'Stone setting - dense micro-pave clusters', quantity: 1, unit: 'piece', unitCost: 195, supplierNote: 'Base rate before 20% batch efficiency' },
      { id: id('labor'), process: 'Polishing and high-shine finishing', quantity: 1, unit: 'piece', unitCost: 85, supplierNote: 'Stone-safe finishing' },
      { id: id('labor'), process: 'Assembly, clasp attachment and final QC', quantity: 1, unit: 'piece', unitCost: 55, supplierNote: 'Final factory check' }
    ];

    state.finishing = [
      { id: id('finish'), description: 'Rhodium plating', category: 'plating', quantity: 1, unit: 'piece', unitCost: 12, supplierNote: 'Mandatory for silver statement piece' },
      { id: id('finish'), description: 'Premium packaging + certificate + care card', category: 'packaging', quantity: 1, unit: 'set', unitCost: 8, supplierNote: 'Client-facing presentation' }
    ];

    state.routingChecklist = {
      cadApproved: true,
      sampleMade: true,
      setterRateLocked: false,
      castingMachiningChecked: false,
      settingChecked: false,
      polishChecked: false,
      platingChecked: false,
      assemblyChecked: false,
      finalQc: false,
      packed: false
    };
    state.qcChecklist = emptyChecklist(qcSteps);
    state.riskFlags = {
      newSetter: false,
      newSupplier: false,
      fragileStones: true,
      tightPave: true,
      firstRun: true,
      rushJob: false
    };

    return state;
  }

  function normalizeState(incoming) {
    const base = createBlankState();
    const source = incoming && incoming.state ? incoming.state : incoming;
    if (!source || typeof source !== 'object') return base;

    const merged = Object.assign(base, clone(source));
    merged.materials = Array.isArray(source.materials) ? source.materials : base.materials;
    merged.stones = Array.isArray(source.stones) ? source.stones : base.stones;
    merged.components = Array.isArray(source.components) ? source.components : base.components;
    merged.labor = Array.isArray(source.labor) ? source.labor : base.labor;
    merged.finishing = Array.isArray(source.finishing) ? source.finishing : base.finishing;
    merged.channels = Object.assign({}, base.channels, source.channels || {});
    merged.visibility = Object.assign({}, base.visibility, source.visibility || {});
    merged.routingChecklist = Object.assign({}, base.routingChecklist, source.routingChecklist || {});
    merged.qcChecklist = Object.assign({}, base.qcChecklist, source.qcChecklist || {});
    merged.riskFlags = Object.assign({}, base.riskFlags, source.riskFlags || {});
    merged.actuals = Object.assign({}, base.actuals, source.actuals || {});
    merged.imageRefs = Array.isArray(source.imageRefs) ? [source.imageRefs[0] || '', source.imageRefs[1] || '', source.imageRefs[2] || ''] : base.imageRefs;
    merged.format = 'jewelry-pricing';
    merged.version = 1;
    return merged;
  }

  function migratePricingFile(parsed) {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid pricing file.');
    }
    if (parsed.format && parsed.format !== 'jewelry-pricing') {
      throw new Error('Unsupported pricing file format.');
    }
    return normalizeState(parsed);
  }

  function applyCompanyProfile(state, parsed) {
    if (!parsed || parsed.format !== 'jewelry-pricing-company-profile') {
      throw new Error('Unsupported company profile format.');
    }
    const profile = parsed.state || {};
    const next = normalizeState(state);
    [
      'issuerLegalName', 'issuerAddress', 'issuerVat', 'issuerRegistry', 'issuerContact',
      'companyLogo', 'bankName', 'bankBranch', 'bankAccountHolder', 'bankAccountNumber',
      'bankIban', 'bankSwift', 'bankAddress', 'bankLogo', 'paymentMethod', 'paymentHandler',
      'legalTerms', 'paymentNotes', 'quoteTitle', 'quoteSubtitle', 'currency'
    ].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(profile, key)) next[key] = profile[key];
    });
    return next;
  }

  root.JewelryPricingState = {
    currencyMeta,
    materialLibrary,
    routingSteps,
    qcSteps,
    riskFlags,
    clone,
    id,
    makeMaterial,
    createBlankState,
    createCrimsonPetalSample,
    normalizeState,
    migratePricingFile,
    applyCompanyProfile
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
