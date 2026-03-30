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
import { type PayGoProject, usePayGo } from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";
const DEFAULT_PW = "3554";

type FormData = Omit<PayGoProject, "id">;

const emptyForm = (): FormData => ({
  name: "",
  client: "",
  startDate: "",
  endDate: "",
  budget: 0,
  status: "Active",
  notes: "",
});

export default function PayGoProjectsPage() {
  const { projects, addProject, updateProject, deleteProject } = usePayGo();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PayGoProject | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [search, setSearch] = useState("");

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (p: PayGoProject) => {
    setEditItem(p);
    setForm({
      name: p.name,
      client: p.client,
      startDate: p.startDate,
      endDate: p.endDate,
      budget: p.budget,
      status: p.status,
      notes: p.notes,
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.client.trim()) {
      toast.error("Project Name and Client are required.");
      return;
    }
    if (editItem) {
      updateProject({ ...editItem, ...form });
      toast.success("Project updated.");
    } else {
      addProject(form);
      toast.success("Project added.");
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (pw !== DEFAULT_PW) {
      toast.error("Invalid password.");
      return;
    }
    if (deleteId) deleteProject(deleteId);
    toast.success("Project deleted.");
    setDeleteId(null);
    setPw("");
  };

  const exportCSV = () => {
    const headers = [
      "Name",
      "Client",
      "Start Date",
      "End Date",
      "Budget",
      "Status",
      "Notes",
    ];
    const rows = projects.map((p) => [
      p.name,
      p.client,
      p.startDate,
      p.endDate,
      p.budget,
      p.status,
      p.notes,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "paygo-projects.csv";
    a.click();
  };

  const fmtDate = (d: string) => (d ? d.split("-").reverse().join("-") : "");

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={openAdd}
            size="sm"
            style={{ background: GREEN, color: "#fff" }}
            data-ocid="paygo.projects.primary_button"
          >
            <Plus className="h-4 w-4 mr-1" /> New Project
          </Button>
          <Button
            onClick={exportCSV}
            size="sm"
            variant="outline"
            data-ocid="paygo.projects.secondary_button"
          >
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
          data-ocid="paygo.projects.search_input"
        />
      </div>

      {/* Summary strip */}
      <div className="flex gap-4 mb-4">
        {[
          { label: "Total", val: String(projects.length) },
          {
            label: "Active",
            val: String(projects.filter((p) => p.status === "Active").length),
          },
          {
            label: "Completed",
            val: String(
              projects.filter((p) => p.status === "Completed").length,
            ),
          },
          {
            label: "Total Budget",
            val: formatINR(projects.reduce((s, p) => s + p.budget, 0)),
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-green-50 border border-green-200 rounded px-4 py-2 text-center"
          >
            <div className="text-xs text-green-700 font-semibold">
              {s.label}
            </div>
            <div className="text-base font-bold" style={{ color: GREEN }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: GREEN }}>
              {[
                "#",
                "Project Name",
                "Client",
                "Start Date",
                "Budget",
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
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-400"
                  data-ocid="paygo.projects.empty_state"
                >
                  No projects found.
                </td>
              </tr>
            ) : (
              filtered.map((p, i) => (
                <tr
                  key={p.id}
                  style={{ background: i % 2 === 0 ? "#f0fff4" : "#fff" }}
                  data-ocid={`paygo.projects.item.${i + 1}`}
                >
                  <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2 font-semibold text-gray-800">
                    {p.name}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{p.client}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {fmtDate(p.startDate)}
                  </td>
                  <td className="px-4 py-2 font-medium">
                    {formatINR(p.budget)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background:
                          p.status === "Active" ? "#d4edda" : "#e2e3e5",
                        color: p.status === "Active" ? "#155724" : "#383d41",
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        title="Edit"
                        data-ocid={`paygo.projects.edit_button.${i + 1}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteId(p.id);
                          setPw("");
                        }}
                        title="Delete"
                        data-ocid={`paygo.projects.delete_button.${i + 1}`}
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
        <DialogContent className="max-w-lg" data-ocid="paygo.projects.modal">
          <DialogHeader>
            <DialogTitle style={{ color: GREEN }}>
              {editItem ? "Edit Project" : "New Project"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <Label className="text-xs font-semibold">Project Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Project Name"
                data-ocid="paygo.projects.input"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold">Client *</Label>
              <Input
                value={form.client}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client: e.target.value }))
                }
                placeholder="Client Name"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Budget (₹)</Label>
              <Input
                type="number"
                value={form.budget || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budget: Number(e.target.value) }))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    status: v as PayGoProject["status"],
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
              data-ocid="paygo.projects.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              style={{ background: GREEN, color: "#fff" }}
              data-ocid="paygo.projects.submit_button"
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
        <DialogContent data-ocid="paygo.projects.dialog">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Enter admin password to delete this project.
          </p>
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Enter admin password"
            data-ocid="paygo.projects.input"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              data-ocid="paygo.projects.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
              data-ocid="paygo.projects.delete_button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
