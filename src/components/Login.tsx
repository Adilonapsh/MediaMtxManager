import React, { useState } from "react";
import { Lock } from "lucide-react";

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        onLogin(data.user);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Network error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] p-4 font-sans text-[#18181B]">
      <div className="max-w-md w-full bg-white border border-zinc-200 rounded-lg p-8 shadow-sm">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-2xl font-light tracking-tight">Login</h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 max-w-fit">Secure Access</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 rounded text-xs font-medium border border-red-100 flex items-center gap-2">
            <span className="font-mono">ERROR:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-zinc-200 rounded p-2.5 text-sm bg-zinc-50/50 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-zinc-200 rounded p-2.5 text-sm bg-zinc-50/50 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all"
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full mt-2 bg-zinc-900 text-white rounded py-2.5 text-sm font-medium hover:bg-zinc-800 transition-colors flex justify-center items-center gap-2"
          >
            <Lock size={16} />
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
