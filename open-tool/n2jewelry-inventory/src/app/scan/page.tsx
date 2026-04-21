"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ScanMessage = {
  code: string;
  source: "wedge" | "lan" | "camera";
  deviceId?: string;
  at: string;
};

export default function ScanPage() {
  const [events, setEvents] = useState<ScanMessage[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [resolved, setResolved] = useState<string>("");
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    const source = new EventSource("/api/scan/events");
    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as ScanMessage;
      setEvents((prev) => [data, ...prev].slice(0, 50));
    };
    return () => source.close();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKeyTimeRef.current > 80) {
        bufferRef.current = "";
      }
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        bufferRef.current = "";
        if (code) {
          void ingest(code, "wedge");
          void resolve(code);
        }
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const latest = useMemo(() => events[0], [events]);

  async function ingest(code: string, source: "wedge" | "lan" | "camera") {
    await fetch("/api/scan/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, source, deviceId: "scan-ui" })
    });
  }

  async function resolve(code: string) {
    const response = await fetch("/api/scan/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: code })
    });
    const data = await response.json();
    setResolved(JSON.stringify(data, null, 2));
  }

  async function detectFromCamera() {
    if (!("BarcodeDetector" in window)) {
      alert("BarcodeDetector is not supported in this browser.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();

    const detector = new (
      window as unknown as {
        BarcodeDetector: new () => { detect: (input: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> };
      }
    ).BarcodeDetector();

    const tick = async () => {
      const results = await detector.detect(video);
      const code = results[0]?.rawValue;
      if (code) {
        await ingest(code, "camera");
        await resolve(code);
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  return (
    <main>
      <h1>Scanner Workspace</h1>
      <p>Supports keyboard wedge scanners, LAN scanner ingests, and camera scan fallback.</p>

      <section className="grid">
        <div className="card">
          <h2>Live Scan Feed</h2>
          <p className="small">Latest: {latest ? `${latest.code} (${latest.source})` : "No scans yet"}</p>
          <div className="small">Tip: Focus the browser and scan using USB/Bluetooth wedge scanner.</div>
          <button onClick={() => void detectFromCamera()} style={{ marginTop: 8 }}>
            Scan with Camera
          </button>
        </div>

        <div className="card">
          <h2>Manual / LAN Test</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Barcode value" />
            <button
              onClick={async () => {
                await ingest(manualCode, "lan");
                await resolve(manualCode);
                setManualCode("");
              }}
            >
              Ingest + Resolve
            </button>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Resolver Response</h2>
        <pre>{resolved || "Scan a code to resolve against SKU/barcode/lot records."}</pre>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Recent Events</h2>
        <pre>{JSON.stringify(events, null, 2)}</pre>
      </section>
    </main>
  );
}
