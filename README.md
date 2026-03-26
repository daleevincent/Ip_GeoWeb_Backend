# 🌍 IP Geolocation App

> A full-stack web application for visualizing IP geolocation data on an interactive map, with search history and JWT-based authentication.

---

## 📦 Repositories

| Layer | Repository |
|-------|------------|
| Backend (API) | [`ip-geo-api`](https://github.com/yourusername/ip-geo-api) |
| Frontend (Web) | [`ip-geo-web`](https://github.com/yourusername/ip-geo-web) |

---

## ✨ Features

- 🔐 JWT-based user authentication
- 📍 Automatically detect and display your own IP geolocation
- 🔎 Search any **IPv4 address** and view it on a map
- 🗂️ Searchable history of past IP lookups
- 📌 Pin multiple locations on an interactive **Leaflet** map
- 🗑️ Delete history items or click to re-fetch

---

## 🔑 Default Login Credentials

| Field | Value |
|-------|-------|
| **Email** | `test@example.com` |
| **Password** | `123456` |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Node.js · Express · SQLite · JWT |
| **Frontend** | React · React Router · Axios · Leaflet |

---

## ⚙️ Backend Setup

### Prerequisites

- Node.js **v24.x** (tested on `v24.11.1`)

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/yourusername/ip-geo-api.git
cd ip-geo-api
```

**2. Install dependencies**

```bash
npm install
```

**3. Seed the database**

```bash
node src/seed.js
```

> ℹ️ This creates the `users` and `ip_history` tables and inserts the default login user.

**4. Start the development server**

```bash
npm run dev
```

> ✅ Server runs at: `http://localhost:8000`

---

### 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/login` | `POST` | Authenticate user, returns JWT token |
| `/api/history` | `GET` | Retrieve the user's search history |
| `/api/history` | `POST` | Add a new IP to history |
| `/api/history/:id` | `DELETE` | Delete a specific history item |

---

## 🖥️ Frontend Setup

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/yourusername/ip-geo-web.git
cd ip-geo-web
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure the backend URL** *(optional)*

Open `src/pages/Home.jsx` and update the API base URL if your backend runs on a different host or port:

```js
// Default
const API_BASE = "http://localhost:8000/api";
```

**4. Start the app**

```bash
npm start
```

> ✅ App opens at: `http://localhost:3000`

---

## 🚀 Running the Full Project Locally

Open **two terminal windows** and run:

```bash
# Terminal 1 — Start the backend
cd ip-geo-api
npm run dev
```

```bash
# Terminal 2 — Start the frontend
cd ip-geo-web
npm start
```

Then open **http://localhost:3000** in your browser and log in with the [default credentials](#-default-login-credentials).

---

## 🟢 Node.js Version

Tested on **Node.js v24.11.1** — Node.js **v24.x** is recommended.

---

## 📄 License

This project is open source. Feel free to use and modify it.
