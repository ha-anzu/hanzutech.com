type ScanEvent = {
  code: string;
  source: "wedge" | "lan" | "camera";
  deviceId?: string;
  at: string;
};

type Listener = (event: ScanEvent) => void;

const globalScanner = globalThis as unknown as {
  listeners?: Set<Listener>;
  history?: ScanEvent[];
};

if (!globalScanner.listeners) {
  globalScanner.listeners = new Set();
}
if (!globalScanner.history) {
  globalScanner.history = [];
}

export function publishScan(event: ScanEvent) {
  globalScanner.history!.unshift(event);
  globalScanner.history = globalScanner.history!.slice(0, 100);
  for (const listener of globalScanner.listeners!) {
    listener(event);
  }
}

export function subscribeScan(listener: Listener) {
  globalScanner.listeners!.add(listener);
  return () => globalScanner.listeners!.delete(listener);
}

export function latestScans() {
  return globalScanner.history!;
}
