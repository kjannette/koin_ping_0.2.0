/**
 * AuthContext - Firebase Authentication State Management
 *
 * Provides authentication state and methods throughout the app
 */

import { createContext, useContext, useEffect, useState } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase/config";

const AuthContext = createContext();

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
 * AuthProvider - Wraps app and provides auth state
 */
export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Sign up with email and password
     */
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

    /**
     * Log in with email and password
     */
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

    /**
     * Log out current user
     */
    async function logout() {
        try {
            setError(null);
            await signOut(auth);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }

    /**
     * Listen for auth state changes
     */
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        // Cleanup subscription
        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        signup,
        login,
        logout,
        error,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
