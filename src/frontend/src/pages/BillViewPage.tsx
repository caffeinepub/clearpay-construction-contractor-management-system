import { useNavigate, useParams } from "@tanstack/react-router";
import { FileDown, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useGetAllBills, useGetAllProjects } from "../hooks/useQueries";
import { formatINR } from "../utils/money";
import { shareReceiptAsImage } from "../utils/receiptShare";

export default function BillViewPage() {
  const navigate = useNavigate();
  const { projectId, billNumber } = useParams({ strict: false }) as {
    projectId: string;
    billNumber: string;
  };
  const { data: bills = [], isLoading: billsLoading } = useGetAllBills();
  const { data: projects = [], isLoading: projectsLoading } =
    useGetAllProjects();

  const bill = bills.find(
    (b) => b.projectId === projectId && b.billNumber === billNumber,
  );
  const project = projects.find((p) => p.id === projectId);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handlePrint = () => {
    window.print();
    toast.success("Print dialog opened");
  };

  const handleExportPDF = () => {
    try {
      window.print();
      toast.success("PDF export initiated");
    } catch (_error) {
      toast.error("Failed to generate PDF");
    }
  };

  const handleShare = () => {
    if (!bill || !project) return;
    shareReceiptAsImage({
      title: "Bill Receipt",
      borderColor: "#FFA500",
      rows: [
        ["Project", project.name],
        ["Client", project.client],
        ["Bill No", bill.billNumber],
        ["Date", bill.date],
        ["Block ID", bill.blockId || ""],
        ["Description", bill.description],
        ["Quantity", String(bill.quantity)],
        ["Unit", bill.unit],
        ["Unit Price", formatINR(bill.unitPrice)],
        ["Total Amount", formatINR(bill.amount)],
        ["GST", bill.includesGst ? "Included (18%)" : "Not Included"],
        ["Remarks", bill.remarks || ""],
      ],
      filename: `bill-${bill.billNumber}.png`,
    });
  };

  if (billsLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#333333] font-normal"
                disabled
              >
                <Printer className="h-4 w-4 inline mr-2" />
                Print
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#333333] font-normal"
                disabled
              >
                <FileDown className="h-4 w-4 inline mr-2" />
                Export PDF
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#333333] font-normal"
                disabled
              >
                <Share2 className="h-4 w-4 inline mr-2" />
                Share
              </button>
            </div>
            <h1 className="text-2xl font-bold text-[#333333]">
              View Bill Details
            </h1>
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-8">
            <p className="text-center text-gray-500 font-normal">
              Loading bill details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!bill || !project) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#333333] font-normal"
                disabled
              >
                <Printer className="h-4 w-4 inline mr-2" />
                Print
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#333333] font-normal"
                disabled
              >
                <FileDown className="h-4 w-4 inline mr-2" />
                Export PDF
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#333333] font-normal"
                disabled
              >
                <Share2 className="h-4 w-4 inline mr-2" />
                Share
              </button>
            </div>
            <h1 className="text-2xl font-bold text-[#333333]">
              View Bill Details
            </h1>
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-8">
            <p className="text-center text-gray-500 font-normal mb-4">
              Bill not found
            </p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => navigate({ to: "/bills" })}
                className="px-6 py-2 bg-[#0078D7] text-white rounded-lg hover:bg-[#005A9E] transition-colors font-normal"
              >
                Back to Bills
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#333333] font-normal hover:bg-[#FFBE88] transition-colors shadow-sm"
            >
              <Printer className="h-4 w-4 inline mr-2" />
              Print
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#333333] font-normal hover:bg-[#FFBE88] transition-colors shadow-sm"
            >
              <FileDown className="h-4 w-4 inline mr-2" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#333333] font-normal hover:bg-[#FFBE88] transition-colors shadow-sm"
            >
              <Share2 className="h-4 w-4 inline mr-2" />
              Share
            </button>
          </div>
          <h1 className="text-2xl font-bold text-[#333333]">
            View Bill Details
          </h1>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md border-2 border-[#FFA500]">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-[#FFF8E1] to-[#FFE0B2] p-6 rounded-t-lg border-b-2 border-[#FFA500] relative">
            <h1 className="text-2xl font-bold text-[#FFA500] text-center">
              Bill Details
            </h1>
            <button
              type="button"
              onClick={handlePrint}
              title="Print Receipt"
              className="absolute top-4 right-4 text-[#FFA500] hover:text-[#E65100] transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <Printer className="h-5 w-5" />
            </button>
            <p className="text-center text-gray-700 font-normal mt-1">
              Bill No: {bill.billNumber}
            </p>
          </div>

          {/* Content Section */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="bg-[#F5F5F5] p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-bold mb-1">
                    Project Name
                  </p>
                  <p className="text-base text-[#333333] font-normal">
                    {project.name}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 font-bold mb-1">Client</p>
                  <p className="text-base text-[#333333] font-normal">
                    {project.client}
                  </p>
                </div>

                <div className="bg-[#F5F5F5] p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-bold mb-1">Date</p>
                  <p className="text-base text-[#333333] font-normal">
                    {bill.date}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 font-bold mb-1">
                    Block ID
                  </p>
                  <p className="text-base text-[#333333] font-normal">
                    {bill.blockId || "–"}
                  </p>
                </div>

                <div className="bg-[#F5F5F5] p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-bold mb-1">
                    Bill Number
                  </p>
                  <p className="text-base text-[#333333] font-normal">
                    {bill.billNumber}
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="bg-[#F5F5F5] p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-bold mb-1">
                    Description
                  </p>
                  <p className="text-base text-[#333333] font-normal">
                    {bill.description}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 font-bold mb-1">
                    Quantity
                  </p>
                  <p className="text-base text-[#333333] font-normal">
                    {formatNumber(bill.quantity)}
                  </p>
                </div>

                <div className="bg-[#F5F5F5] p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-bold mb-1">Unit</p>
                  <p className="text-base text-[#333333] font-normal">
                    {bill.unit}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 font-bold mb-1">
                    Unit Price
                  </p>
                  <p className="text-base text-[#333333] font-normal">
                    {formatINR(bill.unitPrice)}
                  </p>
                </div>

                <div className="bg-[#E3F2FD] p-4 rounded-lg border-2 border-[#90CAF9]">
                  <p className="text-sm text-gray-600 font-bold mb-1">
                    Total Amount
                  </p>
                  <p className="text-2xl text-[#0078D7] font-bold">
                    {formatINR(bill.amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* GST Information */}
            <div className="mt-6 bg-[#FFF9C4] p-4 rounded-lg border border-[#FFF176]">
              <p className="text-sm text-gray-600 font-bold mb-1">
                GST Inclusion
              </p>
              <p className="text-base text-[#333333] font-normal">
                {bill.includesGst ? "GST Included (18%)" : "GST Not Included"}
              </p>
            </div>

            {/* Remarks Section */}
            {bill.remarks && (
              <div className="mt-6 bg-[#F5F5F5] p-4 rounded-lg">
                <p className="text-sm text-gray-600 font-bold mb-2">Remarks</p>
                <p className="text-base text-[#333333] font-normal whitespace-pre-wrap">
                  {bill.remarks}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
