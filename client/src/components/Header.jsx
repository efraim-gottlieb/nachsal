import { Link } from "react-router-dom";

export default function Header({ title, userName, onLogout, navLinks }) {
  return (
    <header className="header">
      <h1>{title}</h1>
      <div className="user-info">
        {navLinks && navLinks.map((link, i) => (
          <Link key={i} to={link.to} className="btn btn-ghost btn-small">
            {link.label}
          </Link>
        ))}
        <span>שלום, {userName}</span>
        <button className="btn btn-logout btn-small" onClick={onLogout}>
          יציאה
        </button>
      </div>
    </header>
  );
}
