import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ToastContainer from "../components/ToastContainer";
import { useToast } from "../hooks/useToast";

export default function Login() {
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "soldier";
  const isCommander = role === "commander";

  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { toasts, showToast } = useToast();

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const data = await login(email, password);
      if (isCommander && !["commander", "admin"].includes(data.user.user_type)) {
        showToast("גישה למפקדים בלבד", "alert");
        return;
      }
      navigate(isCommander ? "/commander" : "/soldier");
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    try {
      const userData = {
        name,
        email,
        password,
        phone,
        user_type: isCommander ? "commander" : "soldier",
      };
      await register(userData);
      navigate(isCommander ? "/commander" : "/soldier");
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} />

      {view === "login" ? (
        <div className="login-container">
          <div className="login-box">
            <h1>🛡️ נכס״ל</h1>
            <p style={{ textAlign: "center", marginBottom: 24, color: "var(--text-muted)", fontSize: 14 }}>
              {isCommander ? "כניסת מפקד" : "אזור אישי — חייל"}
            </p>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>אימייל</label>
                <input
                  type="email"
                  placeholder={isCommander ? "commander@idf.il" : "soldier@idf.il"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>סיסמה</label>
                <input
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                כניסה
              </button>
            </form>
            <p style={{ textAlign: "center", marginTop: 18, fontSize: 13 }}>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setView("register"); }}
                style={{ color: "var(--accent)", textDecoration: "none" }}
              >
                יצירת משתמש חדש
              </a>
            </p>
          </div>
        </div>
      ) : (
        <div className="login-container">
          <div className="login-box">
            <h1>{isCommander ? "הרשמת מפקד" : "הרשמת חייל"}</h1>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>שם מלא</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>אימייל</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>סיסמה</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label>טלפון</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              {!isCommander && (
                <div className="form-group">
                  <label>עיר מגורים</label>
                  <input type="text" placeholder="תל אביב" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
              )}
              <button type="submit" className="btn btn-primary">הרשמה</button>
            </form>
            <p style={{ textAlign: "center", marginTop: 18, fontSize: 13 }}>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); setView("login"); }}
                style={{ color: "var(--accent)", textDecoration: "none" }}
              >
                חזרה לכניסה
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
