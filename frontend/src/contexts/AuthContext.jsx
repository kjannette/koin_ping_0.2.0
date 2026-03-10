/**
 * AuthContext - Firebase Authentication State Management
 *
 * Provides authentication state, tier info, and methods throughout the app
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase/config";
import { getAccount } from "../api/account";

const AuthContext = createContext();

const DEFAULT_TIER_LIMITS = {
    max_addresses: 1,
    max_alert_types: 1,
    allowed_channels: ["email"],
};

/**
 * Hook to access auth context
 * @returns {Object} Auth context value
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}

/**
 * AuthProvider - Wraps app and provides auth state + tier info
 */
export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [userTier, setUserTier] = useState("free");
    const [tierLimits, setTierLimits] = useState(DEFAULT_TIER_LIMITS);
    const [addressCount, setAddressCount] = useState(0);

    const refreshAccount = useCallback(async () => {
        try {
            const data = await getAccount();
            setUserTier(data.subscription_tier || "free");
            setTierLimits(data.tier_limits || DEFAULT_TIER_LIMITS);
            setAddressCount(data.address_count || 0);
        } catch {
            // account fetch can fail during onboarding before subscription is active
        }
    }, []);

    async function signup(email, password) {
        try {
            setError(null);
            const result = await createUserWithEmailAndPassword(
                auth,
                email,
                password,
            );
            return result.user;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }

    async function login(email, password) {
        try {
            setError(null);
            const result = await signInWithEmailAndPassword(
                auth,
                email,
                password,
            );
            return result.user;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }

    async function logout() {
        try {
            setError(null);
            setUserTier("free");
            setTierLimits(DEFAULT_TIER_LIMITS);
            setAddressCount(0);
            await signOut(auth);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
            if (user) {
                refreshAccount();
            }
        });
        return unsubscribe;
    }, [refreshAccount]);

    const value = {
        currentUser,
        signup,
        login,
        logout,
        error,
        loading,
        userTier,
        tierLimits,
        addressCount,
        refreshAccount,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
