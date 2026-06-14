/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Logs from "./components/Logs";
import Users from "./components/Users";
import Servers from "./components/Servers";
import { Lock, Activity, Clock, Users as UsersIcon, LogOut } from "lucide-react";
import { cn } from "./lib/utils";

export default function App() {
  const [user, setUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [view, setView] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Invalid token");
        })
        .then((data) => {
          setUser(data);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem("token");
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] font-sans">
        <h1 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 animate-pulse">Loading System...</h1>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFDFD] text-[#18181B] font-sans">
      {/* Header */}
      <header className="h-16 border-b border-zinc-200 flex justify-between items-center px-8 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-zinc-900" />
            <h1 className="text-sm font-semibold uppercase tracking-widest text-zinc-900 hidden sm:block">MediaMTX</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-1">
            <button 
              onClick={() => setView("dashboard")} 
              className={cn("px-3 py-2 text-sm rounded-md transition-all font-medium", view === "dashboard" ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50")}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setView("logs")} 
              className={cn("px-3 py-2 text-sm rounded-md transition-all font-medium", view === "logs" ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50")}
            >
              System Logs
            </button>
            {user.role === "admin" && (
              <>
                <button 
                  onClick={() => setView("users")} 
                  className={cn("px-3 py-2 text-sm rounded-md transition-all font-medium", view === "users" ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50")}
                >
                  User Management
                </button>
                <button 
                  onClick={() => setView("servers")} 
                  className={cn("px-3 py-2 text-sm rounded-md transition-all font-medium", view === "servers" ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50")}
                >
                  Server Config
                </button>
              </>
            )}
          </div>
          <div className="h-4 w-px bg-zinc-200 hidden md:block"></div>
          <button 
            onClick={() => { localStorage.removeItem("token"); setUser(null); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline font-medium">Log Out</span>
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="flex md:hidden border-b border-zinc-200 overflow-x-auto bg-white">
         <button onClick={() => setView("dashboard")} className={cn("flex-1 px-4 py-3 text-xs font-semibold text-center uppercase tracking-wider", view === "dashboard" ? "text-zinc-900 border-b-2 border-zinc-900" : "text-zinc-400")}>Dash</button>
         <button onClick={() => setView("logs")} className={cn("flex-1 px-4 py-3 text-xs font-semibold text-center uppercase tracking-wider", view === "logs" ? "text-zinc-900 border-b-2 border-zinc-900" : "text-zinc-400")}>Logs</button>
         {user.role === "admin" && (
           <>
             <button onClick={() => setView("users")} className={cn("flex-1 px-4 py-3 text-xs font-semibold text-center uppercase tracking-wider", view === "users" ? "text-zinc-900 border-b-2 border-zinc-900" : "text-zinc-400")}>Users</button>
             <button onClick={() => setView("servers")} className={cn("flex-1 px-4 py-3 text-xs font-semibold text-center uppercase tracking-wider", view === "servers" ? "text-zinc-900 border-b-2 border-zinc-900" : "text-zinc-400")}>Server</button>
           </>
         )}
      </div>

      <main className="flex-1 p-6 md:p-8 max-w-[1200px] w-full mx-auto flex flex-col gap-6">
        <div className="flex items-center gap-2 text-zinc-400 border border-zinc-200 rounded px-3 py-2 bg-white w-fit">
          <Lock size={12} />
          <span className="text-[10px] uppercase font-semibold tracking-wider">E2EE Active · {user.role}</span>
        </div>
        
        {view === "dashboard" && <Dashboard />}
        {view === "logs" && <Logs />}
        {view === "users" && <Users />}
        {view === "servers" && <Servers />}
      </main>
    </div>
  );
}
