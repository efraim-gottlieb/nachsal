import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { api } from "../services/api";
import Header from "../components/Header";
import ToastContainer from "../components/ToastContainer";
import SoldiersMap from "../components/SoldiersMap";
import { useToast } from "../hooks/useToast";

const STATUS_LABELS = {
  ok: "בסדר ✅",
  not_ok: "לא בסדר ❌",
  pending: "ממתין ⏳",
  no_response: "לא ענה ⚪",
};

export default function CommanderDashboard() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { toasts, showToast } = useToast();

  const [soldiers, setSoldiers] = useState([]);
  const [events, setEvents] = useState([]);
  const [soldierCities, setSoldierCities] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [orefAlert, setOrefAlert] = useState(null);
  const [orefCities, setOrefCities] = useState([]);
  const [persistentOrefCities, setPersistentOrefCities] = useState([]);
    // Load persistent Oref alerts from backend (last 10 min)
    const loadPersistentOrefAlerts = useCallback(async () => {
      try {
        const alerts = await api.getOrefAlerts();
        setPersistentOrefCities(alerts.map(a => a.city));
        // Restore alert title/desc from most recent persisted alert
        if (alerts.length > 0) {
          const latest = alerts.reduce((a, b) =>
            new Date(a.receivedAt) > new Date(b.receivedAt) ? a : b
          );
          setOrefAlert({ title: latest.title, desc: latest.desc });
        }
      } catch (err) {
        // ignore
      }
    }, []);
  const [expandedEvents, setExpandedEvents] = useState({});
  const [eventStatuses, setEventStatuses] = useState({});
  const [pendingCount, setPendingCount] = useState(0);
  const [okCount, setOkCount] = useState(0);
  const [editingSoldier, setEditingSoldier] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", city: "", email: "" });
  const [soldierSearch, setSoldierSearch] = useState("");
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

  const loadSoldierCities = useCallback(async () => {
    try {
      const data = await api.getSoldierCities();
      setSoldierCities(data);
    } catch (err) {
      console.error("Error loading soldier cities:", err);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const data = await api.getActiveEvents();
      setEvents(data);

      let pending = 0;
      let ok = 0;
      for (const event of data) {
        const result = await api.getEventStatuses(event._id);
        const statuses = Array.isArray(result) ? result : (result.statuses || []);
        const allOk = Array.isArray(result) ? (statuses.length > 0 && statuses.every((s) => s.status === "ok")) : (result.allOk || false);
        setEventStatuses((prev) => ({ ...prev, [event._id]: { statuses, allOk } }));
        pending += statuses.filter((s) => s.status === "pending").length;
        ok += statuses.filter((s) => s.status === "ok").length;
      }
      setPendingCount(pending);
      setOkCount(ok);
    } catch (err) {
      console.error("Error loading events:", err);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([loadSoldiers(), loadEvents(), loadSoldierCities()]);
  }, [loadSoldiers, loadEvents, loadSoldierCities]);

  useEffect(() => {
    loadData();
    loadPersistentOrefAlerts();
  }, [loadData, loadPersistentOrefAlerts]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    function onOrefAlert(data) {
      // Only allow specific alert types or ended event
      const allowedTitles = [
        "ירי רקטות וטילים",
        "חדירת כלי טיס עוין",
      ];
      if (data.status === "active") {
        if (!allowedTitles.includes(data.title)) return;
        setOrefAlert({ title: data.title, desc: data.desc });
        setOrefCities(data.cities);
        showToast(`${data.title || "התראה"}: ${data.cities.join(", ")}`, "alert");
        loadSoldierCities();
        // Reload persistent alerts from backend (saved for 10 min)
        loadPersistentOrefAlerts();
      } else {
        showToast(`האירוע הסתיים: ${data.cities.join(", ")}`, "success");
        setTimeout(() => {
          setOrefCities([]);
        }, 10000);
        // Reload persistent alerts (will still show for remaining time)
        loadPersistentOrefAlerts();
      }
    }

    function onOrefSoldiersAffected(data) {
      showToast(
        `${data.soldiers.length} חיילים באזור ההתראה: ${data.cities.join(", ")}`,
        "warning"
      );
    }

    function onEventCreated() {
      showToast("אירוע חדש נוצר", "warning");
      loadData();
    }

    function onSoldierResponded(data) {
      const statusText = data.status === "ok" ? "בסדר ✅" : "לא בסדר ❌";
      showToast(
        `${data.soldier_name} (${data.soldier_city}): ${statusText}`,
        data.status === "ok" ? "success" : "alert"
      );
      loadData();
    }

    function onSoldierLocationUpdated() {
      loadSoldiers();
    }

    function onEventEnded(data) {
      showToast(`אירוע הסתיים: ${data.cities.join(", ")}`, "success");
      loadData();
    }

    socket.on("oref_alert", onOrefAlert);
    socket.on("oref_soldiers_affected", onOrefSoldiersAffected);
    socket.on("event_created", onEventCreated);
    socket.on("soldier_responded", onSoldierResponded);
    socket.on("soldier_location_updated", onSoldierLocationUpdated);
    socket.on("event_ended", onEventEnded);

    return () => {
      socket.off("oref_alert", onOrefAlert);
      socket.off("oref_soldiers_affected", onOrefSoldiersAffected);
      socket.off("event_created", onEventCreated);
      socket.off("soldier_responded", onSoldierResponded);
      socket.off("soldier_location_updated", onSoldierLocationUpdated);
      socket.off("event_ended", onEventEnded);
    };
  }, [socket, showToast, loadData, loadSoldiers, loadPersistentOrefAlerts]);

  // Client-side Oref polling — browser is in Israel so it can reach oref.org.il
  const prevOrefCitiesRef = useRef("[]");
  const wasOrefActiveRef = useRef(false);

  useEffect(() => {
    if (!socket) return;

    const OREF_URL = "https://www.oref.org.il/WarningMessages/alert/alerts.json";
    const ALLOWED_TITLES = ["ירי רקטות וטילים", "חדירת כלי טיס עוין"];

    const interval = setInterval(async () => {
      try {
        const res = await fetch(OREF_URL, {
          headers: { "X-Requested-With": "XMLHttpRequest" },
        });
        const text = await res.text();

        if (text.length > 2) {
          const alertData = JSON.parse(text);
          if (!ALLOWED_TITLES.includes(alertData.title)) return;

          const citiesStr = JSON.stringify(alertData.data || []);
          if (citiesStr !== prevOrefCitiesRef.current) {
            prevOrefCitiesRef.current = citiesStr;
            wasOrefActiveRef.current = true;
            socket.emit("client_oref_alert", { type: "alert", alertData });
          }
        } else if (wasOrefActiveRef.current) {
          wasOrefActiveRef.current = false;
          prevOrefCitiesRef.current = "[]";
          socket.emit("client_oref_alert", { type: "ended" });
        }
      } catch {
        // CORS or network error — silently retry
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [socket]);

  // Merge persistent Oref cities with live orefCities for display
  const activeCities = useMemo(() => {
    const set = new Set();
    events.forEach((e) => e.cities.forEach((c) => set.add(c)));
    [...orefCities, ...persistentOrefCities].forEach((c) => set.add(c));
    return [...set];
  }, [events, orefCities, persistentOrefCities]);


  async function handleTriggerEvent() {
    if (!selectedCities.length) {
      showToast("נא לבחור ערים", "warning");
      return;
    }
    try {
      const result = await api.triggerEvent(selectedCities);
      showToast(`אירוע נוצר - ${result.affected_soldiers} חיילים מושפעים`, "success");
      setSelectedCities([]);
      await loadData();
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

  async function handleTriggerEventAll() {
    if (!soldierCities.length) {
      showToast("אין ערים זמינות להזנקה", "warning");
      return;
    }
    if (!window.confirm("האם להזניק אירוע לכל הערים?")) return;
    try {
      const result = await api.triggerEvent(soldierCities);
      showToast(`אירוע נוצר לכל הערים - ${result.affected_soldiers} חיילים מושפעים`, "success");
      setSelectedCities([]);
      await loadData();
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

  function toggleCity(city) {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  }

  async function triggerEventForCity(city) {
    if (!window.confirm(`האם להזניק אירוע עבור ${city}?`)) return;
    try {
      const result = await api.triggerEvent([city]);
      showToast(`אירוע נוצר ל${city} - ${result.affected_soldiers} חיילים מושפעים`, "success");
      await loadData();
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

  async function handleViewStatuses(eventId) {
    setExpandedEvents((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
    if (!eventStatuses[eventId]) {
      try {
        const result = await api.getEventStatuses(eventId);
        const statuses = Array.isArray(result) ? result : (result.statuses || []);
        const allOk = Array.isArray(result) ? (statuses.length > 0 && statuses.every((s) => s.status === "ok")) : (result.allOk || false);
        setEventStatuses((prev) => ({ ...prev, [eventId]: { statuses, allOk } }));
      } catch {
        showToast("שגיאה בטעינת סטטוסים", "alert");
      }
    }
  }

  async function handleEndEvent(eventId) {
    if (!window.confirm("האם לסיים את האירוע?")) return;
    try {
      await api.endEvent(eventId);
      showToast("האירוע הסתיים", "success");
      await loadData();
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

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
      await loadData();
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

  async function handleDeleteSoldier(soldier) {
    if (!window.confirm(`האם למחוק את ${soldier.name}?`)) return;
    try {
      await api.deleteSoldier(soldier._id);
      showToast("החייל נמחק בהצלחה", "success");
      await loadData();
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
      await loadData();
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
        title="🛡️ מערכת נכס״ל - דשבורד מפקד"
        userName={user?.name}
        onLogout={handleLogout}
        navLinks={[{ to: "/commanders", label: "ניהול מפקדים" }]}
      />

      <div className="container">
        {/* Stats */}
        <div className="stats">
          <div className="stat-card">
            <div className="number">{soldiers.length}</div>
            <div className="label">סה״כ חיילים</div>
          </div>
          <div className="stat-card danger">
            <div className="number">{events.length}</div>
            <div className="label">אירועים פעילים</div>
          </div>
          <div className="stat-card warning">
            <div className="number">{pendingCount}</div>
            <div className="label">ממתינים לתשובה</div>
          </div>
          <div className="stat-card success">
            <div className="number">{okCount}</div>
            <div className="label">דיווחו בסדר</div>
          </div>
        </div>

        {/* Oref + Manual Event */}
        <div className="grid-2">
          <div className="card">
            <h2>🚨 התראות פיקוד העורף</h2>
            <div style={{ padding: 10, textAlign: "center", fontWeight: 600 }}>
              {orefAlert ? (
                <>
                  <span style={{ color: "#dc2626" }}>🚨 {orefAlert.title || "התראה פעילה!"}</span>
                  <br />
                  <small style={{ color: "#888" }}>{orefAlert.desc || ""}</small>
                </>
              ) : (
                <span style={{ color: "#16a34a" }}>אין התראות פעילות</span>
              )}
            </div>
            {orefCities.length > 0 && (
              <div className="alert-cities-list">
                {orefCities
                  .filter((city) => soldierCities.includes(city))
                  .map((city) => (
                  <button
                    key={city}
                    className="city-tag"
                    onClick={() => triggerEventForCity(city)}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
            {persistentOrefCities.length > 0 && orefCities.length === 0 && (
              <div className="alert-cities-list" style={{ marginTop: 8 }}>
                {persistentOrefCities
                  .filter((city) => soldierCities.includes(city))
                  .map((city) => (
                  <button
                    key={city}
                    className="city-tag"
                    onClick={() => triggerEventForCity(city)}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2>⚡ הזנקת אירוע ידנית</h2>
            <div className="form-group">
              <label>בחר ערים (לחץ לבחירה)</label>
              <div className="alert-cities-list" style={{ flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {soldierCities.length === 0 ? (
                  <span style={{ color: "#888", fontSize: 13 }}>אין חיילים עם עיר מוגדרת</span>
                ) : (
                  soldierCities.map((city) => (
                    <button
                      key={city}
                      className="city-tag"
                      style={{
                        background: selectedCities.includes(city) ? "#2563eb" : "#e5e7eb",
                        color: selectedCities.includes(city) ? "#fff" : "#222",
                      }}
                      onClick={() => toggleCity(city)}
                    >
                      {city}
                    </button>
                  ))
                )}
              </div>
            </div>
            <button className="btn btn-danger" onClick={handleTriggerEvent}>
              הזנק אירוע
            </button>
            <button className="btn btn-primary" style={{marginRight: 8, marginTop: 8}} onClick={handleTriggerEventAll}>
              הזנק אירוע לכל הערים
            </button>
          </div>
        </div>

        {/* Active Events */}
        <div className="card">
          <h2>📋 אירועים פעילים</h2>
          {events.length === 0 ? (
            <p style={{ color: "#888", textAlign: "center" }}>אין אירועים פעילים</p>
          ) : (
            events.map((event) => (
              <div key={event._id} className="event-card">
                <div className="event-card-header">
                  <div>
                    <strong>{event.cities.join(", ")}</strong>
                    {eventStatuses[event._id] && (
                      <span style={{
                        marginRight: 10,
                        padding: "2px 10px",
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 600,
                        background: eventStatuses[event._id].allOk ? "#dcfce7" : "#fee2e2",
                        color: eventStatuses[event._id].allOk ? "#16a34a" : "#dc2626",
                      }}>
                        {eventStatuses[event._id].allOk ? "כולם בסדר ✅" : "לא כולם בסדר ❌"}
                      </span>
                    )}
                    <br />
                    <small style={{ color: "#888" }}>
                      {new Date(event.createdAt).toLocaleString("he-IL")}
                    </small>
                    {event.oref_alert && (
                      <span style={{ color: "#dc2626", fontSize: 12 }}>
                        {" "}
                        (התראת פיקוד העורף)
                      </span>
                    )}
                  </div>
                  <div className="event-card-buttons">
                    <button
                      className="btn btn-small btn-primary"
                      onClick={() => handleViewStatuses(event._id)}
                    >
                      {expandedEvents[event._id] ? "הסתר" : "צפה בסטטוס"}
                    </button>
                    <button
                      className="btn btn-small btn-success"
                      onClick={() => handleEndEvent(event._id)}
                    >
                      סיים אירוע
                    </button>
                  </div>
                </div>

                {expandedEvents[event._id] && eventStatuses[event._id]?.statuses && (
                  <ul
                    className="soldier-list"
                    style={{ marginTop: 10, maxHeight: 200, overflowY: "auto" }}
                  >
                    {eventStatuses[event._id].statuses.length === 0 ? (
                      <li style={{ padding: 10, color: "#888", fontSize: 13 }}>
                        אין חיילים מושפעים
                      </li>
                    ) : (
                      eventStatuses[event._id].statuses.map((s) => (
                        <li key={s._id} className="soldier-item">
                          <div className="info">
                            <span className="name">{s.user_id?.name || "לא ידוע"}</span>
                            <span className="details">
                              {s.user_id?.city || ""} | {s.user_id?.phone || ""}
                            </span>
                          </div>
                          <span className={`status-badge ${s.status}`}>
                            {STATUS_LABELS[s.status]}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>

        {/* Map + Soldiers */}
        <div className="grid-2">
          <div className="card">
            <h2>🗺️ מפת חיילים ואזורים</h2>
            <SoldiersMap soldiers={soldiers} activeCities={activeCities} />
          </div>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "2px solid #f0f2f5", paddingBottom: 10 }}>
              <h2 style={{ margin: 0, border: "none", paddingBottom: 0 }}>👥 ניהול חיילים</h2>
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
              <p style={{ padding: 20, textAlign: "center", color: "#888" }}>
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
                        <td>{s.phone}</td>
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
