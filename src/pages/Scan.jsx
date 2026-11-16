import React, { useCallback, useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import Icon from "../components/Icon";
import BottomNav from "../components/BottomNav";
import { copyValue, describeItem, detectType } from "../utils/qrData";

// Short beep + vibration after a successful scan (only if enabled in Settings).
function notifyScan() {
  navigator.vibrate?.(60);
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    setTimeout(() => ctx.close(), 300);
  } catch { /* audio not available */ }
}

const CORNERS = [
  { top: 0, left: 0, borderWidth: "4px 0 0 4px", borderRadius: "24px 0 0 0" },
  { top: 0, right: 0, borderWidth: "4px 4px 0 0", borderRadius: "0 24px 0 0" },
  { bottom: 0, left: 0, borderWidth: "0 0 4px 4px", borderRadius: "0 0 0 24px" },
  { bottom: 0, right: 0, borderWidth: "0 4px 4px 0", borderRadius: "0 0 24px 0" },
];

const Scan = ({ settings, onNavigate, onOpenSettings, onScanResult }) => {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const fileRef = useRef(null);
  const camerasRef = useRef([]);
  const cameraIndex = useRef(0);

  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const stop = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setScanning(false);
    setTorchOn(false);
    setHasFlash(false);
  }, []);

  // Always release the camera when leaving this screen.
  useEffect(() => () => { scannerRef.current?.destroy(); scannerRef.current = null; }, []);

  const handleResult = (data) => {
    if (settings.feedback) notifyScan();
    setResult(data);
    stop();
    onScanResult(data);
  };

  const start = async () => {
    if (!videoRef.current || scannerRef.current) return;
    setError(null);
    setResult(null);
    let scanner;
    try {
      scanner = new QrScanner(videoRef.current, (r) => handleResult(r.data), {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: "environment",
        maxScansPerSecond: 10,
      });
      scannerRef.current = scanner;
      await scanner.start();
      setScanning(true);
      setHasFlash(await scanner.hasFlash());
      camerasRef.current = await QrScanner.listCameras(true);
    } catch (err) {
      scanner?.destroy();
      scannerRef.current = null;
      setError(
        err?.name === "NotAllowedError" || String(err).includes("denied")
          ? "Camera access is blocked. Allow the camera in your browser settings."
          : "No camera found. Upload an image instead."
      );
    }
  };

  const toggleTorch = async () => {
    try {
      await scannerRef.current.toggleFlash();
      setTorchOn(scannerRef.current.isFlashOn());
    } catch {
      setError("This camera has no flash.");
    }
  };

  const switchCamera = async () => {
    const cams = camerasRef.current;
    if (!scannerRef.current || cams.length < 2) return;
    cameraIndex.current = (cameraIndex.current + 1) % cams.length;
    await scannerRef.current.setCamera(cams[cameraIndex.current].id);
    setTorchOn(false);
    setHasFlash(await scannerRef.current.hasFlash());
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the user pick the same file again
    if (!file) return;
    setError(null);
    try {
      const res = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      handleResult(res.data);
    } catch {
      setError("No QR code found in that image.");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue({ payload: result }));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };

  const openResult = () => {
    if (detectType(result) === "upi") window.location.href = result; // hands over to the UPI app
    else window.open(result, "_blank", "noopener,noreferrer");
  };

  const info = result ? describeItem({ payload: result, action: "scanned", timestamp: Date.now() }) : null;
  const canOpen = info && (info.type === "url" || info.type === "upi");

  return (
    <div className="qr-page">
      <header className="app-header">
        <button className="iconbtn plain accent" aria-label="Back" onClick={() => onNavigate("home")}><Icon name="arrow_back" /></button>
        <h1>Scan</h1>
        <button className="iconbtn" aria-label={torchOn ? "Turn flash off" : "Turn flash on"} disabled={!hasFlash} onClick={toggleTorch}>
          <Icon name={torchOn ? "flash_on" : "flash_off"} fill={torchOn} />
        </button>
      </header>

      <main className="mx-auto max-w-md lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8 lg:px-8">
        {/* camera area */}
        <section className="relative h-[min(52dvh,430px)] overflow-hidden lg:h-[min(72dvh,620px)] lg:rounded-3xl" style={{ background: "#05060a" }}>
          <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" style={{ opacity: scanning ? 0.9 : 0.25 }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[55%]" style={{ width: 260, height: 260 }}>
            {CORNERS.map((c, i) => (
              <div key={i} className="absolute" style={{ width: 44, height: 44, borderStyle: "solid", borderColor: "var(--accent)", ...c }} />
            ))}
            {scanning && (
              <div className="absolute left-3 right-3" style={{ height: 2, background: "var(--accent)", boxShadow: "0 0 12px var(--accent)", animation: "scanline 2s linear infinite" }} />
            )}
          </div>
          <p className="absolute bottom-6 left-0 right-0 m-0 text-center text-sm" style={{ color: "#a3a9bb" }}>
            {scanning ? "Point the camera at a QR code" : "Tap Start scan to turn on the camera"}
          </p>
        </section>

        <div>
        {/* controls */}
        <div className="flex items-center justify-center gap-4 px-5 py-4">
          <button className="iconbtn" style={{ width: 56, height: 56, borderRadius: 28 }} aria-label="Scan from gallery" onClick={() => fileRef.current?.click()}>
            <Icon name="photo_library" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          {scanning ? (
            <button className="btn btn-primary" style={{ minHeight: 56, width: 170, borderRadius: 28, fontSize: 16 }} onClick={stop}>
              <Icon name="stop_circle" /> Stop scan
            </button>
          ) : (
            <button className="btn btn-primary" style={{ minHeight: 56, width: 170, borderRadius: 28, fontSize: 16 }} onClick={start}>
              <Icon name="qr_code_scanner" /> Start scan
            </button>
          )}

          <button className="iconbtn" style={{ width: 56, height: 56, borderRadius: 28 }} aria-label="Switch camera" disabled={!scanning} onClick={switchCamera}>
            <Icon name="cameraswitch" />
          </button>
        </div>

        {/* result or error */}
        <div className="px-5">
          {error && (
            <div role="alert" className="warn p-3.5 text-[13px] font-bold">{error}</div>
          )}

          {info && (
            <div className="card p-4" role="status">
              <div className="accent text-[13px] font-extrabold">
                {info.type === "upi" ? "UPI payment detected" : "Scanned successfully"}
              </div>
              <div className="mt-1 break-all text-[17px] font-extrabold">{info.title}</div>
              {info.extra && <div className="muted text-sm">{info.extra}</div>}

              <div className="mt-3 flex gap-2.5">
                <button className="btn btn-soft flex-1" onClick={copy}>
                  <Icon name={copied ? "check" : "content_copy"} /> {copied ? "Copied" : "Copy"}
                </button>
                {canOpen && (
                  <button className="btn btn-primary" style={{ flex: 2 }} onClick={openResult}>
                    <Icon name="open_in_new" /> {info.type === "upi" ? "Open UPI app" : "Open link"}
                  </button>
                )}
                <button className="btn btn-soft" aria-label="Scan again" onClick={start}><Icon name="refresh" /></button>
              </div>
            </div>
          )}
        </div>
        </div>
      </main>

      <BottomNav active="scan" onNavigate={onNavigate} onOpenSettings={onOpenSettings} />
    </div>
  );
};

export default Scan;
