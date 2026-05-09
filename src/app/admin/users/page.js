"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Search, ShieldAlert, ShieldCheck, Trash2, Loader2 } from "lucide-react";

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    });
    return () => unsub();
  }, []);

  const handleToggleBlock = async (userId, currentStatus) => {
    try {
      setLoadingId(userId);
      await updateDoc(doc(db, "users", userId), {
        isBlocked: !currentStatus
      });
      toast.success(currentStatus ? "User unblocked successfully" : "User blocked successfully");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (userId) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        setLoadingId(userId);
        await deleteDoc(doc(db, "users", userId));
        toast.success("User deleted successfully");
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoadingId(null);
      }
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(search.toLowerCase()) || 
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500 flex flex-col h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-emerald-100/60">Manage students, access controls, and security.</p>
        </div>
        
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="glass-panel overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 text-sm font-semibold text-gray-300">Name</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Email</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Provider</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Last Login</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Status</th>
                <th className="p-4 text-sm font-semibold text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm font-medium text-white">{user.name}</td>
                    <td className="p-4 text-sm text-gray-300">{user.email}</td>
                    <td className="p-4 text-sm text-gray-300 capitalize">
                      <span className="px-2 py-1 rounded bg-white/10 text-xs">{user.provider}</span>
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="p-4 text-sm">
                      {user.isBlocked ? (
                        <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30">
                          Blocked
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleBlock(user.id, user.isBlocked)}
                          disabled={loadingId === user.id}
                          className={`p-2 rounded-lg border transition-all ${user.isBlocked ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/40' : 'bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/40'}`}
                          title={user.isBlocked ? "Unblock User" : "Block User"}
                        >
                          {loadingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (user.isBlocked ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />)}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={loadingId === user.id}
                          className="p-2 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/40 transition-all"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
