import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import CommanderDashboard from "./pages/CommanderDashboard";
import CommanderManagement from "./pages/CommanderManagement";
import LocationRequestDashboard from "./pages/LocationRequestDashboard";
import SoldierPanel from "./pages/SoldierPanel";

function ProtectedRoute({ children, allowedTypes }) {
  const { user, token } = useAuth();
  if (!token || !user) return <Navigate to="/login" />;
  if (allowedTypes && !allowedTypes.includes(user.user_type)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/commander"
        element={
          <ProtectedRoute allowedTypes={["commander", "admin"]}>
            <CommanderDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/commanders"
        element={
          <ProtectedRoute allowedTypes={["commander", "admin"]}>
            <CommanderManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/commander/location-requests"
        element={
          <ProtectedRoute allowedTypes={["commander", "admin"]}>
            <LocationRequestDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/soldier"
        element={
          <ProtectedRoute allowedTypes={["soldier", "commander", "admin"]}>
            <SoldierPanel />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
