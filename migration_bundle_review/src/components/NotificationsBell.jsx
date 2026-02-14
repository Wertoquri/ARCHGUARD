import React, { useEffect, useState, useRef } from "react";
import { useAuthApi } from "../context/authApi";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "../api";
import { useI18n } from "../context/I18nContext.jsx";
import NotificationCard from "./NotificationCard.jsx";
import ProjectInviteCard from "./ProjectInviteCard.jsx";

export default function NotificationsBell({ isOpen, onToggle }) {
  const auth = useAuthApi();
  const token = auth.token ?? (typeof auth.getToken === 'function' ? auth.getToken() : undefined);
  const socket = auth.socket ?? (typeof auth.getSocket === 'function' ? auth.getSocket() : undefined);
  const [notifications, setNotifications] = useState([]);
  const { t } = useI18n();
  const rootRef = useRef(null);












































































































































































































}  );    </div>      )}        </div>          )}            })              );                </div>                  </div>                    </button>                      🗑️                    >                      style={{ fontSize: 14, padding: '4px 8px', background: '#fee2e2', border: 'none', borderRadius: 6, cursor: 'pointer' }}                      title={t('delete')}                      onClick={() => onDelete(notif.id)}                    <button                    )}                      </button>                        ✓                      >                        style={{ fontSize: 14, padding: '4px 8px', background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}                        title={t('markAsRead') || 'Позначити прочитаним'}                        onClick={() => onMarkAsRead(notif.id)}                      <button                    {!notif.is_read && (                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>                  )}                    />                      createdAt={notif.created_at}                      body={typeof parsedPayload === 'string' ? parsedPayload : JSON.stringify(parsedPayload)}                      title={notif.type}                    <NotificationCard                  ) : (                    <ProjectInviteCard data={parsedPayload} createdAt={notif.created_at} />                  {isProjectInvite ? (                <div key={notif.id} style={{ marginBottom: 8 }}>
n              return (
n              const isProjectInvite = notif.type === 'project_invite' && parsedPayload && typeof parsedPayload === 'object';              }                }                  // leave as string if not valid JSON                } catch {                  parsedPayload = JSON.parse(parsedPayload);                try {              if (typeof parsedPayload === 'string') {              let parsedPayload = notif.payload;              // Parse payload if it's a JSON string            notifications.map((notif) => {          ) : (            </div>              {t('noNotifications')}            <div style={{ color: "#64748b", textAlign: "center", padding: "16px" }}>          {notifications.length === 0 ? (          </div>            )}              </button>                {t('markAllRead')}              >                }}                  cursor: "pointer",                  borderRadius: "6px",                  border: "none",                  background: "#e2e8f0",                  padding: "4px 8px",                  fontSize: "12px",                style={{                onClick={onMarkAllAsRead}              <button            {unreadCount > 0 && (            <div style={{ fontWeight: 700, fontSize: "16px" }}>{t('notificationsTitle')}</div>          >            }}              marginBottom: "12px",              justifyContent: "space-between",              alignItems: "center",              display: "flex",            style={{          <div        >          }}            zIndex: 1000,            boxShadow: "0 8px 24px rgba(0,0,0,.12)",            overflowY: "auto",            maxHeight: "500px",            maxWidth: "400px",            minWidth: "320px",            padding: "12px",            borderRadius: "8px",            border: "1px solid #e2e8f0",            background: "#fff",            top: "120%",            right: 0,            position: "absolute",          style={{        <div      {isOpen && (      </button>        )}          </span>            {unreadCount}          }}>            textAlign: "center"            minWidth: "20px",            fontWeight: 700,            fontSize: "12px",            padding: "2px 6px",            borderRadius: "50%",             color: "#fff",             background: "#ef4444",           <span style={{         {unreadCount > 0 && (        🔔       >        }}          e.currentTarget.style.boxShadow = "0 2px 8px rgba(102,126,234,0.3)";          e.currentTarget.style.transform = "translateY(0)";        onMouseLeave={(e) => {        }}          e.currentTarget.style.boxShadow = "0 4px 12px rgba(102,126,234,0.4)";          e.currentTarget.style.transform = "translateY(-2px)";        onMouseEnter={(e) => {        }}          gap: "6px"          alignItems: "center",          display: "flex",          transition: "all 0.3s",          boxShadow: "0 2px 8px rgba(102,126,234,0.3)",          fontSize: "16px",          fontWeight: 600,          cursor: "pointer",          borderRadius: "10px",          border: "none",          color: "#fff",          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",          padding: "10px 16px",          position: "relative",        style={{        onClick={onToggle}        title={t('notificationsTitle')}      <button    <div style={{ position: "relative" }} ref={rootRef}>
n  return (
n  const unreadCount = notifications.filter((n) => !n.is_read).length;  }    }      console.error("Failed to delete notification:", err);    } catch (err) {      setNotifications((prev) => prev.filter((n) => n.id !== id));      await deleteNotification(id, token);    try {
n  async function onDelete(id) {  }    }      console.error("Failed to mark all as read:", err);    } catch (err) {      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));      await markAllNotificationsAsRead(token);    try {
n  async function onMarkAllAsRead() {  }    }      console.error("Failed to mark as read:", err);    } catch (err) {      );        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))      setNotifications((prev) =>      await markNotificationAsRead(id, token);    try {
n  async function onMarkAsRead(id) {  }, [socket]);    return () => socket.off("notification:new", handler);    socket.on("notification:new", handler);    };      setNotifications((prev) => [payload, ...prev]);      // New notification received via socket    const handler = (payload) => {    if (!socket) return;
n  useEffect(() => {  }, [isOpen, onToggle]);    return () => document.removeEventListener('click', onDocClick);    document.addEventListener('click', onDocClick);    }      }        onToggle();      if (!rootRef.current.contains(e.target)) {      if (!rootRef.current) return;      if (!isOpen) return;    function onDocClick(e) {  useEffect(() => {
n  // close when clicking outside  }, [token]);    load();
n  useEffect(() => {  }    }      console.error("Failed to load notifications:", err);    } catch (err) {      setNotifications(rows || []);      const rows = await getNotifications(token);    try {    if (!token) return;n  async function load() {