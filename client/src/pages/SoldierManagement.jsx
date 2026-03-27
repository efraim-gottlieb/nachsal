import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { api } from "../services/api";
import Header from "../components/Header";
import ToastContainer from "../components/ToastContainer";
import SoldiersMap from "../components/SoldiersMap";
import { useToast } from "../hooks/useToast";

export default function SoldierManagement() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { toasts, showToast } = useToast();

  const [soldiers, setSoldiers] = useState([]);
  const [soldierSearch, setSoldierSearch] = useState("");
  const [editingSoldier, setEditingSoldier] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", city: "", email: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", phone: "", city: "" });

  const loadSoldiers = useCallback(async () => {
    try {
      const data = await api.getAllSoldiers();
      setSoldiers(data);
    } catch (err) {
      console.error("Error loading soldiers:", err);
    }
  }, []);

  useEffect(() => {
    loadSoldiers();
  }, [loadSoldiers]);

  useEffect(() => {
    if (!socket) return;

    function onSoldierLocationUpdated() {
      loadSoldiers();
    }

    socket.on("soldier_location_updated", onSoldierLocationUpdated);

    return () => {
      socket.off("soldier_location_updated", onSoldierLocationUpdated);
    };
  }, [socket, loadSoldiers]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  function openEditSoldier(soldier) {
    setEditingSoldier(soldier);
    setEditForm({
      name: soldier.name,
      phone: soldier.phone,
      city: soldier.city || "",
      email: soldier.email,
    });
  }

  async function handleSaveEdit() {
    try {
      await api.updateSoldier(editingSoldier._id, editForm);
      showToast("פרטי החייל עודכנו בהצלחה", "success");
      setEditingSoldier(null);
      await loadSoldiers();
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

  async function handleDeleteSoldier(soldier) {
    if (!window.confirm(`האם למחוק את ${soldier.name}?`)) return;
    try {
      await api.deleteSoldier(soldier._id);
      showToast("החייל נמחק בהצלחה", "success");
      await loadSoldiers();
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

  async function handleAddSoldier() {
    if (!addForm.name || !addForm.email || !addForm.password || !addForm.phone) {
      showToast("נא למלא שם, אימייל, סיסמה וטלפון", "warning");
      return;
    }
    try {
      await api.createSoldier(addForm);
      showToast("החייל נוסף בהצלחה", "success");
      setShowAddModal(false);
      setAddForm({ name: "", email: "", password: "", phone: "", city: "" });
      await loadSoldiers();
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

  async function handlePersonalLocationRequest(soldier) {
    try {
      const result = await api.sendPersonalLocationRequest(soldier._id);
      const smsText = result.sms_sent ? "+ SMS" : "(ללא SMS)";
      showToast(`דרישת מיקום נשלחה ל${soldier.name} ${smsText}`, "success");
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

  const filteredSoldiers = soldiers.filter((s) =>
    s.name.includes(soldierSearch) ||
    s.phone.includes(soldierSearch) ||
    (s.city || "").includes(soldierSearch) ||
    s.email.includes(soldierSearch)
  );

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <Header
        title="👥 ניהול חיילים"
        userName={user?.name}
        onLogout={handleLogout}
        navLinks={[{ to: "/commander", label: "חזרה לדשבורד" }]}
      />

      <div className="container">
        {/* Stats */}
        <div className="stats">
          <div className="stat-card">
            <div className="number">{soldiers.length}</div>
            <div className="label">סה״כ חיילים</div>
          </div>
          <div className="stat-card success">
            <div className="number">{soldiers.filter((s) => s.city).length}</div>
            <div className="label">עם עיר מוגדרת</div>
          </div>
          <div className="stat-card warning">
            <div className="number">{soldiers.filter((s) => !s.city).length}</div>
            <div className="label">ללא עיר</div>
          </div>
        </div>

        {/* Map */}
        <div className="card">
          <h2>🗺️ מפת חיילים</h2>
          <SoldiersMap soldiers={soldiers} activeCities={[]} />
        </div>

        {/* Soldiers Table */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
            <h2 style={{ margin: 0, border: "none", paddingBottom: 0 }}>👥 רשימת חיילים</h2>
            <button className="btn btn-success btn-small" onClick={() => setShowAddModal(true)}>
              ➕ הוסף חייל
            </button>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="חיפוש לפי שם, טלפון, עיר או אימייל..."
              value={soldierSearch}
              onChange={(e) => setSoldierSearch(e.target.value)}
            />
          </div>
          {filteredSoldiers.length === 0 ? (
            <p style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
              {soldiers.length === 0 ? "אין חיילים רשומים" : "לא נמצאו תוצאות"}
            </p>
          ) : (
            <div className="soldiers-table-wrapper">
              <table className="soldiers-table">
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>אימייל</th>
                    <th>טלפון</th>
                    <th>עיר</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSoldiers.map((s) => (
                    <tr key={s._id}>
                      <td>{s.name}</td>
                      <td>{s.email}</td>
                      <td>
                        {s.phone ? (
                          <a href={`tel:${s.phone}`} className="phone-link">📞 {s.phone}</a>
                        ) : "—"}
                      </td>
                      <td>{s.city || "לא עודכן"}</td>
                      <td className="actions-cell">
                        <button
                          className="btn btn-small btn-primary"
                          onClick={() => openEditSoldier(s)}
                        >
                          ערוך
                        </button>
                        <button
                          className="btn btn-small btn-danger"
                          onClick={() => handleDeleteSoldier(s)}
                        >
                          מחק
                        </button>
                        <button
                          className="btn btn-small btn-success"
                          title="שלח דרישת עדכון מיקום אישית"
                          onClick={() => handlePersonalLocationRequest(s)}
                        >
                          📍
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Soldier Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>➕ הוספת חייל חדש</h2>
            <div className="form-group">
              <label>שם</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="שם מלא"
              />
            </div>
            <div className="form-group">
              <label>אימייל</label>
              <input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="form-group">
              <label>סיסמה</label>
              <input
                type="password"
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                placeholder="סיסמה"
              />
            </div>
            <div className="form-group">
              <label>טלפון</label>
              <input
                type="tel"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="050-1234567"
              />
            </div>
            <div className="form-group">
              <label>עיר (אופציונלי)</label>
              <input
                type="text"
                value={addForm.city}
                onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                placeholder="עיר מגורים"
              />
            </div>
            <div className="btn-group" style={{ marginTop: 16 }}>
              <button className="btn btn-success" onClick={handleAddSoldier}>
                הוסף
              </button>
              <button className="btn btn-danger" onClick={() => setShowAddModal(false)}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Soldier Modal */}
      {editingSoldier && (
        <div className="modal-overlay" onClick={() => setEditingSoldier(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>✏️ עריכת חייל</h2>
            <div className="form-group">
              <label>שם</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>אימייל</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>טלפון</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>עיר</label>
              <input
                type="text"
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
              />
            </div>
            <div className="btn-group" style={{ marginTop: 16 }}>
              <button className="btn btn-success" onClick={handleSaveEdit}>
                שמור
              </button>
              <button className="btn btn-danger" onClick={() => setEditingSoldier(null)}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
