import React, { useState, useEffect } from "react";
import { Server, Plus, Trash2, KeyRound, Pencil, X } from "lucide-react";

interface MTXServer {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  hlsUrlBase?: string;
}

export default function Servers() {
  const [servers, setServers] = useState<MTXServer[]>([]);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("http://");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newHlsUrlBase, setNewHlsUrlBase] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingServer, setEditingServer] = useState<MTXServer | null>(null);

  const fetchServers = () => {
    fetch("/api/servers", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(r => r.json())
      .then(data => {
        setServers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingServer) {
      await fetch(`/api/servers/${editingServer.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ 
          name: newName, 
          url: newUrl,
          username: newUsername || undefined,
          password: newPassword || undefined,
          hlsUrlBase: newHlsUrlBase || undefined
        })
      });
      setEditingServer(null);
    } else {
      await fetch("/api/servers", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ 
          name: newName, 
          url: newUrl,
          username: newUsername || undefined,
          password: newPassword || undefined,
          hlsUrlBase: newHlsUrlBase || undefined
        })
      });
    }
    setNewName("");
    setNewUrl("http://");
    setNewUsername("");
    setNewPassword("");
    setNewHlsUrlBase("");
    fetchServers();
  };

  const handleStartEdit = (s: MTXServer) => {
    setEditingServer(s);
    setNewName(s.name);
    setNewUrl(s.url);
    setNewUsername(s.username || "");
    setNewPassword(s.password || "");
    setNewHlsUrlBase(s.hlsUrlBase || "");
  };

  const handleCancelEdit = () => {
    setEditingServer(null);
    setNewName("");
    setNewUrl("http://");
    setNewUsername("");
    setNewPassword("");
    setNewHlsUrlBase("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this server? It will stop monitoring its streams.")) return;
    await fetch(`/api/servers/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    fetchServers();
  };

  if (loading) return <div className="text-sm font-semibold uppercase tracking-widest text-zinc-400 animate-pulse">Loading Servers...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Server size={20} className="text-zinc-400" />
        <h2 className="text-xl font-semibold">MediaMTX Servers</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">Connected Servers</h3>
          <div className="border border-zinc-200 bg-white rounded">
            {servers.length === 0 ? (
               <div className="p-4 text-sm text-zinc-400 text-center">No servers configured.</div>
            ) : (
                servers.map((s, idx) => (
                <div key={s.id} className={`p-4 flex justify-between items-center ${idx !== servers.length - 1 ? "border-b border-zinc-100" : ""}`}>
                    <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                        {s.name}
                        {s.username && <KeyRound size={12} className="text-zinc-400" title="Auth enabled" />}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5">{s.url}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleStartEdit(s)} className="p-1.5 text-zinc-400 hover:text-zinc-900 transition-colors rounded hover:bg-zinc-100" title="Edit Server">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors rounded hover:bg-red-50" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">
            {editingServer ? "Edit Server Node" : "Add Server Node"}
          </h3>
          <form onSubmit={handleSubmit} className="border border-zinc-200 bg-white rounded p-5 space-y-4">
             <div className="space-y-1.5">
               <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Server Identifier</label>
               <input 
                 type="text" 
                 value={newName}
                 onChange={e => setNewName(e.target.value)}
                 placeholder="e.g. Area 51 Main"
                 className="w-full border border-zinc-200 rounded p-2 text-sm bg-zinc-50/50 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all"
                 required
               />
             </div>
             <div className="space-y-1.5">
               <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Paths API URL</label>
               <input 
                 type="url" 
                 value={newUrl}
                 onChange={e => setNewUrl(e.target.value)}
                 placeholder="http://103.171.84.156:9998/v3/paths/list"
                 className="w-full border border-zinc-200 rounded p-2 text-sm font-mono bg-zinc-50/50 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all"
                 required
               />
             </div>
             <div className="space-y-1.5">
               <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Streaming / Player URL Base <span className="opacity-50">(Optional)</span></label>
                  <span className="text-[9px] text-zinc-400 bg-zinc-50 px-1 py-0.5 rounded font-medium">Default: port 8888</span>
               </div>
               <input 
                 type="url" 
                 value={newHlsUrlBase}
                 onChange={e => setNewHlsUrlBase(e.target.value)}
                 placeholder="e.g. http://103.171.84.156:8888"
                 className="w-full border border-zinc-200 rounded p-2 text-sm font-mono bg-zinc-50/50 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all"
               />
               <p className="text-[10px] text-zinc-400">Digunakan untuk login preview / iframe player. Kosongkan jika ingin dideteksi otomatis (cth: mengubah port API control 9998 jadi 8888).</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Basic Auth User <span className="opacity-50">(Optional)</span></label>
                   <input 
                     type="text" 
                     value={newUsername}
                     onChange={e => setNewUsername(e.target.value)}
                     placeholder="admin"
                     className="w-full border border-zinc-200 rounded p-2 text-sm bg-zinc-50/50 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all"
                   />
                 </div>
                 <div className="space-y-1.5">
                   <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Password <span className="opacity-50">(Optional)</span></label>
                   <input 
                     type="password" 
                     value={newPassword}
                     onChange={e => setNewPassword(e.target.value)}
                     className="w-full border border-zinc-200 rounded p-2 text-sm bg-zinc-50/50 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all"
                   />
                 </div>
             </div>
             <div className="flex gap-2">
               {editingServer && (
                 <button type="button" onClick={handleCancelEdit} className="flex-1 bg-zinc-100 text-zinc-700 rounded py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors">
                    <X size={16} /> Cancel
                 </button>
               )}
               <button type="submit" className="flex-1 bg-zinc-900 text-white rounded py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors">
                  {editingServer ? <Pencil size={16} /> : <Plus size={16} />} 
                  {editingServer ? "Save Changes" : "Add Server"}
               </button>
             </div>
          </form>
        </div>
      </div>
    </div>
  );
}
