# 🏪 Mohan Traders - Shop & Inventory Management System

A fast, lightweight, and zero-cost Single-Page Web Application designed specifically for **Mohan Traders** to manage wholesale beverage & FMCG distribution across delivery routes.

- 🌐 **Live GitHub Pages URL**: [https://loganadan-m.github.io/mohan-traders/](https://loganadan-m.github.io/mohan-traders/)
- 📊 **Connected Google Spreadsheet**: [Mohan Traders Master Sheet](https://docs.google.com/spreadsheets/d/153Y1QbapMUz5MnoBZAN2B0qNMjlByzEp/edit?usp=sharing)
- 💰 **Hosting & Database Cost**: **$0.00 / ₹0.00 (100% Free Forever)** via GitHub Pages & Google Sheets.

---

## 🌟 Key Features

1. **Route POS & Quick Delivery Billing**:
   - Designed for field delivery agents and vans.
   - Filter customer shops by Route (**Tollgate**, **Samayapuram**, **Manachanallur**).
   - Fast customer shop lookup with real-time **Previous Due Balance** display.
   - Tap-to-add product catalog with automatic line total calculation (`Qty × Rate`).
   - Payment modes: Cash, UPI, Credit.
   - **1-Click WhatsApp Bill**: Generates a pre-formatted itemized bill message sent directly to the customer's WhatsApp.
   - **Thermal Invoice Printing**: Formatted print layout for Bluetooth thermal receipts (58mm/80mm) or standard printers.

2. **Daily Van Load Sheet ("DAILY TAKEN")**:
   - Morning vehicle loading: Enter `Taken` quantities.
   - Live route tracking: Computes total items dispatched in real-time.
   - Evening closing: Automatically reconciles `Return = Taken - Sold` and validates sales revenue.

3. **Pre-Loaded Master Data**:
   - **212 Customer Shops** across Tollgate (109), Samayapuram (85), and Manachanallur (18).
   - **52 Products** across Tea, Coffee, Health Drinks (Horlicks, Boost), Milk Drinks, and provisions.
   - Initial stock counts and wholesale pricing.

4. **Product & Pricing Catalog**:
   - Filter by categories: *Tea, Health Drink, Milk Drink, Coffee, Other*.
   - Add new products or quickly update wholesale rates.

5. **Customer Shops Directory & Ledger**:
   - Complete directory of 212 tea stalls, bakeries, and shops.
   - Outstanding ledger dues tracking.
   - Record standalone payments against old debt without creating new orders.

6. **Offline-First & Local Storage**:
   - All transactions and changes are instantly saved to browser `localStorage`.
   - Never lose data on field routes even without cellular internet.
   - Export full JSON backup or CSV reports with one click.

---

## 🚀 How to Run the App

### Option 1: Live via GitHub Pages
Visit: **[https://loganadan-m.github.io/mohan-traders/](https://loganadan-m.github.io/mohan-traders/)**

### Option 2: Run Locally (Zero Setup)
Simply double-click `index.html` in your file explorer to open it in Chrome, Edge, Safari, or Firefox! No Node.js or web server required.

---

## 🔗 Connecting Your Google Sheet as the Database

To enable automated two-way synchronization between your web dashboard and your Google Sheet:

1. Open your [Google Sheet](https://docs.google.com/spreadsheets/d/153Y1QbapMUz5MnoBZAN2B0qNMjlByzEp/edit).
2. Click **Extensions > Apps Script** in the top menu.
3. Delete any default code in the editor, and paste the entire contents of [`google-apps-script/Code.gs`](./google-apps-script/Code.gs).
4. Click **Save** (Ctrl + S).
5. Click **Deploy > New deployment** in the top right.
6. Click the gear icon next to "Select type" and choose **Web app**.
   - **Description**: `Mohan Traders API`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone` *(Crucial so the dashboard can communicate with the sheet)*
7. Click **Deploy**, authorize permissions when prompted, and copy the **Web app URL** (ends in `/exec`).
8. In the Mohan Traders Dashboard, go to **Google Sheet (Settings)**, paste the URL, and click **Save & Test Connection**!

---

## 📁 Repository Structure

```
mohan-traders/
├── index.html                   # Single-Page Web Dashboard
├── app.js                       # Core application state, POS logic, and sync engine
├── seedData.js                  # Preloaded data (212 shops, 52 products from sheet)
├── style.css                    # Custom styles, responsive tables, thermal receipt CSS
├── google-apps-script/
│   └── Code.gs                  # Google Apps Script Web App for 2-way sheet sync
├── .github/
│   └── workflows/
│       └── deploy.yml           # Automated GitHub Pages CI/CD workflow
└── README.md                    # Project documentation
```

---

## 🛠️ Technology Stack
- **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3
- **Styling**: Tailwind CSS (CDN), Custom Responsive Table & Thermal Print CSS
- **Icons**: Lucide Icons
- **Database**: Google Sheets (via Google Apps Script Web App)
- **Local Storage**: HTML5 LocalStorage (Offline-First)
- **Hosting**: GitHub Pages (Automated GitHub Actions)
