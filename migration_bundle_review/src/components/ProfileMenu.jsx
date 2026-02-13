import React, { useState, useRef, useEffect } from "react";
import { useAuthApi } from "../context/authApi";
import { uploadAvatar, API_URL as API_BASE_URL } from "../api";
import styles from "./ProfileMenu.module.css";
import { useI18n } from "../context/I18nContext.jsx";

export default function ProfileMenu({ isOpen, onToggle }) {
  const auth = useAuthApi();
  const user = typeof auth.getUser === 'function' ? auth.getUser() : auth.user;
  const logout = auth.logout ?? (() => {});
  const refreshUser = auth.refreshUser ?? (typeof auth.refreshUser === 'function' ? auth.refreshUser : undefined);
  const token = auth.token ?? (typeof auth.getToken === 'function' ? auth.getToken() : undefined);
  const ref = useRef(null);
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);






















































































}  );    </div>      )}        </div>          </div>            </button>              {t('logout')}            <button onClick={logout} className={styles.logoutButton}>          <div className={styles.actions}>          )}            </div>              </div>                                </div>                  </label>                    </button>                      {uploading ? (t('uploadingAvatar') || 'Uploading...') : (t('uploadAvatar') || 'Upload avatar')}                    }}>                      if (input) input.click();                      const input = ev.currentTarget.parentElement.querySelector('input[type=file]');                    <button type="button" className={styles.uploadBtn} onClick={(ev) => {                    }} ref={(el) => { /* keep ref-less, forwarded by button click */ }} />                      } finally { setUploading(false); }                        console.error('Avatar upload failed', err);                      } catch (err) {                        if (typeof refreshUser === 'function') await refreshUser();                        await uploadAvatar(f, token || localStorage.getItem('token'));                        setUploading(true);                      try {                      if (!f) return;                      const f = e.target.files && e.target.files[0];                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>                <div style={{ marginTop: 4 }}>              <div className={styles.userInfo}>              </div>                </div>                  <div style={{ color: '#64748b', fontSize: 13 }}>{user.email || '—'}</div>                  <div className={styles.username}>{user.username || '—'}</div>                <div>                )}                  </div>                    👤                  <div style={{ width: 56, height: 56, borderRadius: 9999, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>                ) : (                  })()                    return <img src={src} alt={user.username || 'avatar'} className={styles.avatar} />;                    const src = raw && raw.startsWith('/') ? API_BASE_URL.replace(/\/api$/, '') + raw : raw;                    const raw = user.avatar || user.avatar_url;                  (() => {                {(user.avatar || user.avatar_url) ? (              <div className={styles.userHeader}>            <div>          ) : (            <div className={styles.loading}>{t('loading')}</div>          {!user ? (          <div className={styles.dropdownTitle}>{t('profile')}</div>        <div className={styles.dropdown}>      {isOpen && (      </button>        )}          <span role="img" aria-label="user" className={styles.icon}>👤</span>        ) : (          })()            return <img src={src} alt={user.username || 'avatar'} className={styles.avatarSmall} />;            const src = raw && raw.startsWith('/') ? API_BASE_URL.replace(/\/api$/, '') + raw : raw;            const raw = user.avatar || user.avatar_url;          (() => {        {user && (user.avatar || user.avatar_url) ? (      >        className={styles.button}        onClick={onToggle}        aria-label={t('profile')}      <button    <div ref={ref} className={styles.container}>
n  return (  }, [isOpen, onToggle]);    return () => document.removeEventListener("click", onDocClick);    document.addEventListener("click", onDocClick);    }      if (ref.current && !ref.current.contains(e.target)) onToggle();    function onDocClick(e) {    if (!isOpen) return;n  useEffect(() => {