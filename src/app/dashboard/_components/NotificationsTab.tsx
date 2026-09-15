"use client";

import { useState } from "react";

interface Notification {
  id: string;
  type: "backup_failed" | "sync_error" | "license_expiring" | "update_available";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  uid?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "1", type: "backup_failed", title: "Backup Gagal", message: "User keuanganku96 backup gagal 2 jam lalu", createdAt: new Date(Date.now() - 7200000).toISOString(), read: false },
  { id: "2", type: "license_expiring", title: "Lisensi Expiring", message: "3 lisensi akan expired dalam 7 hari", createdAt: new Date(Date.now() - 86400000).toISOString(), read: false },
  { id: "3", type: "update_available", title: "Update APK", message: "v2.2.57+131 tersedia untuk download", createdAt: new Date(Date.now() - 172800000).toISOString(), read: true },
];

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = filter === "unread" ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "backup_failed": return "🔴";
      case "sync_error": return "🟡";
      case "license_expiring": return "🟠";
      case "update_available": return "🔵";
      default: return "⚪";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter(filter === "all" ? "unread" : "all")}
            className="px-3 py-1.5 text-xs bg-gray-100 rounded hover:bg-gray-200"
          >
            {filter === "all" ? `Show Unread (${unreadCount})` : "Show All"}
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
              Mark All Read
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No notifications</p>
        ) : (
          filtered.map(n => (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                n.read ? "bg-white hover:bg-gray-50" : "bg-blue-50 hover:bg-blue-100 border-blue-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg">{getTypeIcon(n.type)}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
