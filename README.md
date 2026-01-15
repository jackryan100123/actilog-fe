# Actilog (React)

A modern, enterprise-grade **React application** for organizational workflow management.  
The system enables **Analysts** to log daily activities and **Administrators** to monitor operations through a secure, high-performance user interface.

---

## 🏗️ Application Architecture

The frontend is built as a **decoupled client application**, designed for scalability, maintainability, and performance.

---

## 🎨 Frontend Architecture (React 19)

A modern UI built with **Vite**, leveraging the latest React patterns and performance optimizations.

### 🚦 Advanced Routing
- Manifest-based routing system (`manifest.routes`)
- Supports nested layouts
- Enables dynamic route patching without full reloads

### ⚡ Single-Fetch Data Loading
- Optimized data fetching per route
- Retrieves only required data during navigation
- Uses readable streams to minimize network overhead

### 📊 Visualization & Reporting
- Integrated **Chart.js** for analytics dashboards
- Custom internal color utility library for consistent theming and reports

### 🧠 State & Data Handling
- Centralized API service layer
- Role-aware UI rendering (Admin, Analyst, User)
- Pagination, filtering, and sorting built into data views

---

## 🔐 Key User Workflows

### Secure Access
- Users authenticate via the UI
- JWT tokens are stored securely (memory or http-only cookies)
- Requests include tokens for authorized API access

### Activity Logging
- Analysts log daily tasks and activities
- UI validates role-based permissions before submission
- Optimistic UI updates for improved UX

### Administrative Oversight
- Admin users access:
  - Paginated activity logs
  - Summary views and analytics
- Efficient client-side rendering for large datasets

---

## 🛠️ Tech Stack

- **React:** 19
- **Build Tool:** Vite
- **Language:** TypeScript
- **Charts:** Chart.js
- **Polyfills:** Core-js
- **Styling:** CSS Modules / Tailwind / Styled Components *(as configured)*

---

## 🛠️ Getting Started

### 📋 Prerequisites
- **Node.js:** Latest LTS version
- **Package Manager:** npm or yarn

---

## 🚀 Installation

```bash
# Install dependencies
npm install
```

## ▶️ Running the App

```bash
# Start development server
npm run dev
```

The application will be available at:
```bash
http://localhost:5173
```

## 🛡️ Development & Safety

### 🧪 Type Safety
- Fully implemented with **TypeScript**
- Strict type checking enabled

### 🚨 Error Handling
- Global **Error Boundaries**
- Route-level error handling
- Graceful handling of API and authorization errors

### 🔒 Security Considerations
- Role-based UI access control
- Protection against unsafe object access
- Defensive rendering against malformed API responses
