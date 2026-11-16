import React, { useEffect, useState } from "react";
import Icon from "./Icon";
import { makeQrDataUrl } from "../utils/qrData";

const FOREVER_KEY = "qr_desktop_notice_off"; // "Don't show again"
const SESSION_KEY = "qr_desktop_notice_seen"; // "Got it" (hidden until the tab closes)

// A desktop = big screen with a mouse. Phones and tablets with touch are not.
const looksLikeDesktop = () => window.matchMedia("(min-width: 900px) and (pointer: fine)").matches;

// Pop-up that asks desktop users to open the app on their phone.
const DesktopNotice = () => {
  const [show, setShow] = useState(false);
  const [qr, setQr] = useState(null);

  useEffect(() => {
    try {
      if (looksLikeDesktop() && !localStorage.getItem(FOREVER_KEY) && !sessionStorage.getItem(SESSION_KEY)) {
        setShow(true);
        makeQrDataUrl(window.location.href, "M").then(setQr).catch(() => {});
      }
    } catch {
      /* storage blocked: skip the notice */
    }
  }, []);

  if (!show) return null;

  const dismiss = (forever) => {
    try {
      (forever ? localStorage : sessionStorage).setItem(forever ? FOREVER_KEY : SESSION_KEY, "1");
    } catch { /* ignore */ }
    setShow(false);
  };

  return (
    <>
      <div className="backdrop open" style={{ background: "rgba(10,12,20,.55)" }} />
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="desk-title">
        <div className="tag mx-auto" style={{ width: 56, height: 56, borderRadius: 18 }}>
          <Icon name="smartphone" size={28} />
        </div>
        <h2 id="desk-title" className="mb-0 mt-4 text-[22px] font-extrabold">Works here, even better on your phone</h2>
        <p className="muted mb-4 mt-2 text-[15px] leading-relaxed">
          You can use everything on desktop. For quick scanning and paying with UPI apps, your phone is easier.
        </p>
        {qr && (
          <>
            <img src={qr} alt="QR code that opens this app on your phone" width={120} height={120} className="mx-auto rounded-xl" />
            <div className="muted mb-5 mt-2 text-[13px]">Scan to open on your phone</div>
          </>
        )}
        <div className="flex gap-2.5">
          <button className="btn btn-soft flex-1" onClick={() => dismiss(true)}>Don't show again</button>
          <button className="btn btn-primary flex-1" onClick={() => dismiss(false)}>Continue on desktop</button>
        </div>
      </div>
    </>
  );
};

export default DesktopNotice;
