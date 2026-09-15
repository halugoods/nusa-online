"use client";

import { useState } from "react";

const FAQ = [
  { q: "Lisensi expired, tidak bisa login", a: "Perpanjang lisensi di tab Lisensi, atau hubungi admin." },
  { q: "Data tidak muncul setelah restore", a: "Gunakan 'Re-sync Images' di tab Diagnostic, lalu restart app." },
  { q: "Transaksi tidak sync ke device lain", a: "Pastikan kedua device online. Gunakan 'Force Sync' di tab Diagnostic." },
  { q: "Printer tidak connect", a: "Re-pair Bluetooth di Pengaturan → Printer. Restart app jika masih gagal." },
  { q: "Order online tidak masuk", a: "Cek koneksi WS di tab Diagnostic. Pastikan toko online aktif." },
  { q: "Gambar produk hilang", a: "Gunakan 'Re-sync Images' di tab Diagnostic." },
];

const WA_TEMPLATES = [
  { label: "Lisensi Expired", text: "Halo {nama}, lisensi NUSA kamu sudah expired. Silakan perpanjang di {link} atau hubungi admin." },
  { label: "Backup Gagal", text: "Halo {nama}, backup gagal terdeteksi. Coba: 1) Cek koneksi 2) Restart app 3) Force backup dari dashboard." },
  { label: "Sync Error", text: "Halo {nama}, data tidak sync. Pastikan device online dan gunakan Force Sync di dashboard." },
  { label: "Gambar Hilang", text: "Halo {nama}, gambar produk hilang. Gunakan 'Re-sync Images' di tab Diagnostic dashboard." },
];

export default function SupportCenterTab() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [copied, setCopied] = useState(false);

  const generateWA = () => {
    if (selectedTemplate === null) return;
    let text = WA_TEMPLATES[selectedTemplate].text;
    text = text.replace("{nama}", customerName || "[nama]");
    text = text.replace("{link}", "https://nusa-online.vercel.app");
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const copyTemplate = () => {
    if (selectedTemplate === null) return;
    let text = WA_TEMPLATES[selectedTemplate].text;
    text = text.replace("{nama}", customerName || "[nama]");
    text = text.replace("{link}", "https://nusa-online.vercel.app");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">Support Center</h2>

      {/* FAQ */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-bold text-sm mb-3">FAQ & Troubleshooting</h3>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="border-b last:border-0 pb-2">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full text-left text-sm font-medium py-1 flex justify-between"
              >
                {item.q}
                <span>{expandedFaq === i ? "−" : "+"}</span>
              </button>
              {expandedFaq === i && (
                <p className="text-xs text-gray-600 mt-1 pl-2">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* WA Template Generator */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-bold text-sm mb-3">WA Template Generator</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Customer Name</label>
            <input
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Nama customer"
              className="w-full px-3 py-2 border rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">WA Number</label>
            <input
              value={waNumber}
              onChange={e => setWaNumber(e.target.value)}
              placeholder="628123456789"
              className="w-full px-3 py-2 border rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Issue Template</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {WA_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedTemplate(i)}
                  className={`px-3 py-2 text-xs rounded border text-left ${
                    selectedTemplate === i ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {selectedTemplate !== null && (
            <div className="p-3 bg-gray-50 rounded text-xs whitespace-pre-wrap">
              {WA_TEMPLATES[selectedTemplate].text
                .replace("{nama}", customerName || "[nama]")
                .replace("{link}", "https://nusa-online.vercel.app")}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={generateWA} disabled={!waNumber} className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50">
              Open WA
            </button>
            <button onClick={copyTemplate} disabled={selectedTemplate === null} className="px-4 py-2 bg-gray-200 text-sm rounded hover:bg-gray-300 disabled:opacity-50">
              {copied ? "Copied!" : "Copy Text"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
