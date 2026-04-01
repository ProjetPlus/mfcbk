Camp Béthel Mutuelle Funéraire — design system, architecture decisions, and constraints

## Design System
- Palette: Bordeaux (#6B1A2E) & Or (#C9A84C) — see index.css for full HSL tokens
- Fonts: Playfair Display (H1, amounts), DM Sans (body), Cormorant Garamond (card names)
- Background: Crème #FAF7F4, Text: Noir doux #1A1A1A

## Architecture
- Frontend-first with local IndexedDB database (Dexie.js)
- NO Supabase, NO Lovable Cloud — everything runs locally
- Data persisted in browser IndexedDB (campbethel database)
- Admin account: admin / 12345678 (seeded on first run)
- Export/import JSON for data backup between devices
- PWA manifest for installability (no service worker in dev)
- 16 screens total per cahier des charges

## Key Business Rules
- Member ID format: MSCB-YY-NNN (auto-generated, resets each year)
- Adhesion fee: 10,000 FCFA (one-time, required to finalize registration)
- Contribution per death: 1,000 FCFA × covered persons
- Max 2 secondary members per principal
- 6 user roles (Super Admin, Admin, Read-only, Cotisations, Membres, Imprimeur)
- Death payout: 300,000 FCFA (principal), 250,000 FCFA (secondaire, 50k retained)

## Libraries
- Dexie.js + dexie-react-hooks: IndexedDB database
- html5-qrcode: QR code scanner
- jsPDF: PDF generation (cards, reports)
- qrcode: QR code generation for member cards
- CR80 card format: 85.6mm × 54mm

## Auth
- Local auth via IndexedDB users table
- Session stored in sessionStorage
- Protected routes via AuthProvider/ProtectedRoute
