export default function Header({ title, userName, onLogout }) {
  return (
    <div className="header">
      <h1>{title}</h1>
      <div className="user-info">
        <span>שלום, {userName}</span>
        <button className="btn btn-logout btn-small" onClick={onLogout}>
          יציאה
        </button>
      </div>
    </div>
  );
}
