"use client";

// NUSA CS — floating chat bubble untuk website toko online.
// Menghubungi server lokal Nusa CS (Node, 9Router) di PC pemilik toko.
// Karena internal & server di PC, alamat default = localhost:8790 (PC yang sama).
import { useEffect, useRef, useState } from "react";

const DEFAULT_SERVER = "http://localhost:8790"; // Nusa CS server lokal

type Msg = { role: "user" | "assistant"; content: string };

function detectVariant(): string {
  if (typeof window === "undefined") return "kelontong";
  const m = window.location.pathname.match(/\/toko\/([^/]+)/);
  if (m) return m[1];
  if (window.location.pathname.includes("/dashboard")) return "kelontong";
  return "kelontong";
}

const QUICK_QUESTIONS = [
  "Fitur apa saja yang ada?",
  "Berapa harganya?",
  "Bisa untuk usaha apa saja?",
  "Butuh printer khusus?",
];

export default function ChatNusa() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const variant = detectVariant();

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${DEFAULT_SERVER}/v1/nusa/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error("server " + res.status);
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply || "..." }]);
    } catch (e) {
      setError("Server CS sedang offline. Coba lagi nanti ya 🙏");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Tanya Nusa"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.8 1.5 5.3 3.9 6.9-.1.9-.5 2.3-1.4 3.2 0 0 2.5-.4 4.2-1.7.8.2 1.7.3 2.6.3 5.5 0 10-3.9 10-8.7S17.5 3 12 3z"/></svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[26rem] w-[21rem] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200">
          {/* Header */}
          <div className="flex items-center gap-3 bg-blue-600 px-4 py-3 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">🛎️</div>
            <div className="flex-1">
              <div className="text-sm font-bold leading-tight">Nusa</div>
              <div className="text-[11px] text-blue-100">CS NUSA Kasir — jawab seputar fitur & harga</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-3">
            {messages.length === 0 && !loading && (
              <div className="space-y-2">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[13px] text-gray-700 shadow-sm ring-1 ring-gray-100">
                  Halo kak 👋 Aku Nusa, CS dari NUSA Kasir. Mau tanya soal fitur atau harga? Silakan tanya-tanya dulu ya 😊
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full bg-white px-3 py-1 text-[11px] text-blue-600 shadow-sm ring-1 ring-blue-100 hover:bg-blue-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] shadow-sm ${
                    m.role === "user"
                      ? "rounded-br-sm bg-blue-600 text-white"
                      : "rounded-tl-sm bg-white text-gray-700 ring-1 ring-gray-100"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[13px] text-gray-400 shadow-sm ring-1 ring-gray-100">
                  Nusa sedang mengetik…
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-600 ring-1 ring-red-100">{error}</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 bg-white p-2">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Tulis pertanyaan…"
                className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-[13px] outline-none focus:border-blue-400"
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-40"
                aria-label="Kirim"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
