import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PWA: vite-plugin-pwa builds the manifest + service worker so the app installs and works offline.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate", // new versions install silently and apply on next open
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "QR Kantha",
        short_name: "QR Kantha",
        description: "Scan and create QR codes, including UPI payment QRs split into smaller parts.",
        theme_color: "#f4f6fb",
        background_color: "#f4f6fb",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Scan QR", url: "/?page=scan", icons: [{ src: "pwa-192.png", sizes: "192x192" }] },
          { name: "UPI payment QR", url: "/?page=create&type=upi", icons: [{ src: "pwa-192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Cache Google Fonts (text + icon font) after the first visit so the UI looks right offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],   
  server: { host: '0.0.0.0', port: 1234 },   
  preview: { host: '0.0.0.0', port: 1234 },
});
