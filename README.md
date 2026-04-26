# UpKeeper 

UpKeeper is an enterprise-grade standalone uptime monitoring dashboard engineered for zero-compromise precision. 
Built using a blazing fast **Go (Fiber)** worker daemon interacting over a deeply responsive **React (TypeScript)** frontend. 

## Features
- **Precise Background Pinging**: Real-time evaluation of HTTP endpoints using a multi-threaded Go worker pipeline.
- **Deep Connection Check**: Natively dissects incoming TLS handshakes to extract Domain SSL validity (`NotAfter`) bounds without third-party tools.
- **Aggregated Statistic Visualizations**: Uses `Recharts` and vanilla-CSS generated `Uptime Blocks` to mirror seamless enterprise visualization platforms.
- **Public Viewer Status Pages**: Opt-in public facing `/status/:slug` generated endpoint, letting guests actively view health of public services without needing internal admin access.
- **Hardened Aesthetic Theme**: Meticulously crafted custom flat "Dark Blue" geometric UI. Zero distracting bouncy Glassmorphism components!
- **Identity Governed by BasaltPass**: Uses a dedicated OAuth2 authentication wall resolving users seamlessly through our private tenant.

## Tech Stack
- **Backend:** Go 1.23, Fiber v2, SQLite (glebarez via GORM), Go-Resty
- **Frontend:** React 18, React Router v6, TypeScript, Vite, Recharts, Lucide-React
- **Identity:** BasaltPass via generic built-in Auth Flow handlers

## Setup Instructions
Make sure you first copy the `.env.example` configurations to `.env` providing the exact secret identity structures for BasaltPass (or run via localhost default).

### Running Background Server
1. Navigate to `/backend`.
2. Ensure you have SQLite libraries setup locally.
3. Boot the API: `go run main.go`
   *(Port `8111` required)*

### Running Frontend Control Panel 
1. Navigate to `/frontend`.
2. Grab Node dependencies: `npm install`
3. Launch proxy server: `npm run dev`
   *(Port `5114` mapped to `localhost:5114`)*

---
*Developed securely integrating OAuth compliance and precision analytical charts.*
