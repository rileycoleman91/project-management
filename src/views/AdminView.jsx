import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { listProfiles, updateProfileRole } from "../lib/api";

export default function AdminView() {
  const { profile: myProfile } = useAuth();
  const [profiles, setProfiles] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setProfiles(await listProfiles());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRoleChange = async (id, role) => {
    setError("");
    try {
      await updateProfileRole(id, role);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <div className="bg-white border border-stone-200 rounded-md">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center gap-2">
          <ShieldCheck size={15} className="text-orange-600" />
          <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase">Staff Accounts</h2>
        </div>
        {error && <div className="px-5 py-3 f-body text-sm text-red-600">{error}</div>}
        {!profiles ? (
          <div className="p-6 f-body text-sm text-stone-400">Loading…</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {profiles.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="f-body text-sm text-stone-800 truncate">{p.fullName || p.email}</div>
                  <div className="f-mono text-[11px] text-stone-400 truncate">{p.email}</div>
                </div>
                <select
                  value={p.role}
                  disabled={p.id === myProfile?.id}
                  onChange={(e) => handleRoleChange(p.id, e.target.value)}
                  className="f-body text-sm border border-stone-300 rounded-md px-2 py-1.5 disabled:opacity-50"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="f-body text-xs text-stone-400">
        New accounts are created from the Supabase dashboard (Authentication → Users) and start as Member. Promote them to Admin here once they've signed in.
      </p>
    </div>
  );
}
