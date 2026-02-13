import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthApi } from "../context/authApi";
import { loginUser } from "../api";
import VerifyEmail from "./VerifyEmail";
import styles from "./Login.module.css";
import { useI18n } from "../context/I18nContext.jsx";

const Login = () => {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [userId, setUserId] = useState(null);
  const auth = useAuthApi();
  const login = auth.login?.bind(auth) ?? auth.login;
  const navigate = useNavigate();


































































































export default Login;};  );    </div>      </div>        </div>          </button>            {t('goRegister')}          <button onClick={() => navigate("/register")} className={styles.link}>          <span className={styles.footerText}>{t('noAccount')} </span>        <div className={styles.footer}>        </form>          </button>            {loading ? t('loginBtn') + '...' : t('loginBtn')}          >            }}              cursor: loading ? 'not-allowed' : 'pointer'              opacity: loading ? 0.6 : 1,            style={{            className={styles.submitButton}            disabled={loading}            type="submit" 
n          <button           )}            </div>              ❌ {error}            }}>              marginBottom: '16px'              fontSize: '14px',              borderRadius: '8px',              color: '#dc2626',              background: '#fee2e2',              padding: '12px',            <div style={{
n          {error && (          </div>            />              className={styles.input}              required              onChange={(e) => setPassword(e.target.value)}              value={password}              placeholder="••••••••"              type="password"            <input            <label className={styles.label}>{t('password')}</label>          <div className={styles.inputGroup}>          </div>            />              className={styles.input}              required              onChange={(e) => setEmail(e.target.value)}              value={email}              placeholder="example@mail.com"              type="email"            <input            <label className={styles.label}>{t('email')}</label>          <div className={styles.inputGroup}>        <form onSubmit={handleSubmit} className={styles.form}>        </div>          <p className={styles.subtitle}>{t('loginSubtitle')}</p>          <h2 className={styles.title}>{t('loginTitle')}</h2>        <div className={styles.header}>      <div className={styles.card}>    <div className={styles.container}>
n  return (  }    return <VerifyEmail userId={userId} email={email} onVerified={handleVerified} />;  if (needsVerification) {  };    window.location.reload();    navigate('/dashboard');    login(data.token, data.user);  const handleVerified = (data) => {  };    }      setLoading(false);    } finally {      }        setError(response?.message || t('loginInvalid'));      } else {        setNeedsVerification(true);        setUserId(response.userId);      if (response?.needsVerification) {      const response = err.response?.data;    } catch (err) {      navigate("/dashboard");      login(data.token, data.user);      const data = await loginUser(email, password);    try {    setLoading(true);    setError('');    e.preventDefault();n  const handleSubmit = async (e) => {