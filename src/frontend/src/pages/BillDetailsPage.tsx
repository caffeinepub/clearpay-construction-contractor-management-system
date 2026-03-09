import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, FileDown, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useGetAllBills, useGetAllProjects } from "../hooks/useQueries";
import { exportBillDetailsToPDF } from "../lib/exportUtils";

export default function BillDetailsPage() {
  const navigate = useNavigate();
  const { projectId, billNumber } = useParams({ strict: false }) as {
    projectId: string;
    billNumber: string;
  };
  const { data: bills = [] } = useGetAllBills();
  const { data: projects = [] } = useGetAllProjects();

  const bill = bills.find(
    (b) => b.projectId === projectId && b.billNumber === billNumber,
  );
  const project = projects.find((p) => p.id === projectId);

  if (!bill || !project) {
    return (
      <div className="p-6 bg-[#F5F5F5] min-h-screen">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 font-normal">Bill not found</p>
            <Button
              onClick={() => navigate({ to: "/bills" })}
              className="mt-4 font-normal"
            >
              Back to Bills
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
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  };

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
      exportBillDetailsToPDF(bill, project);
      toast.success("PDF generated successfully");
    } catch (_error) {
      toast.error("Failed to generate PDF");
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Bill ${bill.billNumber} - ${project.name}`,
          text: `Bill Details\nProject: ${project.name}\nBill No: ${bill.billNumber}\nAmount: ${formatCurrency(bill.amount)}`,
        });
        toast.success("Shared successfully");
      } else {
        // Fallback: copy to clipboard
        const text = `Bill Details\nProject: ${project.name}\nClient: ${project.client}\nBill No: ${bill.billNumber}\nDate: ${bill.date}\nAmount: ${formatCurrency(bill.amount)}`;
        await navigator.clipboard.writeText(text);
        toast.success("Bill details copied to clipboard");
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
            onClick={() => navigate({ to: "/bills" })}
            className="font-normal"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bills
          </Button>
        </div>

        <Card className="shadow-lg bg-white border-2 border-[#FFBE88]">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#333333] mb-2">
                Bill Details
              </h1>
              <p className="text-lg text-gray-600 font-normal">
                Bill No: {bill.billNumber}
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
                    <p className="text-sm text-gray-500 font-normal">Date</p>
                    <p className="text-lg font-normal text-[#333333]">
                      {bill.date}
                    </p>
                  </div>
                  {bill.blockId && (
                    <div>
                      <p className="text-sm text-gray-500 font-normal">
                        Block ID
                      </p>
                      <p className="text-lg font-normal text-[#333333]">
                        {bill.blockId}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 font-normal">
                      Description
                    </p>
                    <p className="text-lg font-normal text-[#333333]">
                      {bill.description}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-normal">
                      Quantity
                    </p>
                    <p className="text-lg font-normal text-[#333333]">
                      {formatNumber(bill.quantity)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-normal">Unit</p>
                    <p className="text-lg font-normal text-[#333333]">
                      {bill.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-normal">
                      Unit Price
                    </p>
                    <p className="text-lg font-normal text-[#333333]">
                      {formatCurrency(bill.unitPrice)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="bg-[#E3F2FD] p-4 rounded-lg">
                  <p className="text-sm text-gray-500 font-normal mb-1">
                    Total Amount
                  </p>
                  <p className="text-3xl font-bold text-[#0078D7]">
                    {formatCurrency(bill.amount)}
                  </p>
                </div>
              </div>

              {bill.remarks && (
                <div>
                  <p className="text-sm text-gray-500 font-normal mb-2">
                    Remarks
                  </p>
                  <p className="text-base font-normal text-[#333333] bg-gray-50 p-4 rounded-lg">
                    {bill.remarks}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 mt-8 pt-6 border-t">
              <Button
                onClick={handlePrint}
                className="bg-white hover:bg-[#FFBE88] text-[#333333] border-2 border-[#FFBE88] rounded-lg px-6 py-3 font-normal transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Printer className="h-5 w-5 mr-2" />
                Print
              </Button>
              <Button
                onClick={handleExportPDF}
                className="bg-white hover:bg-[#FFBE88] text-[#333333] border-2 border-[#FFBE88] rounded-lg px-6 py-3 font-normal transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <FileDown className="h-5 w-5 mr-2" />
                PDF
              </Button>
              <Button
                onClick={handleShare}
                className="bg-white hover:bg-[#FFBE88] text-[#333333] border-2 border-[#FFBE88] rounded-lg px-6 py-3 font-normal transition-all duration-200 shadow-md hover:shadow-lg"
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
