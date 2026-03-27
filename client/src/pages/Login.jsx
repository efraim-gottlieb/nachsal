import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ToastContainer from "../components/ToastContainer";
import { useToast } from "../hooks/useToast";

export default function Login() {
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "soldier";
  const isCommander = role === "commander";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
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

  return (
    <>
      <ToastContainer toasts={toasts} />

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
        </div>
      </div>
    </>
  );
}
