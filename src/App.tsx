import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import "./App.css";

type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  createdAt: string;
};

type Note = {
  id: string;
  text: string;
  createdAt: string;
};

type TimelineItem = {
  id: string;
  kind: "expense" | "note";
  title: string;
  subtitle: string;
  amount?: number;
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

type VoiceMode = "note" | "expense" | null;

const EXPENSE_KEY = "daj-expenses";
const NOTE_KEY = "daj-notes";

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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");

  const [noteText, setNoteText] = useState("");

  const [filter, setFilter] = useState("today");
  const [successMessage, setSuccessMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(null);
  const [capturedExpenseText, setCapturedExpenseText] = useState("");

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const shouldKeepListeningRef = useRef(false);

  useEffect(() => {
    setExpenses(JSON.parse(localStorage.getItem(EXPENSE_KEY) || "[]"));
    setNotes(JSON.parse(localStorage.getItem(NOTE_KEY) || "[]"));
  }, []);

  useEffect(() => {
    localStorage.setItem(EXPENSE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(NOTE_KEY, JSON.stringify(notes));
  }, [notes]);

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

  const parseVoiceExpense = (spokenText: string) => {
    const cleanText = spokenText.trim();
    const matches = cleanText.match(/\d+(?:,\d+)*(?:\.\d+)?/g);

    if (!matches || matches.length === 0) {
      setCapturedExpenseText(cleanText);
      setTitle(cleanText);
      setAmount("");
      setCategory(guessCategory(cleanText));
      setVoiceMessage("Amount not detected. Please enter amount manually.");
      return;
    }

    const detectedAmount = matches[matches.length - 1].replace(/,/g, "");
    const titleWithoutAmount = cleanText
      .replace(matches[matches.length - 1], "")
      .replace(/\b(rupees|rs|pkr|r s)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    setCapturedExpenseText(cleanText);
    setTitle(titleWithoutAmount || cleanText);
    setAmount(detectedAmount);
    setCategory(guessCategory(cleanText));
    setVoiceMessage("Expense captured. Review and tap Save Expense.");
  };

  const startVoiceCapture = (mode: "note" | "expense") => {
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

      if (mode === "note") {
        setNoteText((previous) =>
          previous.trim() ? `${previous.trim()} ${spokenText}` : spokenText
        );
      }

      if (mode === "expense") {
        parseVoiceExpense(spokenText);
      }
    };

    recognition.onerror = () => {
      setVoiceMessage("Voice input paused. Restarting if allowed...");
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
          setIsListening(true);
          setVoiceMode(mode);
          setVoiceMessage(
            mode === "expense"
              ? "Listening for expense. Example: Foodpanda burgers 800 rupees."
              : "Listening for note. Speak naturally."
          );
        } catch {
          setIsListening(false);
          setVoiceMode(null);
          setVoiceMessage("Voice input stopped. Tap voice button again.");
        }
      } else {
        setIsListening(false);
        setVoiceMode(null);
      }
    };

    recognitionRef.current = recognition;
    shouldKeepListeningRef.current = true;

    try {
      recognition.start();
      setIsListening(true);
      setVoiceMode(mode);
      setVoiceMessage(
        mode === "expense"
          ? "Listening for expense. Example: Foodpanda burgers 800 rupees."
          : "Listening for note. Speak naturally."
      );
    } catch {
      setVoiceMessage("Voice input could not start. Please try again.");
    }
  };

  const stopVoiceCapture = () => {
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setVoiceMode(null);
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

  const filteredExpenses = expenses.filter((item) => isInFilter(item.createdAt));
  const filteredNotes = notes.filter((item) => isInFilter(item.createdAt));

  const total = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredExpenses]);

  const highestExpense = useMemo(() => {
    if (filteredExpenses.length === 0) return null;
    return filteredExpenses.reduce((highest, item) =>
      item.amount > highest.amount ? item : highest
    );
  }, [filteredExpenses]);

  const categoryData = useMemo(() => {
    const grouped: Record<string, number> = {};

    filteredExpenses.forEach((item) => {
      grouped[item.category] = (grouped[item.category] || 0) + item.amount;
    });

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [
      ...filteredExpenses.map((item) => ({
        id: item.id,
        kind: "expense" as const,
        title: item.title,
        subtitle: `${item.category} • ${new Date(item.createdAt).toLocaleTimeString(
          "en-PK",
          { hour: "2-digit", minute: "2-digit" }
        )}`,
        amount: item.amount,
        createdAt: item.createdAt,
      })),
      ...filteredNotes.map((item) => ({
        id: item.id,
        kind: "note" as const,
        title: "Note",
        subtitle: new Date(item.createdAt).toLocaleTimeString("en-PK", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        createdAt: item.createdAt,
      })),
    ];

    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [filteredExpenses, filteredNotes]);

  const addExpense = (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = Number(amount);

    if (!title.trim() || !amount || numericAmount <= 0) return;

    setExpenses([
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        amount: numericAmount,
        category,
        createdAt: new Date().toISOString(),
      },
      ...expenses,
    ]);

    setTitle("");
    setAmount("");
    setCategory("General");
    setCapturedExpenseText("");
    showSuccess("Expense saved");
  };

  const addNote = (e: React.FormEvent) => {
    e.preventDefault();

    if (!noteText.trim()) return;

    setNotes([
      {
        id: crypto.randomUUID(),
        text: noteText.trim(),
        createdAt: new Date().toISOString(),
      },
      ...notes,
    ]);

    setNoteText("");
    setVoiceMessage("");
    showSuccess("Note saved");
  };

  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter((item) => item.id !== id));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter((item) => item.id !== id));
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

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
    doc.roundedRect(14, y, 182, 30, 4, 4, "F");
    doc.setTextColor(20, 53, 47);
    doc.setFontSize(11);
    doc.text(`Total Expenses: Rs. ${total.toLocaleString()}`, 20, y + 10);
    doc.text(`Expense Entries: ${filteredExpenses.length}`, 20, y + 20);
    doc.text(`Notes: ${filteredNotes.length}`, 105, y + 20);
    y += 42;

    doc.setFontSize(14);
    doc.setTextColor(15, 118, 110);
    doc.text("Expenses", 14, y);
    y += 8;

    doc.setTextColor(20, 53, 47);
    doc.setFontSize(10);

    if (filteredExpenses.length === 0) {
      doc.text("No expenses found for this view.", 14, y);
      y += 8;
    }

    filteredExpenses.forEach((item, index) => {
      y = addPageIfNeeded(doc, y);

      doc.setFontSize(10);
      doc.setTextColor(20, 53, 47);

      const titleLine = `${index + 1}. ${item.title}`;
      const metaLine = `Amount: Rs. ${item.amount.toLocaleString()} | Category: ${
        item.category
      } | Time: ${new Date(item.createdAt).toLocaleString("en-PK")}`;

      const titleWrapped = doc.splitTextToSize(titleLine, 180);
      doc.text(titleWrapped, 14, y);
      y += titleWrapped.length * 5;

      doc.setTextColor(100, 116, 139);
      const metaWrapped = doc.splitTextToSize(metaLine, 180);
      doc.text(metaWrapped, 18, y);
      y += metaWrapped.length * 5 + 4;
    });

    y += 6;
    y = addPageIfNeeded(doc, y);

    doc.setFontSize(14);
    doc.setTextColor(15, 118, 110);
    doc.text("Notes", 14, y);
    y += 8;

    doc.setFontSize(10);

    if (filteredNotes.length === 0) {
      doc.setTextColor(20, 53, 47);
      doc.text("No notes found for this view.", 14, y);
      y += 8;
    }

    filteredNotes.forEach((item, index) => {
      y = addPageIfNeeded(doc, y);

      doc.setTextColor(20, 53, 47);
      doc.text(`${index + 1}. ${new Date(item.createdAt).toLocaleString("en-PK")}`, 14, y);
      y += 6;

      doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(item.text, 180);
      doc.text(lines, 18, y);
      y += lines.length * 5 + 6;
    });

    y += 6;
    y = addPageIfNeeded(doc, y);

    doc.setFontSize(14);
    doc.setTextColor(15, 118, 110);
    doc.text("Timeline", 14, y);
    y += 8;

    if (timeline.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(20, 53, 47);
      doc.text("No timeline items found for this view.", 14, y);
      y += 8;
    }

    timeline.forEach((item) => {
      y = addPageIfNeeded(doc, y);

      doc.setFontSize(10);
      doc.setTextColor(20, 53, 47);

      const line =
        item.kind === "expense"
          ? `Expense: ${item.title} | Rs. ${item.amount?.toLocaleString()} | ${item.subtitle}`
          : `Note: ${item.subtitle}`;

      const wrapped = doc.splitTextToSize(line, 180);
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
            Speak expenses, speak notes, review quickly, save, and export your day as a clean PDF.
          </p>
        </div>

        <div className="hero-date">
          <span>Today</span>
          <strong>{todayLabel}</strong>
        </div>
      </section>

      <section className="quick-actions card">
        <div className="section-heading">
          <h2>Quick capture</h2>
          <p>Fast mobile-first capture. Speak, review, and save.</p>
        </div>

        <div className="quick-grid">
          <button
            className={isListening && voiceMode === "expense" ? "voice-button listening" : "voice-button"}
            onClick={() =>
              isListening && voiceMode === "expense"
                ? stopVoiceCapture()
                : startVoiceCapture("expense")
            }
          >
            {isListening && voiceMode === "expense" ? "Stop Expense Voice" : "Speak Expense"}
          </button>

          <button
            className={isListening && voiceMode === "note" ? "voice-button listening" : "voice-button"}
            onClick={() =>
              isListening && voiceMode === "note" ? stopVoiceCapture() : startVoiceCapture("note")
            }
          >
            {isListening && voiceMode === "note" ? "Stop Note Voice" : "Speak Note"}
          </button>

          <button onClick={() => scrollToSection("expense-section")}>Manual Expense</button>

          <button className="export-button" onClick={downloadPDF}>
            Export PDF
          </button>
        </div>

        {voiceMessage && <p className="voice-status">{voiceMessage}</p>}

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
          <span>Total expenses</span>
          <strong>Rs. {total.toLocaleString()}</strong>
        </div>

        <div className="summary-card">
          <span>Expense entries</span>
          <strong>{filteredExpenses.length}</strong>
        </div>

        <div className="summary-card">
          <span>Notes</span>
          <strong>{filteredNotes.length}</strong>
        </div>

        <div className="summary-card">
          <span>Highest expense</span>
          <strong>{highestExpense ? `Rs. ${highestExpense.amount.toLocaleString()}` : "—"}</strong>
          {highestExpense && <small>{highestExpense.title}</small>}
        </div>
      </section>

      {timeline.length > 0 && (
        <section className="card timeline-card">
          <div className="section-heading">
            <h2>Latest timeline</h2>
            <p>Recent expenses and notes from the selected view.</p>
          </div>

          <div className="timeline-list">
            {timeline.map((item) => (
              <div className="timeline-item" key={`${item.kind}-${item.id}`}>
                <span className={item.kind === "expense" ? "dot expense-dot" : "dot note-dot"} />

                <div>
                  <strong>{item.title}</strong>
                  <p>{item.subtitle}</p>
                </div>

                {item.amount && <b>Rs. {item.amount.toLocaleString()}</b>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="expense-section" className="card">
        <div className="section-heading">
          <h2>Expense</h2>
          <p>Voice fills this form automatically. Review, edit if needed, then save.</p>
        </div>

        {capturedExpenseText && (
          <div className="captured-box">
            <span>Voice captured</span>
            <p>{capturedExpenseText}</p>
          </div>
        )}

        <form onSubmit={addExpense} className="expense-form">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Expense title"
          />

          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min="0"
            placeholder="Amount"
          />

          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <button type="submit">Save Expense</button>
        </form>

        <div className="category-chips">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? "chip active" : "chip"}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section id="note-section" className="card">
        <div className="section-heading">
          <h2>Note</h2>
          <p>Speak naturally or type. ChatGPT can analyze mood and patterns later from the PDF.</p>
        </div>

        <form onSubmit={addNote} className="simple-note-form">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Speak or write anything about your day..."
          />

          <button type="submit">Save Note</button>
        </form>
      </section>

      {categoryData.length > 0 && (
        <section className="card chart-card">
          <div className="section-heading">
            <h2>Expense breakdown</h2>
            <p>Category-wise total for selected view.</p>
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

      <section className="card">
        <div className="section-heading">
          <h2>Expenses</h2>
          <p>Saved expenses for selected view.</p>
        </div>

        {filteredExpenses.length === 0 ? (
          <p className="empty">No expenses found.</p>
        ) : (
          <div className="list">
            {filteredExpenses.map((item) => (
              <article className="list-item" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p>
                    {item.category} • {new Date(item.createdAt).toLocaleString("en-PK")}
                  </p>
                </div>

                <div className="item-side">
                  <strong>Rs. {item.amount.toLocaleString()}</strong>
                  <button className="delete-button" onClick={() => deleteExpense(item.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Notes</h2>
          <p>Saved notes for selected view.</p>
        </div>

        {filteredNotes.length === 0 ? (
          <p className="empty">No notes found.</p>
        ) : (
          <div className="list">
            {filteredNotes.map((item) => (
              <article className="list-item note-item" key={item.id}>
                <div>
                  <strong>{new Date(item.createdAt).toLocaleString("en-PK")}</strong>
                  <p className="note-text">{item.text}</p>
                </div>

                <button className="delete-button" onClick={() => deleteNote(item.id)}>
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;