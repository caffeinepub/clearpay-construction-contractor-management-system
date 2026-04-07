import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type BOQCategory,
  type BOQItem,
  type BOQSubCategory,
  type PayGoBOQ,
  usePayGo,
} from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";

const BOQ_UNITS = [
  "Sft",
  "Sqm",
  "Rmt",
  "Cum",
  "Nos",
  "Kg",
  "MT",
  "LS",
  "Mtr",
  "Ltr",
  "Cumtr",
  "Rmtr",
] as const;

type ItemSortKey = "description" | "unit" | "rate" | "amount";

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function calcItemAmount(item: BOQItem): number {
  const nos = item.nos ?? 1;
  const qty = item.isManualQty
    ? item.qty
    : (item.length || 0) * (item.width || 0) * (item.height || 0) * nos || 0;
  return qty * item.rate;
}

function calcSubTotal(sub: BOQSubCategory): number {
  return sub.items.reduce((s, i) => s + calcItemAmount(i), 0);
}

function calcCategoryTotal(cat: BOQCategory): number {
  return cat.subCategories.reduce((s, sc) => s + calcSubTotal(sc), 0);
}

function calcGrandTotal(boq: PayGoBOQ): number {
  return boq.categories.reduce((s, c) => s + calcCategoryTotal(c), 0);
}

const DEFAULT_CATEGORIES = [
  "Earthwork",
  "RCC",
  "Masonry",
  "Finishing",
  "Electrical",
  "Plumbing",
];

