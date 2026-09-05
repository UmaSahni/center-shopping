# Center Shopping - Next.js 16 Storefront & Portals

A modern, high-performance E-Commerce frontend built with **Next.js 16 (App Router)**, **Tailwind CSS**, **Redux Toolkit (RTK Query)**, **Firebase Authentication**, and **Socket.io Client** for real-time tracking.

---

## 🌐 Live Application

- **Live URL**: [https://center-shopping.vercel.app](https://center-shopping.vercel.app)
- **Backend API**: `http://72.61.246.61:5000/api/v1`
- **Real-Time WebSocket**: `ws://72.61.246.61:5000`

---

## 🌟 Key Features

### 1. Consumer Storefront (`/`)
- **Product Catalog**: Live search, category filtering, stock availability toggles, and sorting.
- **Variant Selector**: Multi-variant lot picker (size, color, storage) with dynamic stock quantities.
- **Cart & Discounts**: Promotional coupon engine with subtotal eligibility checking.
- **Checkout & NMI Gateway**: Direct card payment processing and printable order receipts.

### 2. Dedicated Sales Agent Console (`/agent`)
- **Dark Sidebar Workspace**: Live status pill, quick promo link copier (`AGENTPROMO`), and KPI metrics.
- **Client Roster**: Assigned customer accounts, historical GMV attribution, and 5% commission earnings.
- **Order Monitoring**: Filter customer orders, inspection tools, and receipt generation.

### 3. Administrator Console (`/admin`)
- **Operations Center**: Real-time sales analytics, revenue graphs, and low-stock alerts.
- **Product & Inventory Management**: Add/edit physical assets, manage stock lots, and track expiring products.
- **Order Status Controller**: Live status transition stepper broadcasting updates to customers via WebSockets.
- **Staff Management**: Assign sales agents to customer accounts and generate promotional vouchers.

### 4. Real-Time Tracking & Google Auth
- **Socket.io Live Updates**: Instant order lifecycle notifications without polling.
- **Firebase Google OAuth**: One-click Google sign-in with automatic customer account creation and welcoming alerts.

---

## 👥 Demo Logins & Portals

| Role | Email | Password | Dedicated Portal |
|---|---|---|---|
| 👑 **Administrator** | `admin@gmail.com` | `Password@123` | [`/admin`](https://center-shopping.vercel.app/admin) |
| 💼 **Sales Agent** | `agent@gmail.com` | `Password@123` | [`/agent`](https://center-shopping.vercel.app/agent) |
| 🛒 **Customer** | `customer@gmail.com` | `Password@123` | [`/login`](https://center-shopping.vercel.app/login) |

---

## 🛠️ Local Development

### 1. Prerequisites
- Node.js `v18+` or `v20+`

### 2. Installation
```bash
cd frontend
npm install
```

### 3. Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```
