import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="landing">
      <h1>🛡️ מערכת נכס״ל</h1>
      <p>
        מערכת ניהול כוננות ואירועים למפקדים וחיילים. מעקב בזמן אמת אחרי מצב
        החיילים בעת התרעות פיקוד העורף.
      </p>
      <div className="landing-buttons">
        <Link to="/login?role=commander" className="landing-btn commander">
          <span className="icon">⭐</span>
          <span>כניסת מפקד</span>
        </Link>
        <Link to="/login?role=soldier" className="landing-btn soldier">
          <span className="icon">🪖</span>
          <span>אזור אישי - חייל</span>
        </Link>
      </div>
    </div>
  );
}
