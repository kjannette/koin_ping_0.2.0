import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/login/Login";
import Signup from "./pages/Signup";
import Subscribe from "./pages/subscribe/Subscribe";
import Addresses from "./pages/addresses/Addresses";
import Alerts from "./pages/alerts/Alerts";
import AlertHistory from "./pages/alertHistory/AlertHistory";
import Account from "./pages/user_account/Account";

export default function App() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<Addresses />} />
        <Route path="/addresses" element={<Addresses />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/alertevents" element={<AlertHistory />} />
        <Route path="/account" element={<Account />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="*" element={<Navigate to="/addresses" />} />
      </Routes>
    </div>
  );
}
