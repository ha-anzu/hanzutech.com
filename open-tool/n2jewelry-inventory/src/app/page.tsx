const cards = [
  { title: "Master Data", desc: "Products, variants, categories, SKU and barcode setup" },
  { title: "Manufacturing", desc: "Metal lot intake, production consumption, completed goods" },
  { title: "Warehouse", desc: "Balances, transfers, cycle counts, scan validation" },
  { title: "Consignment", desc: "Agent shipments, sell-through, settlements, returns" },
  { title: "Digital Repository", desc: "CAD, images, certificates and operation documents" }
];

export default function HomePage() {
  return (
    <main>
      <h1>N2Jewelry Inventory System</h1>
      <p>Production-ready API module for SKU/barcode, lots, movements, production, consignment and digital assets.</p>
      <div className="grid">
        {cards.map((card) => (
          <section key={card.title} className="card">
            <h2>{card.title}</h2>
            <p>{card.desc}</p>
          </section>
        ))}
      </div>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Scanner Workspace</h2>
        <p>Open <a href="/scan">/scan</a> for keyboard wedge, LAN ingest events, and mobile camera scans.</p>
      </section>
    </main>
  );
}
