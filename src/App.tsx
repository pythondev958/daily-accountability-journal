import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import "./App.css";

type Entry = {
  id: string;
  text: string;
  amount?: number;
  category?: string;
  createdAt: string;
};

type SpeechRecognitionType = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

const ENTRY_KEY = "daj-unified-entries-v1";
const OLD_EXPENSE_KEY = "daj-expenses";
const OLD_NOTE_KEY = "daj-notes";

const categories = [
  "General",
  "Food",
  "Travel",
  "Health",
  "Rent",
  "Bills",
  "Work",
  "Self-care",
  "Other",
];

const chartColors = [
  "#0f766e",
  "#16a34a",
  "#2563eb",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#64748b",
  "#14b8a6",
  "#0ea5e9",
];

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draftText, setDraftText] = useState("");
  const [filter, setFilter] = useState("today");
  const [successMessage, setSuccessMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const shouldKeepListeningRef = useRef(false);

  useEffect(() => {
    const savedEntries = localStorage.getItem(ENTRY_KEY);

    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
      return;
    }

    const oldExpenses = JSON.parse(localStorage.getItem(OLD_EXPENSE_KEY) || "[]");
    const oldNotes = JSON.parse(localStorage.getItem(OLD_NOTE_KEY) || "[]");

    if (oldExpenses.length || oldNotes.length) {
      const migratedEntries: Entry[] = [
        ...oldExpenses.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          text: `${item.title} - Rs. ${item.amount}`,
          amount: Number(item.amount),
          category: item.category || "General",
          createdAt: item.createdAt || new Date().toISOString(),
        })),
        ...oldNotes.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          text: item.text,
          createdAt: item.createdAt || new Date().toISOString(),
        })),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setEntries(migratedEntries);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ENTRY_KEY, JSON.stringify(entries));
  }, [entries]);

  const todayLabel = new Date().toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 2200);
  };

  const isSpeechSupported = () => {
    return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
  };

  const guessCategory = (text: string) => {
    const lower = text.toLowerCase();

    if (
      lower.includes("food") ||
      lower.includes("burger") ||
      lower.includes("fries") ||
      lower.includes("pizza") ||
      lower.includes("tea") ||
      lower.includes("lunch") ||
      lower.includes("dinner") ||
      lower.includes("breakfast") ||
      lower.includes("foodpanda")
    ) {
      return "Food";
    }

    if (
      lower.includes("uber") ||
      lower.includes("careem") ||
      lower.includes("rickshaw") ||
      lower.includes("bus") ||
      lower.includes("travel") ||
      lower.includes("petrol") ||
      lower.includes("fuel")
    ) {
      return "Travel";
    }

    if (
      lower.includes("rent") ||
      lower.includes("room") ||
      lower.includes("hotel") ||
      lower.includes("guest house")
    ) {
      return "Rent";
    }

    if (
      lower.includes("bill") ||
      lower.includes("electricity") ||
      lower.includes("gas") ||
      lower.includes("water") ||
      lower.includes("internet")
    ) {
      return "Bills";
    }

    if (
      lower.includes("medicine") ||
      lower.includes("doctor") ||
      lower.includes("hospital") ||
      lower.includes("health")
    ) {
      return "Health";
    }

    if (lower.includes("office") || lower.includes("work") || lower.includes("client")) {
      return "Work";
    }

    return "General";
  };

  const detectAmount = (text: string) => {
    const matches = text.match(/\d+(?:,\d+)*(?:\.\d+)?/g);

    if (!matches || matches.length === 0) return undefined;

    return Number(matches[matches.length - 1].replace(/,/g, ""));
  };

  const saveEntry = () => {
    const cleanText = draftText.trim();

    if (!cleanText) return;

    const amount = detectAmount(cleanText);
    const category = amount ? guessCategory(cleanText) : undefined;

    const newEntry: Entry = {
      id: crypto.randomUUID(),
      text: cleanText,
      amount,
      category,
      createdAt: new Date().toISOString(),
    };

    setEntries([newEntry, ...entries]);
    setDraftText("");
    setVoiceMessage("");
    showSuccess(amount ? "Entry saved with detected amount" : "Entry saved");
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter((item) => item.id !== id));
  };

  const startVoiceCapture = () => {
    if (!isSpeechSupported()) {
      setVoiceMessage("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      stopVoiceCapture();
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition: SpeechRecognitionType = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onresult = (event: any) => {
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }

      const spokenText = finalText.trim();

      if (!spokenText) return;

      setDraftText((previous) =>
        previous.trim() ? `${previous.trim()} ${spokenText}` : spokenText
      );
    };

    recognition.onerror = () => {
      setVoiceMessage("Voice input paused. Restarting if allowed...");
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
          setIsListening(true);
          setVoiceMessage("Listening... speak expense, note, feeling, food, or anything.");
        } catch {
          setIsListening(false);
          setVoiceMessage("Voice input stopped. Tap Speak again.");
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    shouldKeepListeningRef.current = true;

    try {
      recognition.start();
      setIsListening(true);
      setVoiceMessage("Listening... speak expense, note, feeling, food, or anything.");
    } catch {
      setVoiceMessage("Voice input could not start. Please try again.");
    }
  };

  const stopVoiceCapture = () => {
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setVoiceMessage("");
  };

  const isInFilter = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    if (filter === "all") return true;

    if (filter === "today") {
      return date.toDateString() === now.toDateString();
    }

    if (filter === "month") {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }

    return true;
  };

  const filteredEntries = entries.filter((item) => isInFilter(item.createdAt));

  const expenseEntries = filteredEntries.filter((item) => item.amount);

  const total = useMemo(() => {
    return expenseEntries.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [expenseEntries]);

  const highestExpense = useMemo(() => {
    if (expenseEntries.length === 0) return null;

    return expenseEntries.reduce((highest, item) =>
      (item.amount || 0) > (highest.amount || 0) ? item : highest
    );
  }, [expenseEntries]);

  const categoryData = useMemo(() => {
    const grouped: Record<string, number> = {};

    expenseEntries.forEach((item) => {
      const key = item.category || "General";
      grouped[key] = (grouped[key] || 0) + (item.amount || 0);
    });

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [expenseEntries]);

  const detectedDraftAmount = detectAmount(draftText);
  const detectedDraftCategory = detectedDraftAmount ? guessCategory(draftText) : undefined;

  const addPdfHeader = (doc: jsPDF, titleText: string) => {
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(titleText, 14, 18);
    doc.setTextColor(20, 53, 47);
  };

  const addPageIfNeeded = (doc: jsPDF, y: number) => {
    if (y > 270) {
      doc.addPage();
      addPdfHeader(doc, "Daily Accountability Journal");
      return 40;
    }

    return y;
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 40;

    addPdfHeader(doc, "Daily Accountability Journal");

    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated: ${new Date().toLocaleString("en-PK")}`, 14, y);
    y += 7;
    doc.text(`Selected view: ${filter}`, 14, y);
    y += 11;

    doc.setFillColor(240, 253, 250);
    doc.roundedRect(14, y, 182, 34, 4, 4, "F");
    doc.setTextColor(20, 53, 47);
    doc.setFontSize(11);
    doc.text(`Total Detected Expenses: Rs. ${total.toLocaleString()}`, 20, y + 10);
    doc.text(`Total Entries: ${filteredEntries.length}`, 20, y + 20);
    doc.text(`Detected Expense Entries: ${expenseEntries.length}`, 105, y + 20);
    y += 46;

    doc.setFontSize(14);
    doc.setTextColor(15, 118, 110);
    doc.text("Daily Log", 14, y);
    y += 8;

    if (filteredEntries.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(20, 53, 47);
      doc.text("No entries found for this view.", 14, y);
      y += 8;
    }

    filteredEntries.forEach((item, index) => {
      y = addPageIfNeeded(doc, y);

      doc.setFontSize(10);
      doc.setTextColor(20, 53, 47);
      doc.text(`${index + 1}. ${new Date(item.createdAt).toLocaleString("en-PK")}`, 14, y);
      y += 6;

      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(item.text, 180);
      doc.text(lines, 18, y);
      y += lines.length * 5;

      if (item.amount) {
        doc.setTextColor(15, 118, 110);
        doc.text(
          `Detected: Rs. ${item.amount.toLocaleString()} | Category: ${item.category || "General"}`,
          18,
          y + 3
        );
        y += 9;
      } else {
        y += 5;
      }
    });

    y += 6;
    y = addPageIfNeeded(doc, y);

    doc.setFontSize(14);
    doc.setTextColor(15, 118, 110);
    doc.text("Detected Expense Summary", 14, y);
    y += 8;

    if (expenseEntries.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(20, 53, 47);
      doc.text("No detected expenses found for this view.", 14, y);
      y += 8;
    }

    expenseEntries.forEach((item, index) => {
      y = addPageIfNeeded(doc, y);

      const line = `${index + 1}. Rs. ${(item.amount || 0).toLocaleString()} | ${
        item.category || "General"
      } | ${item.text}`;

      const wrapped = doc.splitTextToSize(line, 180);
      doc.setFontSize(10);
      doc.setTextColor(20, 53, 47);
      doc.text(wrapped, 14, y);
      y += wrapped.length * 5 + 4;
    });

    doc.save("daily-accountability-journal.pdf");
  };

  return (
    <main className="app">
      {successMessage && <div className="toast">{successMessage}</div>}

      <section className="hero">
        <div>
          <p className="label">Private daily tracker</p>
          <h1>Daily Accountability Journal</h1>
          <p className="subtitle">
            Speak or write anything from your day. Expenses are detected when an amount is present.
          </p>
        </div>

        <div className="hero-date">
          <span>Today</span>
          <strong>{todayLabel}</strong>
        </div>
      </section>

      <section className="capture-card card">
        <div className="section-heading">
          <h2>Say it out loud</h2>
          <p>
            Speak an expense, feeling, event, food log, work update, or any note.
            Review the text and save it.
          </p>
        </div>

        <div className="capture-actions">
          <button
            className={isListening ? "voice-button listening" : "voice-button"}
            onClick={isListening ? stopVoiceCapture : startVoiceCapture}
          >
            {isListening ? "Stop Speaking" : "Start Speaking"}
          </button>

          <button type="button" onClick={saveEntry}>
            Save Entry
          </button>

          <button className="export-button" onClick={downloadPDF}>
            Export PDF
          </button>
        </div>

        {voiceMessage && <p className="voice-status">{voiceMessage}</p>}

        <textarea
          className="main-capture-box"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder="Speak or type here. Example: Foodpanda two burgers 800 rupees. Or: I had a difficult call today but stayed calm."
        />

        {draftText.trim() && (
          <div className="draft-preview">
            <span>Ready to save</span>
            {detectedDraftAmount ? (
              <p>
                Detected expense: <strong>Rs. {detectedDraftAmount.toLocaleString()}</strong>{" "}
                {detectedDraftCategory && <>• {detectedDraftCategory}</>}
              </p>
            ) : (
              <p>No amount detected. This will be saved as a normal daily log entry.</p>
            )}
          </div>
        )}

        <p className="privacy-note">No login. No backend. Your data stays in your browser.</p>
      </section>

      <section className="toolbar">
        <div className="filter-box">
          <label>View</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="today">Today</option>
            <option value="month">This Month</option>
            <option value="all">All Data</option>
          </select>
        </div>
      </section>

      <section className="summary-grid">
        <div className="summary-card primary">
          <span>Total detected expenses</span>
          <strong>Rs. {total.toLocaleString()}</strong>
        </div>

        <div className="summary-card">
          <span>Total entries</span>
          <strong>{filteredEntries.length}</strong>
        </div>

        <div className="summary-card">
          <span>Detected expenses</span>
          <strong>{expenseEntries.length}</strong>
        </div>

        <div className="summary-card">
          <span>Highest detected expense</span>
          <strong>
            {highestExpense ? `Rs. ${highestExpense.amount?.toLocaleString()}` : "—"}
          </strong>
          {highestExpense && <small>{highestExpense.text}</small>}
        </div>
      </section>

      {filteredEntries.length > 0 && (
        <section className="card timeline-card">
          <div className="section-heading">
            <h2>Daily log</h2>
            <p>Everything you saved for the selected view.</p>
          </div>

          <div className="timeline-list">
            {filteredEntries.map((item) => (
              <div className="timeline-item" key={item.id}>
                <span className={item.amount ? "dot expense-dot" : "dot note-dot"} />

                <div>
                  <strong>{new Date(item.createdAt).toLocaleString("en-PK")}</strong>
                  <p>{item.text}</p>
                  {item.amount && (
                    <p className="detected-line">
                      Detected: Rs. {item.amount.toLocaleString()} • {item.category}
                    </p>
                  )}
                </div>

                <button className="delete-button" onClick={() => deleteEntry(item.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {categoryData.length > 0 && (
        <section className="card chart-card">
          <div className="section-heading">
            <h2>Detected expense breakdown</h2>
            <p>Category-wise total from entries that include an amount.</p>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                outerRadius={92}
                innerRadius={46}
                label
              >
                {categoryData.map((_, index) => (
                  <Cell key={index} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `Rs. ${value}`} />
            </PieChart>
          </ResponsiveContainer>
        </section>
      )}
    </main>
  );
}

export default App;