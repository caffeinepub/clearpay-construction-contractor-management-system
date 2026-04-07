import { useNavigate, useParams } from "@tanstack/react-router";
import { FileDown, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useGetAllPayments, useGetAllProjects } from "../hooks/useQueries";
import { PaymentMode } from "../types";
import { formatINR } from "../utils/money";
import { shareReceiptAsImage } from "../utils/receiptShare";

export default function PaymentViewPage() {
  const navigate = useNavigate();
  const { paymentId } = useParams({ strict: false }) as { paymentId: string };
  const { data: payments = [], isLoading: paymentsLoading } =
    useGetAllPayments();
  const { data: projects = [], isLoading: projectsLoading } =
    useGetAllProjects();

  const payment = payments.find((p) => p.id === paymentId);
  const project = payment
    ? projects.find((p) => p.id === payment.projectId)
    : null;

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
    if (!payment || !project) return;
    shareReceiptAsImage({
      title: "Payment Receipt",
      borderColor: "#28A745",
      rows: [
        ["Project", project.name],
        ["Client", project.client],
        ["Date", payment.date],
        ["Amount", formatINR(payment.amount)],
        [
          "Mode",
          payment.paymentMode === PaymentMode.account ? "Account" : "Cash",
        ],
        ["Reference", payment.reference || ""],
        ["Remarks", payment.remarks || ""],
      ],
      filename: `payment-${payment.id}.png`,
    });
  };

  if (paymentsLoading || projectsLoading) {
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
                PDF
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
              View Payment Details
            </h1>
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-8">
            <p className="text-center text-gray-500 font-normal">
              Loading payment details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!payment || !project) {
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
                PDF
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
              View Payment Details
            </h1>
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-8">
            <p className="text-center text-gray-500 font-normal mb-4">
              Payment not found
            </p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => navigate({ to: "/payments" })}
                className="px-6 py-2 bg-[#28A745] text-white rounded-lg hover:bg-[#218838] transition-colors font-normal"
              >
                Back to Payments
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
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#333333] font-normal hover:bg-[#56C596] transition-colors shadow-sm"
            >
              <Printer className="h-4 w-4 inline mr-2" />
              Print
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#333333] font-normal hover:bg-[#56C596] transition-colors shadow-sm"
            >
              <FileDown className="h-4 w-4 inline mr-2" />
              PDF
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-[#333333] font-normal hover:bg-[#56C596] transition-colors shadow-sm"
            >
              <Share2 className="h-4 w-4 inline mr-2" />
              Share
            </button>
          </div>
          <h1 className="text-2xl font-bold text-[#333333]">
            View Payment Details
          </h1>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md border-2 border-[#28A745]">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-[#E8F5E9] to-[#C8E6C9] p-6 rounded-t-lg border-b-2 border-[#28A745] relative">
            <h1 className="text-2xl font-bold text-[#28A745] text-center">
              Payment Details
            </h1>
            <button
              type="button"
              onClick={handlePrint}
              title="Print Receipt"
              className="absolute top-4 right-4 text-[#28A745] hover:text-[#1B5E20] transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              <Printer className="h-5 w-5" />
            </button>
            <p className="text-center text-gray-700 font-normal mt-1">
              Payment ID: {payment.id}
            </p>
          </div>

          {/* Content Section */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="bg-[#F5F5F5] p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-bold mb-1">
                    Project
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
                    {payment.date}
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="bg-[#E8F5E9] p-4 rounded-lg border-2 border-[#A5D6A7]">
                  <p className="text-sm text-gray-600 font-bold mb-1">Amount</p>
                  <p className="text-2xl text-[#28A745] font-bold">
                    {formatINR(payment.amount)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 font-bold mb-1">
                    Payment Mode
                  </p>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-normal ${
                        payment.paymentMode === PaymentMode.account
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {payment.paymentMode === PaymentMode.account
                        ? "Account"
                        : "Cash"}
                    </span>
                  </div>
                </div>

                <div className="bg-[#F5F5F5] p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-bold mb-1">
                    Reference
                  </p>
                  <p className="text-base text-[#333333] font-normal">
                    {payment.reference || "–"}
                  </p>
                </div>
              </div>
            </div>

            {/* Remarks Section */}
            {payment.remarks && (
              <div className="mt-6 bg-[#F5F5F5] p-4 rounded-lg">
                <p className="text-sm text-gray-600 font-bold mb-2">Remarks</p>
                <p className="text-base text-[#333333] font-normal whitespace-pre-wrap">
                  {payment.remarks}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
