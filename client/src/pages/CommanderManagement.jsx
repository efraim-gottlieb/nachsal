import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import Header from "../components/Header";
import ToastContainer from "../components/ToastContainer";
import { useToast } from "../hooks/useToast";

export default function CommanderManagement() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toasts, addToast } = useToast();

  const [commanders, setCommanders] = useState([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", phone: "", sms_alerts: false });
  const [editingCommander, setEditingCommander] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", sms_alerts: false });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const fetchCommanders = useCallback(async () => {
    try {
      const data = await api.getAllCommanders();
      setCommanders(data);
    } catch {
      addToast("שגיאה בטעינת מפקדים", "error");
    }
  }, [addToast]);

  useEffect(() => {
    fetchCommanders();
  }, [fetchCommanders]);

  const filteredCommanders = commanders.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  const handleAddCommander = async (e) => {
    e.preventDefault();
    try {
      await api.createCommander(addForm);
      addToast("מפקד נוסף בהצלחה", "success");
      setShowAddModal(false);
      setAddForm({ name: "", email: "", password: "", phone: "", sms_alerts: false });
      fetchCommanders();
    } catch (err) {
      addToast(err.message || "שגיאה בהוספת מפקד", "error");
    }
  };

  const handleEditCommander = async (e) => {
    e.preventDefault();
    try {
      await api.updateCommander(editingCommander._id, editForm);
      addToast("מפקד עודכן בהצלחה", "success");
      setEditingCommander(null);
      fetchCommanders();
    } catch (err) {
      addToast(err.message || "שגיאה בעדכון מפקד", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק מפקד זה?")) return;
    try {
      await api.deleteCommander(id);
      addToast("מפקד נמחק", "success");
      fetchCommanders();
    } catch (err) {
      addToast(err.message || "שגיאה במחיקת מפקד", "error");
    }
  };

  const handleToggleSms = async (commander) => {
    try {
      await api.toggleCommanderSms(commander._id, !commander.sms_alerts);
      fetchCommanders();
      addToast(
        commander.sms_alerts ? "התראות SMS כובו" : "התראות SMS הופעלו",
        "success"
      );
    } catch (err) {
      addToast(err.message || "שגיאה בעדכון התראות", "error");
    }
  };

  const openEdit = (c) => {
    setEditingCommander(c);
    setEditForm({ name: c.name, email: c.email, phone: c.phone || "", sms_alerts: c.sms_alerts || false });
  };

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <Header
        title="🛡️ ניהול מפקדים"
        userName={user?.name}
        onLogout={handleLogout}
        navLinks={[{ to: "/commander", label: "חזרה לדשבורד" }]}
      />

      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <input
            type="text"
            placeholder="חיפוש מפקד..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ maxWidth: 300 }}
          />
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + הוסף מפקד
          </button>
        </div>

        <div className="soldiers-table-wrapper">
          <table className="soldiers-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>אימייל</th>
                <th>טלפון</th>
                <th>סוג</th>
                <th>התראות SMS</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommanders.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.user_type === "admin" ? "אדמין" : "מפקד"}</td>
                  <td>
                    <button
                      className={`btn btn-small ${c.sms_alerts ? "btn-success" : "btn-danger"}`}
                      onClick={() => handleToggleSms(c)}
                    >
                      {c.sms_alerts ? "פעיל ✅" : "כבוי ❌"}
                    </button>
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-small btn-warning" onClick={() => openEdit(c)}>ערוך</button>
                    <button className="btn btn-small btn-danger" onClick={() => handleDelete(c._id)}>מחק</button>
                  </td>
                </tr>
              ))}
              {filteredCommanders.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>לא נמצאו מפקדים</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Commander Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>הוספת מפקד חדש</h3>
            <form onSubmit={handleAddCommander}>
              <input
                className="form-input"
                placeholder="שם מלא"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                required
              />
              <input
                className="form-input"
                type="email"
                placeholder="אימייל"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                required
              />
              <input
                className="form-input"
                type="password"
                placeholder="סיסמה"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                required
              />
              <input
                className="form-input"
                placeholder="טלפון"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                required
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
                <input
                  type="checkbox"
                  checked={addForm.sms_alerts}
                  onChange={(e) => setAddForm({ ...addForm, sms_alerts: e.target.checked })}
                />
                קבלת התראות SMS
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="submit" className="btn btn-success">הוסף</button>
                <button type="button" className="btn btn-danger" onClick={() => setShowAddModal(false)}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Commander Modal */}
      {editingCommander && (
        <div className="modal-overlay" onClick={() => setEditingCommander(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>עריכת מפקד</h3>
            <form onSubmit={handleEditCommander}>
              <input
                className="form-input"
                placeholder="שם מלא"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
              <input
                className="form-input"
                type="email"
                placeholder="אימייל"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
              />
              <input
                className="form-input"
                placeholder="טלפון"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                required
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
                <input
                  type="checkbox"
                  checked={editForm.sms_alerts}
                  onChange={(e) => setEditForm({ ...editForm, sms_alerts: e.target.checked })}
                />
                קבלת התראות SMS
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="submit" className="btn btn-success">שמור</button>
                <button type="button" className="btn btn-danger" onClick={() => setEditingCommander(null)}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
