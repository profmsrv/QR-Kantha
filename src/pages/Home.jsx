import React from "react";
import Icon from "../components/Icon";
import BottomNav from "../components/BottomNav";
import { describeItem } from "../utils/qrData";

const Home = ({ history, onNavigate, onOpenSettings }) => {
  const recent = history.slice(0, 3);

  return (
    <div className="qr-page">
      <header className="app-header" style={{ height: 72, paddingTop: 8 }}>
        <h1 className="accent" style={{ paddingLeft: 8, fontSize: 22 }}>QR Kantha</h1>
        <button className="iconbtn" aria-label="Settings" onClick={onOpenSettings}>
          <Icon name="settings" />
        </button>
      </header>

      <main className="mx-auto max-w-2xl px-5 lg:max-w-5xl lg:px-8">
        <section className="pt-4">
          <p className="muted m-0 text-sm font-semibold">Hi there</p>
          <h2 className="mb-0 mt-1 text-[28px] font-extrabold leading-tight lg:text-4xl">What would you like to do?</h2>
        </section>

        <section className="grid grid-cols-2 gap-3 py-5 lg:grid-cols-3 lg:gap-4">

          <button
            className="col-span-2 h-32 rounded-3xl border-0 px-5 py-4 text-left lg:col-span-1 lg:h-44 relative overflow-hidden flex flex-col justify-center"
            style={{ background: "var(--accent)", color: "var(--on-accent)", cursor: "pointer" }}
            onClick={() => onNavigate("scan")}
          >
            <div className="relative z-10 pr-24 lg:pr-36">
              <Icon name="qr_code_scanner" fill size={30} />
              <div className="mt-2 text-xl lg:text-2xl font-extrabold">Scan QR</div>
              <div className="text-xs lg:text-sm opacity-90 whitespace-nowrap">Camera or image from gallery</div>
            </div>
            <img 
              src="/QR_Code_pana.svg" 
              alt="Scan QR Illustration" 
              className="absolute right-4 top-1/2 -translate-y-1/2 h-full max-h-30 lg:max-h-32 object-contain pointer-events-none opacity-90" 
            />
          </button>

          <button
            className="card h-[104px] px-4 py-3 text-left lg:h-44 relative overflow-hidden flex flex-col justify-center"
            style={{ cursor: "pointer", color: "var(--text)", borderColor: "var(--accent)" }}
            onClick={() => onNavigate("create")}
          >
            <div className="relative z-10 pr-24 lg:pr-36">
              <div className="accent text-base lg:text-lg font-extrabold whitespace-nowrap">Create QR</div>
              <div className="muted mt-1 text-xs lg:text-[13px] whitespace-nowrap">Text, URL, Wi-Fi</div>
            </div>
            <img 
              src="/Creat_QR_Btn.png" 
              alt="Create QR Illustration" 
              className="absolute -right-1 top-1/2 -translate-y-1/2 h-full max-h-20 lg:max-h-32 object-contain pointer-events-none opacity-90" 
            />
          </button>

          <button
            className="card h-[104px] px-4 py-3 text-left lg:h-44 relative overflow-hidden flex flex-col justify-center"
            style={{ cursor: "pointer", color: "var(--text)", borderColor: "var(--accent)" }}
            onClick={() => onNavigate("create", { type: "upi" })}
          >
            <div className="relative z-10 pr-24 lg:pr-36">
              <div className="accent text-base lg:text-lg font-extrabold whitespace-nowrap">UPI Payment</div>
              <div className="muted mt-1 text-xs lg:text-[13px] whitespace-nowrap">ID + amount, split QRs</div>
            </div>
            <img 
              src="/Cash_Payment_bro.svg" 
              alt="UPI Illustration" 
              className="absolute -right-2 top-1/2 -translate-y-1/2 h-full max-h-20 lg:max-h-32 object-contain pointer-events-none opacity-90" 
            />
          </button>

        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="m-0 text-lg font-extrabold">Recent</h3>
            <button className="btn btn-ghost" onClick={() => onNavigate("history")}>View all</button>
          </div>

          {recent.length === 0 ? (
            <div className="card muted p-5 text-center text-sm">Nothing yet. Scan or create a QR code and it will show up here.</div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
              {recent.map((item) => {
                const d = describeItem(item);
                return (
                  <button
                    key={item.id}
                    className="card flex items-center gap-3 p-3 text-left"
                    style={{ cursor: "pointer", color: "var(--text)" }}
                    onClick={() => onNavigate("history")}
                  >
                    <span className="tag">{d.tag}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-extrabold">{d.title}</span>
                      <span className="muted block text-[13px]">
                        {d.verb}, {d.time}{d.extra ? `, ${d.extra}` : ""}
                      </span>
                    </span>
                    <Icon name="chevron_right" className="muted" />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav active="home" onNavigate={onNavigate} onOpenSettings={onOpenSettings} />
    </div>
  );
};

export default Home;
