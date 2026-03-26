import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { api } from "../services/api";
import Header from "../components/Header";
import ToastContainer from "../components/ToastContainer";
import { useToast } from "../hooks/useToast";

const quickCities = [
  "תל אביב",
  "ירושלים",
  "חיפה",
  "באר שבע",
  "אשדוד",
  "אשקלון",
  "נתניה",
  "הרצליה",
  "ראשון לציון",
  "פתח תקווה",
  "שדרות",
  "קריית שמונה",
];

export default function SoldierPanel() {
  const { user, logout, updateUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { toasts, showToast } = useToast();

  const [cityInput, setCityInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [surveys, setSurveys] = useState([]);
  const [modalEvent, setModalEvent] = useState(null);
  const [respondedEvents, setRespondedEvents] = useState({});
  const [locationRequest, setLocationRequest] = useState(null);

  const loadPendingSurveys = useCallback(async () => {
    try {
      const data = await api.getPendingSurveys();
      setSurveys(data);
    } catch (err) {
      console.error("Error loading surveys:", err);
    }
  }, []);

  const loadLatestLocationRequest = useCallback(async () => {
    try {
      const data = await api.getLatestLocationRequest();
      setLocationRequest(data);
    } catch {
      // no active request
    }
  }, []);

  useEffect(() => {
    loadPendingSurveys();
    loadLatestLocationRequest();
  }, [loadPendingSurveys, loadLatestLocationRequest]);

  useEffect(() => {
    if (!socket) return;
    function onNewSurvey(data) {
      showToast(data.message, "alert");
      setModalEvent(data);
      setSurveys((prev) => {
        if (prev.some((s) => (s.event_id?._id || s.event_id) === data.event_id)) return prev;
        return [{ event_id: data.event_id, message: data.message }, ...prev];
      });
    }
    function onEventEnded(data) {
      showToast(`האירוע הסתיים: ${data.cities.join(", ")}`, "success");
      setModalEvent(null);
      setSurveys((prev) => prev.filter((s) => {
        const eid = s.event_id?._id || s.event_id;
        return eid !== data.event_id;
      }));
    }
    function onLocationRequest(data) {
      setLocationRequest(data);
      showToast("נדרש עדכון מיקום — יש לעדכן את המיקום שלך", "alert");
    }
    function onLocationRequestClosed() {
      setLocationRequest(null);
    }
    socket.on("new_event_survey", onNewSurvey);
    socket.on("event_ended", onEventEnded);
    socket.on("location_request", onLocationRequest);
    socket.on("location_request_closed", onLocationRequestClosed);
    return () => {
      socket.off("new_event_survey", onNewSurvey);
      socket.off("event_ended", onEventEnded);
      socket.off("location_request", onLocationRequest);
      socket.off("location_request_closed", onLocationRequestClosed);
    };
  }, [socket, showToast, loadPendingSurveys]);

  async function handleRespond(eventId, status) {
    try {
      await api.respondToEvent(eventId, status);
      setRespondedEvents((prev) => ({ ...prev, [eventId]: status }));
      setModalEvent(null);
      showToast("התשובה נשלחה בהצלחה", "success");
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

  async function handleUpdateLocation(city) {
    if (!city.trim()) {
      showToast("נא להזין שם עיר", "warning");
      return;
    }
    try {
      await api.updateLocation(city, 0, 0);
      updateUser({ city });
      setCityInput("");
      if (socket) socket.emit("update_city", { city });
      showToast(`מיקום עודכן ל${city}`, "success");
    } catch (err) {
      showToast(err.message, "alert");
    }
  }

  async function handleUpdatePhone(phone) {
    if (!phone.trim()) {
      showToast("נא להזין מספר טלפון", "warning");
      return;
    }
    try {
      const updated = await api.updatePhone(phone);
      updateUser({ phone: updated.phone });
      setPhoneInput("");
      showToast("מספר הטלפון עודכן", "success");
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
        title="🛡️ מערכת נכס״ל - אזור אישי"
        userName={user?.name}
        onLogout={handleLogout}
      />

      <div className="container" style={{ maxWidth: 700 }}>
        {/* Location Request Banner */}
        {locationRequest && (
          <div className="survey-card" style={{
            borderColor: "var(--accent)",
            background: "var(--accent-dim, rgba(59,130,246,0.08))",
            borderWidth: 2,
          }}>
            <h3 style={{ color: "var(--accent, #3b82f6)" }}>📍 נדרש עדכון מיקום</h3>
            <p>המפקד ביקש מכל החיילים לעדכן את המיקום שלהם.</p>
            <small style={{ color: "var(--text-muted)" }}>
              {new Date(locationRequest.createdAt).toLocaleString("he-IL")}
            </small>
            <div style={{ marginTop: 12 }}>
              <a href="#location-section" className="btn btn-primary" style={{ textDecoration: "none" }}>
                עדכן מיקום עכשיו ⬇️
              </a>
            </div>
          </div>
        )}

        {/* Pending Surveys */}
        {surveys.map((s) => {
          const eid = s.event_id?._id || s.event_id;
          const responded = respondedEvents[eid];
          return (
            <div
              key={eid}
              className={`survey-card ${responded ? "responded" : ""}`}
              style={
                responded
                  ? {
                      borderColor: responded === "ok" ? "var(--green)" : "var(--red)",
                      background: responded === "ok" ? "var(--green-dim)" : "var(--red-dim)",
                    }
                  : undefined
              }
            >
              {responded ? (
                <>
                  <h3
                    style={{
                      color: responded === "ok" ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {responded === "ok"
                      ? "✅ דיווחת שאתה בסדר"
                      : "❌ דיווחת שאינך בסדר"}
                  </h3>
                  <p>התשובה נשלחה למפקד</p>
                </>
              ) : (
                <>
                  <h3>🚨 סקר נכס״ל</h3>
                  <p>
                    {s.event_id?.cities
                      ? `התראה פעילה ב: ${s.event_id.cities.join(", ")}`
                      : s.message || "אזורך"}
                  </p>
                  <p>האם אתה בסדר?</p>
                  <div className="btn-group">
                    <button
                      className="btn btn-success"
                      onClick={() => handleRespond(eid, "ok")}
                    >
                      אני בסדר ✅
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRespond(eid, "not_ok")}
                    >
                      אני לא בסדר ❌
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Location & Phone */}
        <div className="location-card" id="location-section">
          <h3>📍 מיקום נוכחי</h3>
          <div className="current-location">{user?.city || "לא עודכן"}</div>
          <div className="form-group">
            <label>עדכון עיר</label>
            <input
              type="text"
              placeholder="הזן את שם העיר הנוכחית"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
            />
            <button
              className="btn btn-success"
              onClick={() => handleUpdateLocation(cityInput)}
              style={{ marginTop: 8 }}
            >
              עדכן מיקום
            </button>
          </div>
          <div className="form-group" style={{ marginTop: 16 }}>
            <label>עדכון מספר טלפון</label>
            <input
              type="tel"
              placeholder="הזן מספר טלפון"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={() => handleUpdatePhone(phoneInput)}
              style={{ marginTop: 8 }}
            >
              עדכן טלפון
            </button>
            <div style={{ marginTop: 4, fontSize: 14, color: "var(--text-muted)" }}>
              מספר נוכחי: {user?.phone || "לא עודכן"}
            </div>
          </div>
        </div>

        {/* Quick Cities */}
        <div className="card">
          <h2>🏙️ עדכון מהיר</h2>
          <div className="alert-cities-list">
            {quickCities.map((c) => (
              <button
                key={c}
                className="city-tag safe"
                onClick={() => handleUpdateLocation(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Survey Modal */}
      {modalEvent && !respondedEvents[modalEvent.event_id] && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>🚨 התראה!</h2>
            <p>{modalEvent.message}</p>
            <div className="btn-group">
              <button
                className="btn btn-success"
                onClick={() => handleRespond(modalEvent.event_id, "ok")}
              >
                אני בסדר ✅
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleRespond(modalEvent.event_id, "not_ok")}
              >
                אני לא בסדר ❌
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
