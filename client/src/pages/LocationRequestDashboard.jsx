import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { api } from "../services/api";
import Header from "../components/Header";
import ToastContainer from "../components/ToastContainer";
import { useToast } from "../hooks/useToast";

export default function LocationRequestDashboard() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { toasts, showToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all | updated | not_updated
  const [sendingRequest, setSendingRequest] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const data = await api.getAllLocationRequests();
      setRequests(data);
      // Auto-select the latest active request
      const active = data.find((r) => r.status === "active");
      if (active && !selectedRequest) {
        setSelectedRequest(active);
      }
    } catch (err) {
      console.error("Error loading location requests:", err);
    }
  }, []);

  const loadStatuses = useCallback(async (requestId) => {
    setLoading(true);
    try {
      const data = await api.getLocationRequestStatuses(requestId);
      setStatuses(data);
    } catch (err) {
      console.error("Error loading statuses:", err);
      setStatuses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (selectedRequest) {
      loadStatuses(selectedRequest._id);
    }
  }, [selectedRequest, loadStatuses]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    function onLocationRequestSent() {
      loadRequests();
    }

    function onSoldierLocationUpdated() {
      if (selectedRequest) {
        loadStatuses(selectedRequest._id);
      }
    }

    socket.on("location_request_sent", onLocationRequestSent);
    socket.on("soldier_location_updated", onSoldierLocationUpdated);

    return () => {
      socket.off("location_request_sent", onLocationRequestSent);
      socket.off("soldier_location_updated", onSoldierLocationUpdated);
    };
  }, [socket, selectedRequest, loadRequests, loadStatuses]);

  async function handleSendRequest() {
    if (!window.confirm("האם לשלוח דרישת עדכון מיקום לכל החיילים?")) return;
    setSendingRequest(true);
    try {
      const result = await api.sendLocationRequest();
      showToast(
        `דרישה נשלחה — ${result.sms_sent} SMS, ${result.total_soldiers} חיילים`,
        "success"
      );
      await loadRequests();
      // Select the new one
      const data = await api.getAllLocationRequests();
      setRequests(data);
      const active = data.find((r) => r.status === "active");
      if (active) setSelectedRequest(active);
    } catch (err) {
      showToast(err.message, "alert");
    } finally {
      setSendingRequest(false);
    }
  }

  async function handleCloseRequest(id) {
    if (!window.confirm("האם לסגור את דרישת עדכון המיקום?")) return;
    try {
      await api.closeLocationRequest(id);
      showToast("הדרישה נסגרה", "success");
      setSelectedRequest(null);
      setStatuses([]);
      await loadRequests();
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

  function handleSelectRequest(request) {
    setSelectedRequest(request);
    setSearch("");
    setFilterStatus("all");
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  // Stats
  const updatedCount = statuses.filter((s) => s.updatedLocation).length;
  const notUpdatedCount = statuses.filter((s) => !s.updatedLocation).length;

  // Filter + Search
  const filteredStatuses = statuses.filter((s) => {
    const matchesSearch =
      s.name?.includes(search) ||
      s.phone?.includes(search) ||
      s.city?.includes(search) ||
      s.email?.includes(search);

    if (filterStatus === "updated") return matchesSearch && s.updatedLocation;
    if (filterStatus === "not_updated") return matchesSearch && !s.updatedLocation;
    return matchesSearch;
  });

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <Header
        title="📍 מעקב דרישות עדכון מיקום"
        userName={user?.name}
        onLogout={handleLogout}
        navLinks={[{ to: "/commander", label: "חזרה לדשבורד" }]}
      />

      <div className="container">
        {/* Top Bar */}
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>📍 דרישת עדכון מיקום</h3>
            <small style={{ color: "var(--text-muted)" }}>שליחת בקשה לכל החיילים לעדכן מיקום</small>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSendRequest}
            disabled={sendingRequest}
          >
            {sendingRequest ? "שולח..." : "שלח דרישה חדשה"}
          </button>
        </div>

        <div className="grid-2">
          {/* Request List */}
          <div className="card">
            <h2>📋 היסטוריית דרישות</h2>
            {requests.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center" }}>אין דרישות</p>
            ) : (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {requests.map((r) => (
                  <div
                    key={r._id}
                    onClick={() => handleSelectRequest(r)}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      background: selectedRequest?._id === r._id ? "var(--accent-dim, rgba(59,130,246,0.08))" : "transparent",
                      borderRight: selectedRequest?._id === r._id ? "3px solid var(--accent, #3b82f6)" : "3px solid transparent",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{new Date(r.createdAt).toLocaleString("he-IL")}</strong>
                      <span style={{
                        padding: "2px 10px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: r.status === "active" ? "var(--green-dim)" : "var(--bg-input)",
                        color: r.status === "active" ? "var(--green)" : "var(--text-muted)",
                      }}>
                        {r.status === "active" ? "פעיל" : "נסגר"}
                      </span>
                    </div>
                    <small style={{ color: "var(--text-muted)" }}>
                      נוצר ע״י: {r.created_by?.name || "לא ידוע"}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats + Status Detail */}
          <div className="card">
            {!selectedRequest ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
                בחר דרישה מהרשימה לצפייה בסטטוס
              </p>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ margin: 0, border: "none", paddingBottom: 0 }}>
                    סטטוס דרישה — {new Date(selectedRequest.createdAt).toLocaleString("he-IL")}
                  </h2>
                  {selectedRequest.status === "active" && (
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleCloseRequest(selectedRequest._id)}
                    >
                      סגור דרישה
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div className="stats" style={{ marginBottom: 16 }}>
                  <div className="stat-card success">
                    <div className="number">{updatedCount}</div>
                    <div className="label">עדכנו מיקום ✅</div>
                  </div>
                  <div className="stat-card danger">
                    <div className="number">{notUpdatedCount}</div>
                    <div className="label">לא עדכנו ❌</div>
                  </div>
                  <div className="stat-card">
                    <div className="number">{statuses.length}</div>
                    <div className="label">סה״כ חיילים</div>
                  </div>
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder="חיפוש לפי שם, טלפון, עיר..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 200 }}
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                  >
                    <option value="all">הכל</option>
                    <option value="updated">עדכנו מיקום ✅</option>
                    <option value="not_updated">לא עדכנו ❌</option>
                  </select>
                </div>

                {/* Soldiers Table */}
                {loading ? (
                  <p style={{ textAlign: "center", color: "var(--text-muted)" }}>טוען...</p>
                ) : (
                  <div className="soldiers-table-wrapper">
                    <table className="soldiers-table">
                      <thead>
                        <tr>
                          <th>שם</th>
                          <th>טלפון</th>
                          <th>עיר</th>
                          <th>עדכון אחרון</th>
                          <th>סטטוס</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStatuses.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
                              {statuses.length === 0 ? "אין חיילים" : "לא נמצאו תוצאות"}
                            </td>
                          </tr>
                        ) : (
                          filteredStatuses.map((s) => (
                            <tr key={s._id}>
                              <td>{s.name}</td>
                              <td>
                                {s.phone ? (
                                  <a href={`tel:${s.phone}`} className="phone-link">📞 {s.phone}</a>
                                ) : "—"}
                              </td>
                              <td>{s.city || "לא עודכן"}</td>
                              <td>
                                <small>{new Date(s.lastUpdate).toLocaleString("he-IL")}</small>
                              </td>
                              <td>
                                <span style={{
                                  padding: "2px 10px",
                                  borderRadius: 12,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  background: s.updatedLocation ? "var(--green-dim)" : "var(--red-dim)",
                                  color: s.updatedLocation ? "var(--green)" : "var(--red)",
                                }}>
                                  {s.updatedLocation ? "עדכן ✅" : "לא עדכן ❌"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
