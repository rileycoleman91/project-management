import React from "react";
import { DollarSign, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { useData } from "../data/DataProvider";
import { StatCard } from "../components/ui";
import { fmtMoney, fmtMoneyShort } from "../lib/format";

export default function BudgetView({ goProject }) {
  const { projects } = useData();
  const totalBudget = projects.reduce((s, p) => s + p.budgetTotal, 0);
  const totalSpent = projects.reduce((s, p) => s + p.budgetSpent, 0);
  const chartData = projects.map((p) => ({ name: p.name.split(" ")[0], Budgeted: p.budgetTotal, Spent: p.budgetSpent }));

  return (
    <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={DollarSign} label="Total Contracted" value={fmtMoneyShort(totalBudget)} accent="text-blue-700" />
        <StatCard icon={TrendingUp} label="Total Committed" value={fmtMoneyShort(totalSpent)} sub={totalBudget ? `${Math.round((totalSpent / totalBudget) * 100)}% of portfolio` : undefined} />
        <StatCard icon={DollarSign} label="Remaining" value={fmtMoneyShort(totalBudget - totalSpent)} accent="text-green-700" />
      </div>

      <div className="bg-white border border-stone-200 rounded-md p-4 sm:p-5">
        <h2 className="f-display text-sm tracking-wide text-stone-800 uppercase mb-4">Budgeted vs. Committed by Project</h2>
        <div className="overflow-x-auto">
        <div className="min-w-[480px]">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#a8a29e" />
            <YAxis tickFormatter={fmtMoneyShort} tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} stroke="#a8a29e" />
            <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 6 }} />
            <Bar dataKey="Budgeted" fill="#d6d3d1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Spent" fill="#ea580c" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-md overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="f-mono text-[10px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
              <td className="px-5 py-2">Project</td>
              <td className="px-5 py-2 hidden sm:table-cell">Budgeted</td>
              <td className="px-5 py-2 hidden sm:table-cell">Committed</td>
              <td className="px-5 py-2 hidden md:table-cell">Remaining</td>
              <td className="px-5 py-2">% Spent</td>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const pctSpent = p.budgetTotal ? Math.round((p.budgetSpent / p.budgetTotal) * 100) : 0;
              const watch = pctSpent - p.percentComplete > 8;
              return (
                <tr key={p.id} className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50 cursor-pointer" onClick={() => goProject(p.id)}>
                  <td className="px-5 py-3 f-body text-sm text-stone-800 font-medium">{p.name}</td>
                  <td className="px-5 py-3 f-mono text-xs text-stone-600 hidden sm:table-cell">{fmtMoney(p.budgetTotal)}</td>
                  <td className="px-5 py-3 f-mono text-xs text-stone-600 hidden sm:table-cell">{fmtMoney(p.budgetSpent)}</td>
                  <td className="px-5 py-3 f-mono text-xs text-stone-600 hidden md:table-cell">{fmtMoney(p.budgetTotal - p.budgetSpent)}</td>
                  <td className="px-5 py-3">
                    <span className={`f-mono text-xs px-1.5 py-0.5 rounded ${watch ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-600"}`}>{pctSpent}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
