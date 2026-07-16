import React, { useState } from "react";
import { HardHat } from "lucide-react";
import { useAuth } from "./AuthProvider";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 f-body" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-sm bg-white border border-stone-200 rounded-md p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-sm bg-orange-600 flex items-center justify-center shrink-0">
            <HardHat size={18} className="text-white" />
          </div>
          <div className="f-display text-lg tracking-wide text-stone-900 leading-none">SITELINE</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="f-mono text-[11px] uppercase tracking-wide text-stone-500">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 f-body text-sm px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="f-mono text-[11px] uppercase tracking-wide text-stone-500">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 f-body text-sm px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          {error && <div className="f-body text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full f-body text-sm bg-orange-600 text-white px-3.5 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
