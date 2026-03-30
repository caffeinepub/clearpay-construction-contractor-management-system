import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePayGo } from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";
const COLORS = [
  "#28A745",
  "#0078D7",
  "#FFA500",
  "#D32F2F",
  "#6c757d",
  "#17a2b8",
];

export default function PayGoAnalyticsPage() {
  const { projects, contractors, payments } = usePayGo();

  const projectData = projects.map((p) => {
    const paid = payments
      .filter((pmt) => pmt.project === p.name)
      .reduce((s, pmt) => s + pmt.amount, 0);
    const outstanding = Math.max(0, p.budget - paid);
    return {
      name: p.name.length > 12 ? `${p.name.slice(0, 12)}\u2026` : p.name,
      budget: p.budget,
      paid,
      outstanding,
    };
  });

  const tradeMap: Record<string, number> = {};
  for (const c of contractors) {
    tradeMap[c.trade] = (tradeMap[c.trade] || 0) + c.contractingPrice;
  }
  const tradeData = Object.entries(tradeMap).map(([name, value]) => ({
    name,
    value,
  }));

  const accountTotal = payments
    .filter((p) => p.paymentMode === "Account")
    .reduce((s, p) => s + p.amount, 0);
  const cashTotal = payments
    .filter((p) => p.paymentMode === "Cash")
    .reduce((s, p) => s + p.amount, 0);
  const paymentModeData = [
    { name: "Account", value: accountTotal },
    { name: "Cash", value: cashTotal },
  ].filter((d) => d.value > 0);

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const totalContractValue = contractors.reduce(
    (s, c) => s + c.contractingPrice,
    0,
  );

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Budget",
            value: formatINR(totalBudget),
            color: GREEN,
          },
          {
            label: "Total Paid",
            value: formatINR(totalPaid),
            color: "#0078D7",
          },
          {
            label: "Outstanding",
            value: formatINR(Math.max(0, totalBudget - totalPaid)),
            color: "#D32F2F",
          },
          {
            label: "Contract Value",
            value: formatINR(totalContractValue),
            color: "#FFA500",
          },
        ].map((k) => (
          <Card
            key={k.label}
            className="border-l-4"
            style={{ borderLeftColor: k.color }}
          >
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500 font-medium uppercase">
                {k.label}
              </p>
              <p className="text-lg font-bold mt-1" style={{ color: k.color }}>
                {k.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold" style={{ color: GREEN }}>
              Project: Budget vs Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No project data.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={projectData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `\u20b9${(v / 100000).toFixed(0)}L`}
                  />
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                  <Legend />
                  <Bar
                    dataKey="budget"
                    fill="#cce5ff"
                    name="Budget"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="paid"
                    fill={GREEN}
                    name="Paid"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold" style={{ color: GREEN }}>
              Trade-wise Contract Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tradeData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No contractor data.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={tradeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    label={({
                      name,
                      percent,
                    }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {tradeData.map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[idx % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold" style={{ color: GREEN }}>
              Payment Mode Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentModeData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No payment data.
              </p>
            ) : (
              <div className="space-y-4 pt-4">
                {paymentModeData.map((d, i) => {
                  const pct = totalPaid > 0 ? (d.value / totalPaid) * 100 : 0;
                  return (
                    <div key={d.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span
                          className="font-semibold"
                          style={{ color: COLORS[i] }}
                        >
                          {d.name}
                        </span>
                        <span className="text-gray-600">
                          {formatINR(d.value)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div
                          className="h-3 rounded-full"
                          style={{ width: `${pct}%`, background: COLORS[i] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold" style={{ color: GREEN }}>
              Payment Status Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 pt-2">
              {(["Completed", "Pending", "Partial"] as const).map((s) => {
                const items = payments.filter((p) => p.status === s);
                const total = items.reduce((sum, p) => sum + p.amount, 0);
                const color =
                  s === "Completed"
                    ? GREEN
                    : s === "Pending"
                      ? "#FFA500"
                      : "#0078D7";
                return (
                  <div
                    key={s}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: `${color}15` }}
                  >
                    <div>
                      <span className="font-semibold text-sm" style={{ color }}>
                        {s}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {items.length} payments
                      </span>
                    </div>
                    <span className="font-bold" style={{ color }}>
                      {formatINR(total)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
