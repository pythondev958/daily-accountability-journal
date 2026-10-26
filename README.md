# Daily Accountability Journal

**A browser-based productivity and expense-tracking workspace built with React, TypeScript, and Vite.**

Record daily activities, professional updates, personal notes, and expenses in one place. The application offers optional voice input, rule-based expense extraction, visual summaries, and downloadable PDF reports without requiring an account or application backend.

**[Live Demo](https://daily-accountability-journal.vercel.app/)** · **[GitHub Repository](https://github.com/pythondev958/daily-accountability-journal)**

## Features

- **Unified daily entries:** Capture activities, reflections, work updates, and expenses using a single text field.
- **Optional voice dictation:** Use the browser's Web Speech API, where supported, to dictate entries before reviewing and saving them.
- **Expense recognition:** Identify a positive amount when explicitly written with `PKR`, `Rs.`, or `rupees`; ordinary numbers in notes are not automatically treated as expenses.
- **Rule-based categorization:** Group recognized expenses into categories such as Transportation, Office & Supplies, Utilities, Software & Services, Professional Development, and General.
- **Dashboard statistics:** Display total recorded expenses, entry count, expense count, and largest recognized expense for the selected period.
- **Visual analytics:** Display a category-wise expense chart with Recharts when expense data is available.
- **Time filters:** Review entries for Today, This Month, or All Data.
- **PDF reports:** Export the selected period's journal entries and recognized expense information as a PDF using jsPDF.
- **Local storage:** Save journal records in the browser with `localStorage`. No application database, login, or account is required.
- **Responsive interface:** Designed for desktop and mobile viewing.

## Technology Stack

| Technology | Purpose |
| --- | --- |
| React | User interface and component state |
| TypeScript | Typed application logic |
| Vite | Development server and production build |
| CSS | Responsive layout and visual styling |
| Recharts | Expense breakdown chart |
| jsPDF | Browser-side PDF report generation |
| Web Speech API | Optional browser-based speech recognition |
| localStorage | Browser-local persistence of saved entries |

## Getting Started

### Requirements

- Node.js and npm installed locally
- A current web browser (voice recognition support varies by browser)

### Run locally

```bash
git clone https://github.com/pythondev958/daily-accountability-journal.git
cd daily-accountability-journal
npm ci
npm run dev
```

Open the local URL shown by Vite in your terminal (typically `http://localhost:5173`).

### Production build

```bash
npm run build
npm run preview
```

The build output is generated in `dist/`.

## How to Use

1. Enter a note or expense, or use **Voice Input** if your browser supports speech recognition.
2. Review the text before selecting **Save Entry**.
3. Choose **Today**, **This Month**, or **All Data** to view the corresponding entries and statistics.
4. Explore the expense breakdown chart when recognized expenses exist.
5. Select **Export Report** to download a PDF for the selected reporting period.

### Example entries

**Work activity (not an expense):**

```text
Completed the weekly technical review and documented next steps.
```

**Recognized expense:**

```text
Office supplies expense PKR 850.
```

**Recognized expense:**

```text
Transportation expense Rs. 1,200.
```

The expense parser detects explicit currency amounts using pattern matching; categories are assigned using keyword rules. This is **not** an LLM-powered classifier or financial accounting engine.

## Privacy & Data Handling

- Saved entry text and expense details are held in your browser's `localStorage`; the application does not require an application backend or user authentication.
- The application does **not** provide cloud synchronization, multi-device accounts, encrypted storage, or automatic backups.
- Browser storage is local to a particular browser/profile and origin. Clearing site data or using a different browser or device can make your saved records unavailable.
- **Voice recognition is browser-dependent.** Some browsers may process audio using remote speech services. Browser voice recognition should not be assumed to be fully offline or private.
- PDF files are generated in the browser, and you decide where to save and share them.
- Avoid entering highly sensitive information into the demo, particularly on shared devices.

## Current Scope and Limitations

This project is a lightweight client-side proof of concept, not a production financial-management platform.

- Only explicitly marked currency amounts are identified; the parser may miss other formats or ambiguous phrases.
- An entry with several monetary amounts is not treated as a full multi-transaction ledger.
- Keyword-based categories can occasionally be incorrect.
- Voice input depends on permissions, browser support, and the browser's recognition service.
- There is no account system, cloud backup, data export in a structured interchange format, or synchronization across devices.

## Possible Enhancements

- Editable entries and user-managed categories
- Import/export of structured data for backup and restoration
- Additional currencies and more robust amount extraction
- Accessibility testing and automated end-to-end tests
- Optional secure synchronization as a separate future feature

## Project Structure

```text
.
├── public/               # Static assets, including the site favicon if present
├── src/
│   ├── App.tsx           # Entry capture, expense logic, filters, charts, PDF export
│   ├── App.css           # Application styling and responsive layout
│   └── main.tsx          # React application entry point
├── index.html            # Page metadata and application root
├── package.json          # Dependencies and npm scripts
└── README.md             # Project documentation
```

## Developer

**Omar Rasheed** — Python & AI Systems Engineer

- [GitHub](https://github.com/pythondev958)
- [LinkedIn](https://www.linkedin.com/in/omar-r-b43903381/)
- [Portfolio](https://omar-portfolio-xi-nine.vercel.app/)

> **Note:** Repository visibility does not automatically grant open-source reuse rights. Add a `LICENSE` file if you decide to permit reuse under a specific license.
