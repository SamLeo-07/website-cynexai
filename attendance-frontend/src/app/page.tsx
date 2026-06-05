"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role === "admin") {
          router.push("/admin/dashboard");
        } else if (user.role === "clerk") {
          router.push("/clerk");
        } else if (user.role === "trainer") {
          router.push("/trainer");
        } else if (user.role === "student") {
          router.push("/student");
        }
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400 animate-pulse">Loading CynexAI Attendance...</p>
      </div>
    </div>
  );
}
