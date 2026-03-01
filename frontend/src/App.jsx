import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Addresses from "./pages/Addresses";
import Alerts from "./pages/Alerts";
import AlertHistory from "./pages/AlertHistory";

export default function App() {
    const { currentUser } = useAuth();

    if (!currentUser) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
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
                <Route path="/history" element={<AlertHistory />} />
                <Route path="*" element={<Navigate to="/addresses" />} />
            </Routes>
        </div>
    );
}
