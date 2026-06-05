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
  type: string;
  text: string;
  mood: string;
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

const EXPENSE_KEY = "daj-expenses";
const NOTE_KEY = "daj-notes";

const categories = ["General", "Food", "Travel", "Health", "Family", "Work", "Self-care", "Other"];

const noteTypes = [
  "General Note",
  "Call / Interaction",
  "Trigger / Relapse Log",
  "Food Log",
  "Workout / Health",
  "Prayer / Reflection",
  "Work Progress",
];

const moods = ["Calm", "Productive", "Stressed", "Angry", "Sad", "Tired", "Grateful"];

const chartColors = ["#0f766e", "#16a34a", "#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b", "#14b8a6"];

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("General Note");
  const [mood, setMood] = useState("Calm");
  const [filter, setFilter] = useState("today");
  const [successMessage, setSuccessMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");

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

  const isSpeechSupported = () => {
    return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
  };

  const startVoiceNote = () => {
    if (!isSpeechSupported()) {
      setVoiceMessage("Voice input is not supported in this browser.");
      return;
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

      if (spokenText) {
        setNoteText((previous) =>
          previous.trim() ? `${previous.trim()} ${spokenText}` : spokenText
        );
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
          setVoiceMessage("Listening... speak your note.");
        } catch {
          setIsListening(false);
          setVoiceMessage("Voice input stopped. Tap Start Voice again.");
        }
      } else {
        setIsListening(false);
        setVoiceMessage("");
      }
    };

    recognitionRef.current = recognition;
    shouldKeepListeningRef.current = true;

    try {
      recognition.start();
      setIsListening(true);
      setVoiceMessage("Listening... speak your note.");
    } catch {
      setVoiceMessage("Voice input could not start. Please try again.");
    }
  };

  const stopVoiceNote = () => {
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setVoiceMessage("");
  };

  const isInFilter = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    if (filter === "all") return true;
    if (filter === "today") return date.toDateString() === now.toDateString();

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

  const showSuccess = (message: string) => {
  setSuccessMessage(message);

  setTimeout(() => {
    setSuccessMessage("");
  }, 2200);
};

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
    showSuccess("Expense added successfully");
  };

  const addNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setNotes([
      {
        id: crypto.randomUUID(),
        type: noteType,
        text: noteText.trim(),
        mood,
        createdAt: new Date().toISOString(),
      },
      ...notes,
    ]);

    setNoteText("");
    setNoteType("General Note");
    setMood("Calm");
    setVoiceMessage("");
    showSuccess("Note added successfully");
  };

  const deleteExpense = (id: string) => {
    setExpenses(expenses.filter((item) => item.id !== id));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter((item) => item.id !== id));
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 16;

    doc.setFontSize(18);
    doc.text("Daily Accountability Journal", 14, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString("en-PK")}`, 14, y);
    y += 7;
    doc.text(`Selected view: ${filter}`, 14, y);
    y += 7;
    doc.text(`Total expenses: Rs. ${total.toLocaleString()}`, 14, y);
    y += 7;
    doc.text(`Expense entries: ${filteredExpenses.length}`, 14, y);
    y += 7;
    doc.text(`Notes: ${filteredNotes.length}`, 14, y);
    y += 11;

    doc.setFontSize(14);
    doc.text("Expenses", 14, y);
    y += 8;

    if (filteredExpenses.length === 0) {
      doc.setFontSize(10);
      doc.text("No expenses found for selected view.", 14, y);
      y += 8;
    }

    filteredExpenses.forEach((item) => {
      if (y > 275) {
        doc.addPage();
        y = 16;
      }

      doc.setFontSize(10);
      const line = `${item.title} | Rs. ${item.amount.toLocaleString()} | ${
        item.category
      } | ${new Date(item.createdAt).toLocaleString("en-PK")}`;

      const wrapped = doc.splitTextToSize(line, 180);
      doc.text(wrapped, 14, y);
      y += wrapped.length * 6 + 3;
    });

    y += 8;

    if (y > 265) {
      doc.addPage();
      y = 16;
    }

    doc.setFontSize(14);
    doc.text("Notes / Mood / Events", 14, y);
    y += 8;

    if (filteredNotes.length === 0) {
      doc.setFontSize(10);
      doc.text("No notes found for selected view.", 14, y);
      y += 8;
    }

    filteredNotes.forEach((item) => {
      if (y > 265) {
        doc.addPage();
        y = 16;
      }

      doc.setFontSize(10);
      doc.text(
        `${item.type} | Mood: ${item.mood} | ${new Date(item.createdAt).toLocaleString("en-PK")}`,
        14,
        y
      );
      y += 6;

      const lines = doc.splitTextToSize(item.text, 180);
      doc.text(lines, 14, y);
      y += lines.length * 6 + 5;
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
            Track expenses, notes, mood, habits and reflections. Your data stays in your browser.
          </p>
        </div>

        <div className="hero-date">
          <span>Today</span>
          <strong>{todayLabel}</strong>
        </div>
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

        <button className="export-button" onClick={downloadPDF}>
          Export PDF
        </button>
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

      <section className="card">
        <div className="section-heading">
          <h2>Add expense</h2>
          <p>Enter exactly what you spent. The app only calculates totals.</p>
        </div>

        <form onSubmit={addExpense} className="expense-form">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Example: Tea, travel, lunch, medicine"
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

          <button type="submit">Add Expense</button>
        </form>
      </section>

      <section className="card">
        <div className="section-heading">
          <h2>Add note</h2>
          <p>Type your note or use voice input. Voice is converted to text only.</p>
        </div>

        <form onSubmit={addNote} className="note-form">
          <select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
            {noteTypes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <select value={mood} onChange={(e) => setMood(e.target.value)}>
            {moods.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <div className="voice-row">
            <button
              type="button"
              className={isListening ? "voice-button listening" : "voice-button"}
              onClick={isListening ? stopVoiceNote : startVoiceNote}
            >
              {isListening ? "Stop Voice" : "Start Voice"}
            </button>

            <span>{voiceMessage || "Voice input works best in Chrome."}</span>
          </div>

          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write or speak a note about your day, mood, trigger, food, workout, call, or reflection."
          />

          <button type="submit">Add Note</button>
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
              <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={92} innerRadius={46} label>
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
          <p>Saved notes, moods and events for selected view.</p>
        </div>

        {filteredNotes.length === 0 ? (
          <p className="empty">No notes found.</p>
        ) : (
          <div className="list">
            {filteredNotes.map((item) => (
              <article className="list-item note-item" key={item.id}>
                <div>
                  <strong>{item.type}</strong>
                  <p>
                    Mood: {item.mood} • {new Date(item.createdAt).toLocaleString("en-PK")}
                  </p>
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