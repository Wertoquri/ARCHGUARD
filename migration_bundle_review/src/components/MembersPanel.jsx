import React, { useEffect, useState } from "react";
import { getProjectMembers, kickProjectMember, updateMemberPermissions } from "../api";
import { useI18n } from "../context/I18nContext.jsx";

export default function MembersPanel({ projectId }) {
  const token = localStorage.getItem('token');
  let user = null;
  try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch { user = null; }
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [tempPerms, setTempPerms] = useState({});
  const { t } = useI18n();










































































































































































}  );    </div>      )}        </div>          )}            })            );              </div>                </div>                  </label>                    <input type="checkbox" checked={!!(perms.can_comment)} onChange={() => onToggle(m.user_id, 'can_comment')} /> {t('permComment')}                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", whiteSpace: "nowrap" }}>                  </label>                    <input type="checkbox" checked={!!(perms.can_assign)} onChange={() => onToggle(m.user_id, 'can_assign')} /> {t('permAssign')}                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", whiteSpace: "nowrap" }}>                  </label>                    <input type="checkbox" checked={!!(perms.can_delete)} onChange={() => onToggle(m.user_id, 'can_delete')} /> {t('permDelete')}                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", whiteSpace: "nowrap" }}>                  </label>                    <input type="checkbox" checked={!!(perms.can_edit)} onChange={() => onToggle(m.user_id, 'can_edit')} /> {t('permEdit')}                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", whiteSpace: "nowrap" }}>                  </label>                    <input type="checkbox" checked={!!(perms.can_create)} onChange={() => onToggle(m.user_id, 'can_create')} /> {t('permCreate')}                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", whiteSpace: "nowrap" }}>                <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>                </div>                  </div>                    )}                        }}>{t('kick')} 🗑️</button>                          transition: "all 0.3s"                          cursor: "pointer",                          fontWeight: 600,                          fontSize: "13px",                          borderRadius: "6px",                          border: "none",                          padding: "8px 16px",                          background: "#dc2626",                          color: "#fff",                        <button onClick={() => onKick(m.user_id)} style={{                     ) : (                      </>                        }}>✕</button>                          transition: "all 0.3s"                          cursor: "pointer",                          fontSize: "13px",                          fontWeight: 600,                          borderRadius: "6px",                          border: "none",                           padding: "8px 16px",                           color: "#fff",                           background: "#ef4444",                         <button onClick={onCancel} style={{                         }}>✓</button>                          transition: "all 0.3s"                          cursor: "pointer",                          fontSize: "13px",                          fontWeight: 600,                          borderRadius: "6px",                           border: "none",                           padding: "8px 16px",                           color: "#fff",                           background: "#10b981",                         <button onClick={() => onSave(m.user_id)} style={{                       <>                    {isEditing ? (                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>                  </div>                    <div style={{ fontSize: "13px", color: "#64748b" }}>{t('roleLabel')}: {m.role || "member"}</div>                    <div style={{ fontWeight: 600, fontSize: "15px", color: "#1e293b", marginBottom: "4px" }}>{m.username || `${t('userHash')}${m.user_id}`}</div>                  <div>                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>              }}>                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"                transition: "all 0.3s",                background: isEditing ? "#fffbeb" : "#f8fafc",                border: "1px solid #e2e8f0",                borderRadius: "12px",                marginBottom: "30px",                padding: "24px",               <div key={m.user_id} style={{               return (              const perms = isEditing ? tempPerms : (m.permissions || {});              const isEditing = editingId === m.user_id;            members.map((m) => {          ) : (            <div style={{ color: "#64748b", padding: "20px", textAlign: "center", fontSize: "14px" }}>{t('noMembers')}</div>          {members.length === 0 ? (        <div style={{ marginTop: 12 }}>      ) : (        <div style={{ color: "#64748b", marginTop: 8, fontSize: "13px" }}>{t('loadingDots')}</div>      {loading ? (      {error && <div style={{ color: "#dc2626", marginTop: 8, fontSize: "13px" }}>{error}</div>}      </div>        </button>          🔄 {t('refresh')}        >          }}            boxShadow: loading ? "none" : "0 2px 4px rgba(102,126,234,0.3)"            cursor: loading ? "not-allowed" : "pointer",            fontWeight: 600,            fontSize: "13px",            borderRadius: "8px",            border: "none",            color: "#fff",            background: loading ? "#94a3b8" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",            padding: "8px 16px",          style={{          disabled={loading}          onClick={load}         <button         <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#1e293b" }}>{t('projectMembersTitle')}</h3>      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>    }}>      boxShadow: "0 4px 6px rgba(0,0,0,0.1)"      padding: "24px",      borderRadius: "16px",      border: "none",      background: "#fff",    <div style={{ 
n  return (  }    setTempPerms({});    setEditingId(null);
n  function onCancel() {  }    }      alert(e?.response?.data?.message || e.message || t('rightsChangeFailed'));    } catch (e) {      alert(t('rightsSaved'));      setTempPerms({});      setEditingId(null);      setMembers((prev) => prev.map((x) => x.user_id === memberId ? { ...x, permissions: tempPerms } : x));      await updateMemberPermissions(projectId, memberId, tempPerms, token);    try {
n  async function onSave(memberId) {  }    setTempPerms((prev) => ({ ...prev, [key]: !prev[key] }));    // Toggle in temp state    }      setTempPerms({ ...(m?.permissions || {}) });      setEditingId(memberId);      const m = members.find((x) => x.user_id === memberId);      // Start editing    if (!editingId || editingId !== memberId) {
n
n
n  async function onToggle(memberId, key) {  }    }      alert(e?.response?.data?.message || e.message || t('removeMemberFailed'));    } catch (e) {      setMembers((prev) => prev.filter((m) => m.user_id !== memberId));      await kickProjectMember(projectId, memberId, token);    try {    if (!confirm(t('confirmKickMember'))) return;
n  async function onKick(memberId) {
n  useEffect(() => { load(); }, [token, projectId]);  }    }      setLoading(false);    } finally {      setError(e?.response?.data?.message || e.message || t('loadTasksError'));    } catch (e) {      setMembers(rows || []);      const rows = await getProjectMembers(projectId, token);    try {    setError("");    setLoading(true);    if (!token || !projectId) return;n  async function load() {