(function (root) {
  function sanitizeFilename(value) {
    return String(value || 'jewelry-pricing')
      .trim()
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'jewelry-pricing';
  }

  function downloadJson(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function readJsonFile(file) {
    if (!file) throw new Error('No file selected.');
    const raw = await file.text();
    return JSON.parse(raw);
  }

  function buildPricingPayload(state, calculation) {
    return {
      format: 'jewelry-pricing',
      version: 1,
      savedAt: new Date().toISOString(),
      state: JewelryPricingState.clone(state),
      invoiceHandoff: PricingEngine.buildInvoiceHandoff(state, calculation)
    };
  }

  function buildCompanyProfilePayload(state) {
    return {
      format: 'jewelry-pricing-company-profile',
      version: 1,
      savedAt: new Date().toISOString(),
      state: {
        issuerLegalName: state.issuerLegalName,
        issuerAddress: state.issuerAddress,
        issuerVat: state.issuerVat,
        issuerRegistry: state.issuerRegistry,
        issuerContact: state.issuerContact,
        companyLogo: state.companyLogo,
        bankName: state.bankName,
        bankBranch: state.bankBranch,
        bankAccountHolder: state.bankAccountHolder,
        bankAccountNumber: state.bankAccountNumber,
        bankIban: state.bankIban,
        bankSwift: state.bankSwift,
        bankAddress: state.bankAddress,
        bankLogo: state.bankLogo,
        paymentMethod: state.paymentMethod,
        paymentHandler: state.paymentHandler,
        legalTerms: state.legalTerms,
        paymentNotes: state.paymentNotes,
        quoteTitle: state.quoteTitle,
        quoteSubtitle: state.quoteSubtitle,
        currency: state.currency
      }
    };
  }

  async function exportElementPdf(elementId, filenameBase) {
    const element = document.getElementById(elementId);
    if (!element) throw new Error(`Missing export element: ${elementId}`);
    if (!root.html2canvas || !root.jspdf?.jsPDF) {
      throw new Error('PDF libraries are not loaded.');
    }

    document.body.classList.add('is-exporting');
    let canvas;
    try {
      canvas = await root.html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fbf8f2',
        logging: false
      });
    } finally {
      document.body.classList.remove('is-exporting');
    }

    const pdf = new root.jspdf.jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imageData = canvas.toDataURL('image/jpeg', 0.95);

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imageData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imageData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${sanitizeFilename(filenameBase)}.pdf`);
  }

  root.JewelryPricingExports = {
    sanitizeFilename,
    downloadJson,
    readJsonFile,
    buildPricingPayload,
    buildCompanyProfilePayload,
    exportElementPdf
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
