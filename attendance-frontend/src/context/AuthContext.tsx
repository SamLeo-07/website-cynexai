/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "../lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "clerk" | "trainer" | "student";
  mobile_number?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserLocal: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("attendance_token");
    const storedUser = localStorage.getItem("attendance_user");

    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("attendance_token");
        localStorage.removeItem("attendance_user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post("/api/auth/login", { email, password });
      const { token, user: loggedUser } = response.data;
      
      localStorage.setItem("attendance_token", token);
      localStorage.setItem("attendance_user", JSON.stringify(loggedUser));
      setUser(loggedUser);

      // Redirect based on role
      if (loggedUser.role === "admin") {
        router.push("/admin/dashboard");
      } else if (loggedUser.role === "clerk") {
        router.push("/clerk");
      } else if (loggedUser.role === "trainer") {
        router.push("/trainer");
      } else if (loggedUser.role === "student") {
        router.push("/student");
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Login failed. Please check credentials.";
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem("attendance_token");
    localStorage.removeItem("attendance_user");
    setUser(null);
    router.push("/login");
  };

  const updateUserLocal = (updatedUser: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedUser };
      localStorage.setItem("attendance_user", JSON.stringify(newUser));
      setUser(newUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUserLocal }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Hook for protecting routes (Client-side)
export const useRequireAuth = (allowedRoles?: string[]) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to their default dashboard if role is incorrect
        if (user.role === "admin") router.push("/admin/dashboard");
        else if (user.role === "clerk") router.push("/clerk");
        else if (user.role === "trainer") router.push("/trainer");
        else if (user.role === "student") router.push("/student");
      }
    }
  }, [user, loading, router, allowedRoles]);

  return { user, loading };
};
