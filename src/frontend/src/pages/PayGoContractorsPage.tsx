import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Download, Edit2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { type PayGoContractor, usePayGo } from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";
const DEFAULT_PW = "3554";
const TRADES = [
  "NMR",
  "Mason",
  "Bar bending",
  "Scaffolding",
  "M S",
  "Plywood",
  "Cup Lock",
  "Buffing",
];
const UNITS = ["Rft", "Sft", "Cft", "Rmtr", "Smtr", "Cumtr", "Lumsum"];

type FormData = Omit<PayGoContractor, "id">;

const emptyForm = (): FormData => ({
  name: "",
  trade: "Mason",
  project: "",
  contractingPrice: 0,
  unit: "Sft",
  contact: "",
  email: "",
  address: "",
  notes: "",
  status: "Active",
});

export default function PayGoContractorsPage() {
  const {
    projects,
    contractors,
    addContractor,
    updateContractor,
    deleteContractor,
  } = usePayGo();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PayGoContractor | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [search, setSearch] = useState("");

  const filtered = contractors.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.trade.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormOpen(true);
  };
  const openEdit = (c: PayGoContractor) => {
    setEditItem(c);
    setForm({
      name: c.name,
      trade: c.trade,
      project: c.project,
      contractingPrice: c.contractingPrice,
      unit: c.unit,
      contact: c.contact,
      email: c.email,
      address: c.address,
      notes: c.notes,
      status: c.status,
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (editItem) {
      updateContractor({ ...editItem, ...form });
      toast.success("Contractor updated.");
    } else {
      addContractor(form);
      toast.success("Contractor added.");
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (pw !== DEFAULT_PW) {
      toast.error("Invalid password.");
      return;
    }
    if (deleteId) deleteContractor(deleteId);
    toast.success("Contractor deleted.");
    setDeleteId(null);
    setPw("");
  };

  const exportCSV = () => {
    const headers = [
      "Name",
      "Trade",
      "Project",
      "Contracting Price",
      "Unit",
      "Contact",
      "Email",
      "Status",
    ];
    const rows = contractors.map((c) => [
      c.name,
      c.trade,
      c.project,
      c.contractingPrice,
      c.unit,
      c.contact,
      c.email,
      c.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "paygo-contractors.csv";
    a.click();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={openAdd}
            size="sm"
            style={{ background: GREEN, color: "#fff" }}
            data-ocid="paygo.contractors.primary_button"
          >
            <Plus className="h-4 w-4 mr-1" /> New Contractor
          </Button>
          <Button
            onClick={exportCSV}
            size="sm"
            variant="outline"
            data-ocid="paygo.contractors.secondary_button"
          >
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
        <input
          type="text"
          placeholder="Search contractors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
          data-ocid="paygo.contractors.search_input"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: GREEN }}>
              {[
                "#",
                "Name",
                "Trade",
                "Project",
                "Contracting Price",
                "Unit",
                "Contact",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-white font-semibold text-xs uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-gray-400"
                  data-ocid="paygo.contractors.empty_state"
                >
                  No contractors found.
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr
                  key={c.id}
                  style={{ background: i % 2 === 0 ? "#f0fff4" : "#fff" }}
                  data-ocid={`paygo.contractors.item.${i + 1}`}
                >
                  <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2 font-semibold text-gray-800">
                    {c.name}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{c.trade}</td>
                  <td className="px-4 py-2 text-gray-600">{c.project}</td>
                  <td className="px-4 py-2 font-medium">
                    {formatINR(c.contractingPrice)}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{c.unit}</td>
                  <td className="px-4 py-2 text-gray-600">{c.contact}</td>
                  <td className="px-4 py-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background:
                          c.status === "Active" ? "#d4edda" : "#e2e3e5",
                        color: c.status === "Active" ? "#155724" : "#383d41",
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        title="Edit"
                        data-ocid={`paygo.contractors.edit_button.${i + 1}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteId(c.id);
                          setPw("");
                        }}
                        title="Delete"
                        data-ocid={`paygo.contractors.delete_button.${i + 1}`}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg" data-ocid="paygo.contractors.modal">
          <DialogHeader>
            <DialogTitle style={{ color: GREEN }}>
              {editItem ? "Edit Contractor" : "New Contractor"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label className="text-xs font-semibold">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Contractor Name"
                data-ocid="paygo.contractors.input"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Trade</Label>
              <Select
                value={form.trade}
                onValueChange={(v) => setForm((f) => ({ ...f, trade: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Project</Label>
              <Select
                value={form.project}
                onValueChange={(v) => setForm((f) => ({ ...f, project: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="-">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">
                Contracting Price (₹)
              </Label>
              <Input
                type="number"
                value={form.contractingPrice || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    contractingPrice: Number(e.target.value),
                  }))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Unit</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Contact</Label>
              <Input
                value={form.contact}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact: e.target.value }))
                }
                placeholder="Mobile"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="email@example.com"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold">Address</Label>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Address"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    status: v as PayGoContractor["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              data-ocid="paygo.contractors.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              style={{ background: GREEN, color: "#fff" }}
              data-ocid="paygo.contractors.submit_button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <DialogContent data-ocid="paygo.contractors.dialog">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Enter admin password to delete this contractor.
          </p>
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Enter admin password"
            data-ocid="paygo.contractors.input"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              data-ocid="paygo.contractors.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
              data-ocid="paygo.contractors.delete_button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
