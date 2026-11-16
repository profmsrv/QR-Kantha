# QR Kantha

## Using ACCOUNT - Claude - masrvasupalli177@gmail

React + Vite + Tailwind PWA. Scan QR codes, create QR codes (text, URL, Wi-Fi, contact) and UPI payment QRs
that split large amounts into smaller parts with manual "mark as paid" tracking.

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (camera works on localhost)
npm run build      # production build + PWA service worker in /dist
npm run preview    # serve the production build locally (test install + offline here)
```

Needs Node 18 or newer.

## Notes

- **Camera needs HTTPS.** `localhost` is allowed, but to test on a phone, deploy the `dist` folder
  (Netlify, Vercel, Cloudflare Pages, GitHub Pages) which all give you HTTPS.
- **PWA.** The service worker is only generated in the production build, so test install/offline with
  `npm run build && npm run preview`. Chrome and Edge show an Install button in Settings.
  On iPhone use Share > Add to Home Screen.
- **Split limit.** Default is Rs 1,00,000 per QR and can be changed in Settings. Check current UPI limits
  and charges for your use case; the app does not enforce bank rules.
- **Structure:** see the file map at the top of `src/QR_READER.jsx`.
- Subfolder deploys (e.g. GitHub Pages `/repo/`): set `base` in `vite.config.js` and the manifest `start_url`/`scope`.
