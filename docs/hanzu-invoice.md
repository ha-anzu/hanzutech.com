# Hanzu Invoice

Hanzu Invoice is a local-first OpenTools invoice builder for professional digital services. It sits beside `jeweler-invoice-2.0` and keeps the same practical export pattern: editable invoice state, local JSON invoice/profile files, browser print, and PDF generation.

## Service Classification

- Line of business: Professional Services
- Product type: Intellectual / Digital
- Service presets: CAD designer, 3D artist, 3D sculptor, 3D print specialist, jewelry designer, CAD jewelry specialist / design engineering, graphic designer, production management and manufacturing coordination, industrial designer, custom software development

## Client And Accounting Fields

The tool includes invoice number, issue date, due date, PO/SOW reference, issuer/client tax IDs, service category, tax rate, discount, deposit, balance due, payment instructions, payment terms, deliverables/IP notes, and private accountant notes.

## Export Formats

- `hanzu-invoice-1.0`: complete invoice JSON, including client and line items
- `hanzu-invoice-profile-1.0`: reusable issuer/payment/profile settings without client-specific invoice state
- PDF output is generated in-browser from the invoice preview using `html2canvas` and `jsPDF`

No invoice history is stored by the page. Data stays in the browser session unless exported.
