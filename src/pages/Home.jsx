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
            className="col-span-2 h-32 rounded-3xl border-0 p-5 text-left lg:col-span-1 lg:h-44"
            style={{ background: "var(--accent)", color: "var(--on-accent)", cursor: "pointer" }}
            onClick={() => onNavigate("scan")}
          >
            <Icon name="qr_code_scanner" fill size={30} />
            <div className="mt-2 text-2xl font-extrabold">Scan QR</div>
            <div className="text-sm opacity-90">Camera or image from gallery</div>
          </button>

          <button className="card h-[104px] p-4 text-left lg:h-44" style={{ cursor: "pointer", color: "var(--text)" }} onClick={() => onNavigate("create")}>
            <div className="text-lg font-extrabold">Create QR</div>
            <div className="muted mt-1 text-[13px]">Text, URL, Wi-Fi</div>
          </button>

          <button
            className="card h-[104px] p-4 text-left lg:h-44"
            style={{ cursor: "pointer", color: "var(--text)", borderColor: "var(--accent)" }}
            onClick={() => onNavigate("create", { type: "upi" })}
          >
            <div className="accent text-lg font-extrabold">UPI Payment</div>
            <div className="muted mt-1 text-[13px]">ID + amount, split QRs</div>
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
