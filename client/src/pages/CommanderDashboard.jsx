import { useState, useEffect, useCallback, useMemo } from "react";
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
  const [expandedEvents, setExpandedEvents] = useState({});
  const [eventStatuses, setEventStatuses] = useState({});
  const [pendingCount, setPendingCount] = useState(0);
  const [okCount, setOkCount] = useState(0);

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
        const statuses = await api.getEventStatuses(event._id);
        setEventStatuses((prev) => ({ ...prev, [event._id]: statuses }));
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
  }, [loadData]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    function onOrefAlert(data) {
      if (data.status === "active") {
        setOrefAlert({ title: data.title, desc: data.desc });
        setOrefCities(data.cities);
        showToast(`${data.title || "התראה"}: ${data.cities.join(", ")}`, "alert");
        loadSoldierCities();
      } else {
        showToast(`האירוע הסתיים: ${data.cities.join(", ")}`, "success");
        setTimeout(() => {
          setOrefAlert(null);
          setOrefCities([]);
        }, 10000);
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
  }, [socket, showToast, loadData, loadSoldiers]);

  const activeCities = useMemo(() => {
    const set = new Set();
    events.forEach((e) => e.cities.forEach((c) => set.add(c)));
    orefCities.forEach((c) => set.add(c));
    return [...set];
  }, [events, orefCities]);


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
        const statuses = await api.getEventStatuses(eventId);
        setEventStatuses((prev) => ({ ...prev, [eventId]: statuses }));
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

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <Header
        title="🛡️ מערכת נכס״ל - דשבורד מפקד"
        userName={user?.name}
        onLogout={handleLogout}
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

                {expandedEvents[event._id] && eventStatuses[event._id] && (
                  <ul
                    className="soldier-list"
                    style={{ marginTop: 10, maxHeight: 200, overflowY: "auto" }}
                  >
                    {eventStatuses[event._id].length === 0 ? (
                      <li style={{ padding: 10, color: "#888", fontSize: 13 }}>
                        אין חיילים מושפעים
                      </li>
                    ) : (
                      eventStatuses[event._id].map((s) => (
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
            <h2>👥 חיילים</h2>
            <ul className="soldier-list">
              {soldiers.length === 0 ? (
                <li style={{ padding: 20, textAlign: "center", color: "#888" }}>
                  אין חיילים רשומים
                </li>
              ) : (
                soldiers.map((s) => (
                  <li key={s._id} className="soldier-item">
                    <div className="info">
                      <span className="name">{s.name}</span>
                      <span className="details">
                        {s.city || "לא עודכן מיקום"} | {s.phone}
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
