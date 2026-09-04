# Lumina Commerce - Next.js Frontend

Production-ready e-commerce frontend interface built with **Next.js 16 (App Router, JavaScript)**, **Tailwind CSS**, **Redux Toolkit (RTK Query)**, and **Socket.io Client** for real-time order lifecycle tracking.

Designed using the **Lumina Commerce** design tokens with high-contrast surfaces, micro-animations, and mobile-ergonomic workflows.

---

## 🌟 Core Features

- **Storefront & Product Catalog**: Filter by category, real-time debounced search, sort by price/recency, and in-stock toggling.
- **Multi-Variant Inventory Selector**: Live variant switching (size, color, storage) with dynamic pricing and remaining stock badges.
- **Freshness & Expiry Guard**: Visible warning notices for perishable items and expiry dates.
- **Cart & Dynamic Discount Engine**: Real-time coupon validation (`WELCOME10`, `FLAT50`, etc.) with subtotal eligibility and role restrictions.
- **Concurrency-Protected Checkout**: 
  - Submits unique client `Idempotency-Key` headers.
  - Handles concurrent stock conflict rejections (`409 Conflict`) with clear user alerts when competing for the last item.
  - Payment failure simulation toggle to test atomic transaction rollbacks.
- **Real-Time Order Tracking**:
  - Live visual progression stepper (`CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`).
  - Powered by **Socket.io** (`ws://localhost:5000`) for live status updates without page reloads.
- **Order Cancellation & Automatic Refunds**:
  - Allows cancellation during `CONFIRMED` and `PROCESSING` states with automatic inventory replenishment and refund records.
  - Hard guard blocking cancellation once an order is marked `SHIPPED` or `DELIVERED`.
- **Operations Dashboard**:
  - Admin & Sales Agent portal with real-time KPI cards (gross revenue, order counts, low-stock alerts).
  - Status progression dropdown that broadcasts live updates to customers over WebSockets.
  - Inline variant restock actions.
- **1-Click Persona Login**:
  - Quick persona switchers for rapid evaluation between `Admin`, `Sales Agent`, `Customer 1 (Alice)`, and `Customer 2 (Bob)`.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router, Pure JavaScript)
- **Styling**: Tailwind CSS v4
- **State Management & Data Fetching**: Redux Toolkit & RTK Query
- **Real-Time WebSockets**: Socket.io Client (`socket.io-client`)
- **Icons**: Lucide React (`lucide-react`)
- **Effects**: Canvas Confetti (`canvas-confetti`)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js `v20+` or `v22+`
- Running backend API server on `http://localhost:5000`

### 2. Environment Variables
Create a `.env.local` file in the `frontend/` directory (optional, defaults to localhost:5000):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Production Build
```bash
npm run build
npm start
```
