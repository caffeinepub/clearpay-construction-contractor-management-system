import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, FileDown, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { PaymentMode } from "../backend";
import { useGetAllPayments, useGetAllProjects } from "../hooks/useQueries";
import { exportPaymentDetailsToPDF } from "../lib/exportUtils";

export default function PaymentDetailsPage() {
  const navigate = useNavigate();
  const { paymentId } = useParams({ strict: false }) as { paymentId: string };
  const { data: payments = [] } = useGetAllPayments();
  const { data: projects = [] } = useGetAllProjects();

  const payment = payments.find((p) => p.id === paymentId);
  const project = payment
    ? projects.find((p) => p.id === payment.projectId)
    : null;

  if (!payment || !project) {
    return (
      <div className="p-6 bg-[#F5F5F5] min-h-screen">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 font-normal">Payment not found</p>
            <Button
              onClick={() => navigate({ to: "/payments" })}
              className="mt-4 font-normal"
            >
              Back to Payments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handlePrint = () => {
    window.print();
    toast.success("Print dialog opened");
  };

  const handleExportPDF = () => {
    try {
      exportPaymentDetailsToPDF(payment, project);
      toast.success("PDF generated successfully");
    } catch (_error) {
      toast.error("Failed to generate PDF");
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Payment Receipt - ${project.name}`,
          text: `Payment Details\nProject: ${project.name}\nAmount: ${formatCurrency(payment.amount)}\nMode: ${payment.paymentMode === PaymentMode.account ? "Account" : "Cash"}`,
        });
        toast.success("Shared successfully");
      } else {
        // Fallback: copy to clipboard
        const text = `Payment Details\nProject: ${project.name}\nClient: ${project.client}\nDate: ${payment.date}\nAmount: ${formatCurrency(payment.amount)}\nMode: ${payment.paymentMode === PaymentMode.account ? "Account" : "Cash"}\nReference: ${payment.reference}`;
        await navigator.clipboard.writeText(text);
        toast.success("Payment details copied to clipboard");
      }
    } catch (_error) {
      toast.error("Failed to share");
    }
  };

  return (
    <div className="p-6 bg-[#F5F5F5] min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/payments" })}
            className="font-normal"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payments
          </Button>
        </div>

        <Card className="shadow-lg bg-white border-2 border-[#56C596]">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#333333] mb-2">
                Payment Receipt
              </h1>
              <p className="text-lg text-gray-600 font-normal">
                Payment ID: {payment.id}
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 font-normal">
                      Project Name
                    </p>
                    <p className="text-lg font-bold text-[#333333]">
                      {project.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-normal">Client</p>
                    <p className="text-lg font-normal text-[#333333]">
                      {project.client}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-normal">
                      Payment Date
                    </p>
                    <p className="text-lg font-normal text-[#333333]">
                      {payment.date}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 font-normal">
                      Payment Mode
                    </p>
                    <Badge
                      variant={
                        payment.paymentMode === PaymentMode.account
                          ? "default"
                          : "secondary"
                      }
                      className={`text-base px-4 py-1 ${payment.paymentMode === PaymentMode.account ? "bg-green-100 text-green-800 font-normal" : "bg-gray-100 text-gray-800 font-normal"}`}
                    >
                      {payment.paymentMode === PaymentMode.account
                        ? "Account"
                        : "Cash"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-normal">
                      Reference
                    </p>
                    <p className="text-lg font-normal text-[#333333]">
                      {payment.reference || "–"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="bg-[#E8F5E9] p-4 rounded-lg">
                  <p className="text-sm text-gray-500 font-normal mb-1">
                    Payment Amount
                  </p>
                  <p className="text-3xl font-bold text-[#28A745]">
                    {formatCurrency(payment.amount)}
                  </p>
                </div>
              </div>

              {payment.remarks && (
                <div>
                  <p className="text-sm text-gray-500 font-normal mb-2">
                    Remarks
                  </p>
                  <p className="text-base font-normal text-[#333333] bg-gray-50 p-4 rounded-lg">
                    {payment.remarks}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 mt-8 pt-6 border-t">
              <Button
                onClick={handlePrint}
                className="bg-white hover:bg-[#56C596] text-[#333333] border-2 border-[#56C596] rounded-lg px-6 py-3 font-normal transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Printer className="h-5 w-5 mr-2" />
                Print
              </Button>
              <Button
                onClick={handleExportPDF}
                className="bg-white hover:bg-[#56C596] text-[#333333] border-2 border-[#56C596] rounded-lg px-6 py-3 font-normal transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <FileDown className="h-5 w-5 mr-2" />
                PDF
              </Button>
              <Button
                onClick={handleShare}
                className="bg-white hover:bg-[#56C596] text-[#333333] border-2 border-[#56C596] rounded-lg px-6 py-3 font-normal transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Share2 className="h-5 w-5 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