export default function PayGoBOQPage() {
  const { projects, boqs, addBOQ, updateBOQ } = usePayGo();
  const [selectedProject, setSelectedProject] = useState("");
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [printOpen, setPrintOpen] = useState(false);
  const [itemSort, setItemSort] = useState<
    Record<string, { key: ItemSortKey; dir: "asc" | "desc" }>
  >({});

  const projectNames = useMemo(() => projects.map((p) => p.name), [projects]);

  const activeBOQ = useMemo(
    () => boqs.find((b) => b.projectName === selectedProject) || null,
    [boqs, selectedProject],
  );

  const grandTotal = useMemo(
    () => (activeBOQ ? calcGrandTotal(activeBOQ) : 0),
    [activeBOQ],
  );

  const handleProjectSelect = (name: string) => {
    setSelectedProject(name);
    if (!boqs.find((b) => b.projectName === name)) {
      const proj = projects.find((p) => p.name === name);
      if (proj) {
        addBOQ({
          projectId: proj.id,
          projectName: name,
          title: `${name} — BOQ`,
          createdDate: new Date().toISOString().split("T")[0],
          categories: DEFAULT_CATEGORIES.map((n, i) => ({
            id: `cat-${i + 1}-${genId()}`,
            name: n,
            isExpanded: i === 0,
            subCategories: [],
          })),
        });
      }
    }
  };

  const updateActive = (updater: (boq: PayGoBOQ) => PayGoBOQ) => {
    if (!activeBOQ) return;
    updateBOQ(updater(activeBOQ));
  };

  const toggleCategory = (catId: string) => {
    updateActive((b) => ({
      ...b,
      categories: b.categories.map((c) =>
        c.id === catId ? { ...c, isExpanded: !c.isExpanded } : c,
      ),
    }));
  };

  const addSubCategory = (catId: string) => {
    const name = prompt("Sub-category name:");
    if (!name?.trim()) return;
    updateActive((b) => ({
      ...b,
      categories: b.categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              subCategories: [
                ...c.subCategories,
                { id: `sc-${genId()}`, name: name.trim(), items: [] },
              ],
            }
          : c,
      ),
    }));
  };

  const deleteSubCategory = (catId: string, subId: string) => {
    updateActive((b) => ({
      ...b,
      categories: b.categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              subCategories: c.subCategories.filter((sc) => sc.id !== subId),
            }
          : c,
      ),
    }));
  };

  const addItem = (catId: string, subId: string) => {
    const newItem: BOQItem = {
      id: `item-${genId()}`,
      description: "New Item",
      unit: "Sft",
      nos: 1,
      length: 0,
      width: 0,
      height: 0,
      qty: 0,
      isManualQty: false,
      rate: 0,
      amount: 0,
    };
    updateActive((b) => ({
      ...b,
      categories: b.categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              subCategories: c.subCategories.map((sc) =>
                sc.id === subId ? { ...sc, items: [...sc.items, newItem] } : sc,
              ),
            }
          : c,
      ),
    }));
  };

  const deleteItem = (catId: string, subId: string, itemId: string) => {
    updateActive((b) => ({
      ...b,
      categories: b.categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              subCategories: c.subCategories.map((sc) =>
                sc.id === subId
                  ? { ...sc, items: sc.items.filter((i) => i.id !== itemId) }
                  : sc,
              ),
            }
          : c,
      ),
    }));
  };

  const updateItemField = (
    catId: string,
    subId: string,
    itemId: string,
    field: string,
    value: string | number | boolean,
  ) => {
    updateActive((b) => ({
      ...b,
      categories: b.categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              subCategories: c.subCategories.map((sc) =>
                sc.id === subId
                  ? {
                      ...sc,
                      items: sc.items.map((item) => {
                        if (item.id !== itemId) return item;
                        const updated = { ...item, [field]: value };
                        const nos = updated.nos ?? 1;
                        const qty = updated.isManualQty
                          ? updated.qty
                          : (updated.length || 0) *
                              (updated.width || 0) *
                              (updated.height || 0) *
                              nos || 0;
                        const amount = qty * updated.rate;
                        return { ...updated, qty, amount };
                      }),
                    }
                  : sc,
              ),
            }
          : c,
      ),
    }));
  };

  const addCategory = () => {
    if (!newCatName.trim() || !activeBOQ) return;
    updateActive((b) => ({
      ...b,
      categories: [
        ...b.categories,
        {
          id: `cat-${genId()}`,
          name: newCatName.trim(),
          isExpanded: true,
          subCategories: [],
        },
      ],
    }));
    setNewCatName("");
    setAddCatOpen(false);
    toast.success("Category added.");
  };

  const deleteCategory = (catId: string) => {
    updateActive((b) => ({
      ...b,
      categories: b.categories.filter((c) => c.id !== catId),
    }));
  };

  const renameSubCategory = (catId: string, subId: string) => {
    if (!activeBOQ) return;
    const sub = activeBOQ.categories
      .find((c) => c.id === catId)
      ?.subCategories.find((sc) => sc.id === subId);
    const name = prompt("Rename sub-category:", sub?.name || "");
    if (!name?.trim()) return;
    updateActive((b) => ({
      ...b,
      categories: b.categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              subCategories: c.subCategories.map((sc) =>
                sc.id === subId ? { ...sc, name: name.trim() } : sc,
              ),
            }
          : c,
      ),
    }));
  };

  const toggleItemSort = (subId: string, key: ItemSortKey) => {
    setItemSort((prev) => {
      const cur = prev[subId];
      if (cur?.key === key) {
        return {
          ...prev,
          [subId]: { key, dir: cur.dir === "asc" ? "desc" : "asc" },
        };
      }
      return { ...prev, [subId]: { key, dir: "asc" } };
    });
  };

  const getSortedItems = (subId: string, items: BOQItem[]): BOQItem[] => {
    const s = itemSort[subId];
    if (!s) return items;
    return [...items].sort((a, b) => {
      let av: string | number = a[s.key] ?? "";
      let bv: string | number = b[s.key] ?? "";
      if (s.key === "amount") {
        av = calcItemAmount(a);
        bv = calcItemAmount(b);
      }
      if (typeof av === "number" && typeof bv === "number") {
        return s.dir === "asc" ? av - bv : bv - av;
      }
      return s.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  };

  const exportCSV = () => {
    if (!activeBOQ) return;
    const rows: string[][] = [
      [
        "Category",
        "Sub-Category",
        "Description",
        "Unit",
        "No's",
        "Length",
        "Width",
        "Height",
        "Qty",
        "Rate",
        "Amount",
      ],
    ];
    for (const cat of activeBOQ.categories) {
      for (const sub of cat.subCategories) {
        for (const item of sub.items) {
          const nos = item.nos ?? 1;
          const qty = item.isManualQty
            ? item.qty
            : (item.length || 0) * (item.width || 0) * (item.height || 0) * nos;
          rows.push([
            cat.name,
            sub.name,
            item.description,
            item.unit,
            String(nos),
            String(item.length),
            String(item.width),
            String(item.height),
            String(qty),
            String(item.rate),
            String(qty * item.rate),
          ]);
        }
      }
    }
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `boq-${selectedProject}.csv`;
    a.click();
    toast.success("BOQ exported as CSV.");
  };

  const toolbarBtnClass =
    "flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors cursor-pointer";

  const SortIndicator = ({
    subId,
    col,
  }: { subId: string; col: ItemSortKey }) => {
    const s = itemSort[subId];
    if (!s || s.key !== col)
      return <ArrowUpDown size={9} className="inline ml-0.5 opacity-30" />;
    return s.dir === "asc" ? (
      <ChevronDown size={9} className="inline ml-0.5" />
    ) : (
      <ChevronRight size={9} className="inline ml-0.5 rotate-[-90deg]" />
    );
  };

  return (
    <div
      className="flex flex-col min-h-full"
      style={{ fontFamily: "'Century Gothic', Arial, sans-serif" }}
    >
      {/* Page header */}
      <div className="bg-white border-b shadow-sm px-4 py-3">
        <h1 className="text-lg font-bold" style={{ color: GREEN }}>
          Bill of Quantities (BOQ)
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Build structured BOQ by category, sub-category, and items
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setPrintOpen(true)}
            className={toolbarBtnClass}
          >
            <Printer size={14} /> Print / Preview
          </button>
          <button
            type="button"
            onClick={exportCSV}
            disabled={!activeBOQ}
            className={toolbarBtnClass}
          >
            <Download size={14} /> Export CSV
          </button>
          {activeBOQ && (
            <button
              type="button"
              onClick={() => setAddCatOpen(true)}
              className="flex items-center gap-1.5 text-white rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm"
              style={{ background: GREEN }}
              data-ocid="paygo.boq.primary_button"
            >
              <Plus size={14} /> Add Category
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">Project:</span>
          <select
            value={selectedProject}
            onChange={(e) => handleProjectSelect(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300 min-w-[180px]"
            data-ocid="paygo.boq.select"
          >
            <option value="">Select a project…</option>
            {projectNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedProject ? (
        <div
          className="flex-1 flex items-center justify-center p-12"
          data-ocid="paygo.boq.empty_state"
        >
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm font-medium">
              Select a project to view or build its BOQ
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 gap-0 overflow-hidden">
          {/* Main BOQ table */}
          <div className="flex-1 overflow-auto px-4 py-3">
            {activeBOQ && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {activeBOQ.categories.map((cat) => (
                  <div key={cat.id} className="border-b last:border-b-0">
                    {/* Category row */}
                    <div
                      className="flex items-center justify-between px-3 py-2 cursor-pointer"
                      style={{ background: "#E8F5E9" }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className="flex items-center gap-2 font-bold text-sm flex-1 text-left"
                        style={{ color: GREEN }}
                      >
                        {cat.isExpanded ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                        {cat.name}
                        <span className="text-xs font-normal text-gray-500 ml-2">
                          ({cat.subCategories.length} sub-categories)
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-bold"
                          style={{ color: GREEN }}
                        >
                          {formatINR(calcCategoryTotal(cat))}
                        </span>
                        <button
                          type="button"
                          onClick={() => addSubCategory(cat.id)}
                          className="text-xs px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50"
                        >
                          + Sub-Category
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCategory(cat.id)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Sub-categories */}
                    {cat.isExpanded &&
                      cat.subCategories.map((sub) => {
                        const sortedItems = getSortedItems(sub.id, sub.items);
                        const srt = itemSort[sub.id];
                        return (
                          <div key={sub.id}>
                            {/* Sub-category header */}
                            <div
                              className="flex items-center justify-between px-6 py-1.5"
                              style={{ background: "#EDF7FF" }}
                            >
                              <span className="text-xs font-semibold text-blue-700">
                                {sub.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-blue-800">
                                  {formatINR(calcSubTotal(sub))}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    renameSubCategory(cat.id, sub.id)
                                  }
                                  className="text-blue-400 hover:text-blue-600"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addItem(cat.id, sub.id)}
                                  className="text-xs px-2 py-0.5 rounded border border-blue-300 text-blue-700 hover:bg-blue-50"
                                >
                                  + Item
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteSubCategory(cat.id, sub.id)
                                  }
                                  className="text-red-400 hover:text-red-600"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>

                            {/* Items table */}
                            {sub.items.length > 0 && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-t">
                                      {(
                                        [
                                          ["#", null],
                                          ["Description", "description"],
                                          ["Unit", "unit"],
                                          ["No's", null],
                                          ["Length", null],
                                          ["Width", null],
                                          ["Height", null],
                                          ["Qty", null],
                                          ["Mode", null],
                                          ["Rate", "rate"],
                                          ["Amount", "amount"],
                                          ["", null],
                                        ] as [string, ItemSortKey | null][]
                                      ).map(([h, k]) => (
                                        <th
                                          key={`${sub.id}-${h}`}
                                          className="px-2 py-1.5 text-left text-gray-600 font-semibold whitespace-nowrap"
                                          style={{
                                            cursor: k ? "pointer" : "default",
                                          }}
                                          onClick={() =>
                                            k && toggleItemSort(sub.id, k)
                                          }
                                          onKeyDown={(e) =>
                                            e.key === "Enter" &&
                                            k &&
                                            toggleItemSort(sub.id, k)
                                          }
                                        >
                                          {h}
                                          {k && (
                                            <SortIndicator
                                              subId={sub.id}
                                              col={k}
                                            />
                                          )}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sortedItems.map((item, idx) => {
                                      const nos = item.nos ?? 1;
                                      const qty = item.isManualQty
                                        ? item.qty
                                        : (item.length || 0) *
                                            (item.width || 0) *
                                            (item.height || 0) *
                                            nos || 0;
                                      const amount = qty * item.rate;
                                      return (
                                        <tr
                                          key={item.id}
                                          className="border-b hover:bg-yellow-50"
                                          data-ocid={`paygo.boq.item.${idx + 1}`}
                                        >
                                          <td className="px-2 py-1.5 text-gray-400">
                                            {idx + 1}
                                          </td>

                                          {/* Description */}
                                          <td className="px-2 py-1.5">
                                            <input
                                              value={item.description}
                                              onChange={(e) =>
                                                updateItemField(
                                                  cat.id,
                                                  sub.id,
                                                  item.id,
                                                  "description",
                                                  e.target.value,
                                                )
                                              }
                                              className="w-full border-0 bg-transparent text-gray-700 focus:outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5 min-w-[120px]"
                                            />
                                          </td>

                                          {/* Unit dropdown */}
                                          <td className="px-2 py-1.5">
                                            <select
                                              value={item.unit}
                                              onChange={(e) =>
                                                updateItemField(
                                                  cat.id,
                                                  sub.id,
                                                  item.id,
                                                  "unit",
                                                  e.target.value,
                                                )
                                              }
                                              className="w-20 border border-gray-200 bg-white text-gray-700 text-xs rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
                                            >
                                              {BOQ_UNITS.map((u) => (
                                                <option key={u} value={u}>
                                                  {u}
                                                </option>
                                              ))}
                                            </select>
                                          </td>

                                          {/* No's */}
                                          <td className="px-2 py-1.5">
                                            <input
                                              type="number"
                                              value={nos || ""}
                                              onChange={(e) =>
                                                updateItemField(
                                                  cat.id,
                                                  sub.id,
                                                  item.id,
                                                  "nos",
                                                  Number(e.target.value),
                                                )
                                              }
                                              disabled={item.isManualQty}
                                              className="w-14 border-0 bg-transparent text-center text-orange-700 font-semibold focus:outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5 disabled:text-gray-300"
                                              min={1}
                                            />
                                          </td>

                                          {/* Length */}
                                          <td className="px-2 py-1.5">
                                            <input
                                              type="number"
                                              value={item.length || ""}
                                              onChange={(e) =>
                                                updateItemField(
                                                  cat.id,
                                                  sub.id,
                                                  item.id,
                                                  "length",
                                                  Number(e.target.value),
                                                )
                                              }
                                              disabled={item.isManualQty}
                                              className="w-14 border-0 bg-transparent text-center text-gray-700 focus:outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5 disabled:text-gray-300"
                                            />
                                          </td>

                                          {/* Width */}
                                          <td className="px-2 py-1.5">
                                            <input
                                              type="number"
                                              value={item.width || ""}
                                              onChange={(e) =>
                                                updateItemField(
                                                  cat.id,
                                                  sub.id,
                                                  item.id,
                                                  "width",
                                                  Number(e.target.value),
                                                )
                                              }
                                              disabled={item.isManualQty}
                                              className="w-14 border-0 bg-transparent text-center text-gray-700 focus:outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5 disabled:text-gray-300"
                                            />
                                          </td>

                                          {/* Height */}
                                          <td className="px-2 py-1.5">
                                            <input
                                              type="number"
                                              value={item.height || ""}
                                              onChange={(e) =>
                                                updateItemField(
                                                  cat.id,
                                                  sub.id,
                                                  item.id,
                                                  "height",
                                                  Number(e.target.value),
                                                )
                                              }
                                              disabled={item.isManualQty}
                                              className="w-14 border-0 bg-transparent text-center text-gray-700 focus:outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5 disabled:text-gray-300"
                                            />
                                          </td>

                                          {/* Qty */}
                                          <td className="px-2 py-1.5">
                                            {item.isManualQty ? (
                                              <input
                                                type="number"
                                                value={item.qty || ""}
                                                onChange={(e) =>
                                                  updateItemField(
                                                    cat.id,
                                                    sub.id,
                                                    item.id,
                                                    "qty",
                                                    Number(e.target.value),
                                                  )
                                                }
                                                className="w-16 border-0 bg-transparent text-center font-semibold text-blue-700 focus:outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5"
                                              />
                                            ) : (
                                              <span className="text-blue-700 font-semibold">
                                                {qty.toFixed(2)}
                                              </span>
                                            )}
                                          </td>

                                          {/* Mode (Auto/Manual toggle) */}
                                          <td className="px-2 py-1.5">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateItemField(
                                                  cat.id,
                                                  sub.id,
                                                  item.id,
                                                  "isManualQty",
                                                  !item.isManualQty,
                                                )
                                              }
                                              className="text-xs px-1.5 py-0.5 rounded border transition-colors"
                                              style={{
                                                background: item.isManualQty
                                                  ? "#FFF3E0"
                                                  : "#E8F5E9",
                                                borderColor: item.isManualQty
                                                  ? "#FF8A65"
                                                  : GREEN,
                                                color: item.isManualQty
                                                  ? "#E64A19"
                                                  : GREEN,
                                              }}
                                              title={
                                                item.isManualQty
                                                  ? "Switch to auto (L×W×H×No's)"
                                                  : "Switch to manual qty"
                                              }
                                            >
                                              {item.isManualQty
                                                ? "Manual"
                                                : "Auto"}
                                            </button>
                                          </td>

                                          {/* Rate */}
                                          <td className="px-2 py-1.5">
                                            <input
                                              type="number"
                                              value={item.rate || ""}
                                              onChange={(e) =>
                                                updateItemField(
                                                  cat.id,
                                                  sub.id,
                                                  item.id,
                                                  "rate",
                                                  Number(e.target.value),
                                                )
                                              }
                                              className="w-20 border-0 bg-transparent text-center text-gray-700 focus:outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-1 py-0.5"
                                            />
                                          </td>

                                          {/* Amount */}
                                          <td
                                            className="px-2 py-1.5 font-semibold whitespace-nowrap"
                                            style={{ color: GREEN }}
                                          >
                                            {formatINR(amount)}
                                          </td>

                                          {/* Delete */}
                                          <td className="px-2 py-1.5">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                deleteItem(
                                                  cat.id,
                                                  sub.id,
                                                  item.id,
                                                )
                                              }
                                              className="text-red-400 hover:text-red-600"
                                            >
                                              <X size={12} />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-blue-50">
                                      <td
                                        colSpan={10}
                                        className="px-2 py-1.5 text-xs font-semibold text-blue-700 text-right"
                                      >
                                        Sub-Total:
                                      </td>
                                      <td className="px-2 py-1.5 font-bold text-blue-800 whitespace-nowrap">
                                        {formatINR(calcSubTotal(sub))}
                                      </td>
                                      <td />
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                            {sub.items.length === 0 && (
                              <div className="pl-12 py-2 text-xs text-gray-400 italic">
                                No items yet — click &quot;+ Item&quot; to add
                              </div>
                            )}
                            {/* Sort hint when items exist */}
                            {sub.items.length > 1 && srt && (
                              <div className="pl-6 pb-1 text-xs text-gray-400 italic">
                                Sorted by {srt.key} ({srt.dir})
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {cat.isExpanded && cat.subCategories.length === 0 && (
                      <div className="pl-6 py-2 text-xs text-gray-400 italic">
                        No sub-categories yet — click &quot;+ Sub-Category&quot;
                        to add
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Summary Panel */}
          <div className="w-72 border-l bg-white p-4 shrink-0 overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              Project Budget Summary
            </h3>
            {activeBOQ ? (
              <>
                <div className="space-y-2">
                  {activeBOQ.categories.map((cat) => (
                    <div key={cat.id} className="flex justify-between text-xs">
                      <span className="text-gray-600 truncate flex-1 mr-2">
                        {cat.name}
                      </span>
                      <span className="font-semibold text-gray-800 shrink-0">
                        {formatINR(calcCategoryTotal(cat))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t pt-3">
                  <div
                    className="rounded-xl p-4 text-center"
                    style={{
                      background: "linear-gradient(135deg, #1B5E20, #2E7D32)",
                    }}
                  >
                    <div className="text-xs text-green-200 font-medium mb-1">
                      Total Project Budget
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {formatINR(grandTotal)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-400 text-center">
                  {activeBOQ.categories.reduce(
                    (s, c) =>
                      s +
                      c.subCategories.reduce(
                        (ss, sc) => ss + sc.items.length,
                        0,
                      ),
                    0,
                  )}{" "}
                  items across {activeBOQ.categories.length} categories
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Select a project to see summary
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add Category Dialog */}
      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent className="max-w-sm" data-ocid="paygo.boq.dialog">
          <DialogHeader>
            <DialogTitle style={{ color: GREEN }}>Add Category</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-semibold">Category Name</Label>
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Structural Works"
              onKeyDown={(e) => {
                if (e.key === "Enter") addCategory();
              }}
              data-ocid="paygo.boq.input"
            />
            <div className="mt-2">
              <span className="text-xs text-gray-400">Common: </span>
              {DEFAULT_CATEGORIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setNewCatName(d)}
                  className="text-xs mr-1 mb-1 px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-100"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setAddCatOpen(false)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              data-ocid="paygo.boq.cancel_button"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addCategory}
              className="rounded-md px-3 py-1.5 text-sm text-white font-semibold"
              style={{ background: GREEN }}
              data-ocid="paygo.boq.submit_button"
            >
              Add
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Preview Dialog */}
      {activeBOQ && (
        <Dialog open={printOpen} onOpenChange={setPrintOpen}>
          <DialogContent
            className="max-w-4xl max-h-[90vh] overflow-y-auto"
            data-ocid="paygo.boq.modal"
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-base font-bold" style={{ color: GREEN }}>
                BOQ Report — {activeBOQ.projectName}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-xs px-3 py-1.5 rounded border hover:bg-gray-100"
                >
                  <Printer size={12} className="inline mr-1" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setPrintOpen(false)}
                  className="p-1 hover:bg-red-50 rounded text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* BOQ Header */}
            <div className="text-center py-3 border-b">
              <div className="text-lg font-bold text-gray-800">
                MPH Developers
              </div>
              <div className="text-sm font-semibold text-gray-600">
                Bill of Quantities
              </div>
              <div className="text-sm text-gray-500">
                {activeBOQ.projectName}
              </div>
              <div className="text-xs text-gray-400">
                Generated: {new Date().toLocaleDateString("en-IN")}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="mt-3">
              {activeBOQ.categories.map((cat) => (
                <div key={cat.id} className="mb-4">
                  <div
                    className="px-3 py-2 font-bold text-sm"
                    style={{ background: "#E8F5E9", color: GREEN }}
                  >
                    {cat.name}
                  </div>
                  {cat.subCategories.map((sub) => (
                    <div key={sub.id}>
                      <div className="px-4 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700">
                        {sub.name}
                      </div>
                      {sub.items.length > 0 && (
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-200 px-2 py-1 text-left">
                                Description
                              </th>
                              <th className="border border-gray-200 px-2 py-1 text-center">
                                Unit
                              </th>
                              <th className="border border-gray-200 px-2 py-1 text-center">
                                No's
                              </th>
                              <th className="border border-gray-200 px-2 py-1 text-right">
                                Qty
                              </th>
                              <th className="border border-gray-200 px-2 py-1 text-right">
                                Rate (₹)
                              </th>
                              <th className="border border-gray-200 px-2 py-1 text-right">
                                Amount (₹)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sub.items.map((item) => {
                              const nos = item.nos ?? 1;
                              const qty = item.isManualQty
                                ? item.qty
                                : (item.length || 0) *
                                    (item.width || 0) *
                                    (item.height || 0) *
                                    nos || 0;
                              return (
                                <tr key={item.id}>
                                  <td className="border border-gray-200 px-2 py-1">
                                    {item.description}
                                  </td>
                                  <td className="border border-gray-200 px-2 py-1 text-center">
                                    {item.unit}
                                  </td>
                                  <td className="border border-gray-200 px-2 py-1 text-center">
                                    {nos}
                                  </td>
                                  <td className="border border-gray-200 px-2 py-1 text-right">
                                    {qty.toFixed(2)}
                                  </td>
                                  <td className="border border-gray-200 px-2 py-1 text-right">
                                    {item.rate.toLocaleString("en-IN")}
                                  </td>
                                  <td className="border border-gray-200 px-2 py-1 text-right font-semibold">
                                    {(qty * item.rate).toLocaleString("en-IN")}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-blue-50">
                              <td
                                colSpan={5}
                                className="border border-gray-200 px-2 py-1 text-right font-bold text-blue-700"
                              >
                                Sub-Total:
                              </td>
                              <td className="border border-gray-200 px-2 py-1 text-right font-bold text-blue-800">
                                {formatINR(calcSubTotal(sub))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  ))}
                  <div
                    className="text-right pr-2 py-1 text-xs font-bold"
                    style={{ color: GREEN }}
                  >
                    {cat.name} Total: {formatINR(calcCategoryTotal(cat))}
                  </div>
                </div>
              ))}
            </div>

            {/* Grand total */}
            <div
              className="mt-4 rounded-xl p-4 text-center"
              style={{
                background: "linear-gradient(135deg, #1B5E20, #2E7D32)",
              }}
            >
              <div className="text-sm text-green-200 font-medium">
                Total Project Budget
              </div>
              <div className="text-3xl font-bold text-white mt-1">
                {formatINR(grandTotal)}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
