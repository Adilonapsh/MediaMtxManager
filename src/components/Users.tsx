import React, { useState, useEffect } from "react";
import { Users as UsersIcon, Plus, Trash2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  role: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    fetch("/api/users", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(r => r.json())
      .then(data => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/users", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
    });
    setNewUsername("");
    setNewPassword("");
    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    fetchUsers();
  };

  if (loading) return <div className="text-sm font-semibold uppercase tracking-widest text-zinc-400 animate-pulse">Loading Users...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UsersIcon size={20} className="text-zinc-400" />
        <h2 className="text-xl font-semibold">User Management</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">Account List</h3>
          <div className="border border-zinc-200 bg-white rounded">
            {users.map((u, idx) => (
              <div key={u.id} className={`p-4 flex justify-between items-center ${idx !== users.length - 1 ? "border-b border-zinc-100" : ""}`}>
                <div>
                  <div className="text-sm font-medium">{u.username}</div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mt-0.5">{u.role}</div>
                </div>
                {u.username !== "admin" && (
                  <button onClick={() => handleDelete(u.id)} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors rounded hover:bg-red-50" title="Delete">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">New User</h3>
          <form onSubmit={handleAdd} className="border border-zinc-200 bg-white rounded p-5 space-y-4">
             <div className="space-y-1.5">
               <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Username</label>
               <input 
                 type="text" 
                 value={newUsername}
                 onChange={e => setNewUsername(e.target.value)}
                 className="w-full border border-zinc-200 rounded p-2 text-sm bg-zinc-50/50 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all"
                 required
               />
             </div>
             <div className="space-y-1.5">
               <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Password</label>
               <input 
                 type="password" 
                 value={newPassword}
                 onChange={e => setNewPassword(e.target.value)}
                 className="w-full border border-zinc-200 rounded p-2 text-sm bg-zinc-50/50 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all"
                 required
               />
             </div>
             <div className="space-y-1.5">
               <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Role</label>
               <select 
                 value={newRole}
                 onChange={e => setNewRole(e.target.value)}
                 className="w-full border border-zinc-200 rounded p-2 text-sm bg-zinc-50/50 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all"
               >
                 <option value="user">User</option>
                 <option value="admin">Admin</option>
               </select>
             </div>
             <button type="submit" className="w-full mt-2 bg-zinc-900 text-white rounded py-2 text-sm font-medium flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors">
                <Plus size={16} /> Add User
             </button>
          </form>
        </div>
      </div>
    </div>
  );
}
