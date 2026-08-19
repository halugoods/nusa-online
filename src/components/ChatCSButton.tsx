"use client";

// NUSA CS — tombol mengambang yang menautkan ke halaman CS di domain
// terpisah (nusa-cs). Halaman CS menembak tunnel nusa-cs.halugoods.com
// → server lokal Nusa CS (port 8790) di PC pemilik.
const CS_URL = "https://nusa-cs.vercel.app";

export default function ChatCSButton() {
  return (
    <a
      href={CS_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Tanya Nusa (CS)"
      title="Tanya Nusa — CS NUSA Kasir"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.8 1.5 5.3 3.9 6.9-.1.9-.5 2.3-1.4 3.2 0 0 2.5-.4 4.2-1.7.8.2 1.7.3 2.6.3 5.5 0 10-3.9 10-8.7S17.5 3 12 3z" />
      </svg>
    </a>
  );
}
