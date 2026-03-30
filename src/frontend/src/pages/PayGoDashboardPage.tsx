import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CreditCard, TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePayGo } from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";

export default function PayGoDashboardPage() {
  const { projects, payments } = usePayGo();

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "Active").length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = totalBudget - totalPayments;
  const completedPayments = payments
    .filter((p) => p.status === "Completed")
    .reduce((s, p) => s + p.amount, 0);
  const pendingPayments = payments
    .filter((p) => p.status === "Pending")
    .reduce((s, p) => s + p.amount, 0);

  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleString("en-IN", {
      month: "short",
      year: "2-digit",
    });
    const total = payments
      .filter((p) => {
        const pd = new Date(p.date);
        return (
          pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth()
        );
      })
      .reduce((s, p) => s + p.amount, 0);
    return { month: label, amount: total };
  });

  const summaryCards = [
    {
      label: "Total Projects",
      value: String(totalProjects),
      sub: `${activeProjects} active`,
      icon: Building2,
      color: GREEN,
    },
    {
      label: "Total Budget",
      value: formatINR(totalBudget),
      sub: "Contracted value",
      icon: TrendingUp,
      color: "#0078D7",
    },
    {
      label: "Total Payments",
      value: formatINR(completedPayments),
      sub: `${payments.filter((p) => p.status === "Completed").length} completed`,
      icon: CreditCard,
      color: GREEN,
    },
    {
      label: "Outstanding",
      value: formatINR(Math.max(0, totalOutstanding)),
      sub: `${formatINR(pendingPayments)} pending`,
      icon: TrendingDown,
      color: pendingPayments > 0 ? "#D32F2F" : GREEN,
    },
  ];

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="border-l-4"
              style={{ borderLeftColor: card.color }}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      {card.label}
                    </p>
                    <p
                      className="text-lg font-bold mt-1"
                      style={{ color: card.color }}
                    >
                      {card.value}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                  </div>
                  <div
                    className="rounded-full p-2"
                    style={{ background: `${card.color}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: card.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold" style={{ color: GREEN }}>
              Monthly Payments (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={monthlyData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#555" }} />
                <YAxis
                  tick={{ fontSize: 10, fill: "#555" }}
                  tickFormatter={(v) => `\u20b9${(v / 100000).toFixed(0)}L`}
                />
                <Tooltip
                  formatter={(v: number) => formatINR(v)}
                  labelStyle={{ fontSize: 12 }}
                />
                <Bar
                  dataKey="amount"
                  fill={GREEN}
                  radius={[4, 4, 0, 0]}
                  name="Payments"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold" style={{ color: GREEN }}>
              Project Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projects.map((project) => {
                const projectPayments = payments.filter(
                  (p) => p.project === project.name,
                );
                const paid = projectPayments.reduce((s, p) => s + p.amount, 0);
                const pct =
                  project.budget > 0
                    ? Math.min(100, Math.round((paid / project.budget) * 100))
                    : 0;
                return (
                  <div key={project.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700 truncate">
                          {project.name}
                        </span>
                        <span className="text-xs text-gray-500">{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background:
                              project.status === "Completed"
                                ? "#6c757d"
                                : GREEN,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-400">
                          {formatINR(paid)} paid
                        </span>
                        <span
                          className="text-xs"
                          style={{
                            color:
                              project.status === "Active" ? GREEN : "#6c757d",
                          }}
                        >
                          {project.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {projects.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No projects yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold" style={{ color: GREEN }}>
            Recent Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentPayments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No payments yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {[
                    "Payment No",
                    "Project",
                    "Date",
                    "Amount",
                    "Mode",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{ background: i % 2 === 0 ? "#f0fff4" : "#fff" }}
                  >
                    <td
                      className="px-4 py-2 font-medium"
                      style={{ color: GREEN }}
                    >
                      {p.paymentNo}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{p.project}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {p.date.split("-").reverse().join("-")}
                    </td>
                    <td className="px-4 py-2 font-semibold">
                      {formatINR(p.amount)}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{p.paymentMode}</td>
                    <td className="px-4 py-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background:
                            p.status === "Completed"
                              ? "#d4edda"
                              : p.status === "Pending"
                                ? "#fff3cd"
                                : "#cce5ff",
                          color:
                            p.status === "Completed"
                              ? "#155724"
                              : p.status === "Pending"
                                ? "#856404"
                                : "#004085",
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
