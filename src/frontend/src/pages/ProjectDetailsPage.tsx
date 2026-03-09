import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ExternalLink,
  FileDown,
  Printer,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { useGetAllProjects } from "../hooks/useQueries";

export default function ProjectDetailsPage() {
  const navigate = useNavigate();
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const { data: projects = [] } = useGetAllProjects();

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="p-6 bg-[#F5F5F5] min-h-screen">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 font-normal">Project not found</p>
            <Button
              onClick={() => navigate({ to: "/projects" })}
              className="mt-4 font-normal"
            >
              Back to Projects
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

  const handlePrint = () => {
    window.print();
    toast.success("Print dialog opened");
  };

  const handleExportPDF = () => {
    window.print();
    toast.success("PDF export window opened");
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Project: ${project.name}`,
          text: `Project Details\nName: ${project.name}\nClient: ${project.client}\nEstimated Amount: ${formatCurrency(project.estimatedAmount)}`,
        });
        toast.success("Shared successfully");
      } else {
        // Fallback: copy to clipboard
        const text = `Project Details\nName: ${project.name}\nClient: ${project.client}\nLocation: ${project.location}\nContact: ${project.contactNumber}\nEstimated Amount: ${formatCurrency(project.estimatedAmount)}`;
        await navigator.clipboard.writeText(text);
        toast.success("Project details copied to clipboard");
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
            onClick={() => navigate({ to: "/projects" })}
            className="font-normal"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>

        <Card className="shadow-lg bg-white border-2 border-[#0078D7]">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#333333] mb-2">
                Project Details
              </h1>
              <p className="text-lg text-gray-600 font-normal">
                {project.name}
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
                      Start Date
                    </p>
                    <p className="text-lg font-normal text-[#333333]">
                      {project.startDate || "–"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-normal">
                      Unit Price
                    </p>
                    <p className="text-lg font-normal text-[#333333]">
                      {formatCurrency(project.unitPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-normal">
                      Quantity
                    </p>
                    <p className="text-lg font-normal text-[#333333]">
                      {project.quantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-normal">
                      Contact Number
                    </p>
                    <p className="text-lg font-normal text-[#333333]">
                      {project.contactNumber}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 font-normal">
                      Location
                    </p>
                    <p className="text-lg font-normal text-[#333333]">
                      {project.location || "–"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-normal">Address</p>
                    <p className="text-lg font-normal text-[#333333]">
                      {project.address || "–"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-normal">Notes</p>
                    <p className="text-lg font-normal text-[#333333]">
                      {project.notes || "–"}
                    </p>
                  </div>
                  {project.attachmentLinks &&
                    project.attachmentLinks.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 font-normal mb-2">
                          Attachments
                        </p>
                        <div className="space-y-2">
                          {project.attachmentLinks.map((link, index) => (
                            <a
                              key={link}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-[#0078D7] hover:text-[#005A9E] transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span className="text-sm font-normal">
                                Attachment {index + 1}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="bg-[#E3F2FD] p-4 rounded-lg">
                  <p className="text-sm text-gray-500 font-normal mb-1">
                    Estimated Amount
                  </p>
                  <p className="text-3xl font-bold text-[#0078D7]">
                    {formatCurrency(project.estimatedAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-8 pt-6 border-t">
              <Button
                onClick={handlePrint}
                className="bg-white hover:bg-[#BBDEFB] text-[#333333] border-2 border-[#0078D7] rounded-lg px-6 py-3 font-normal transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Printer className="h-5 w-5 mr-2" />
                Print
              </Button>
              <Button
                onClick={handleExportPDF}
                className="bg-white hover:bg-[#BBDEFB] text-[#333333] border-2 border-[#0078D7] rounded-lg px-6 py-3 font-normal transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <FileDown className="h-5 w-5 mr-2" />
                PDF
              </Button>
              <Button
                onClick={handleShare}
                className="bg-white hover:bg-[#BBDEFB] text-[#333333] border-2 border-[#0078D7] rounded-lg px-6 py-3 font-normal transition-all duration-200 shadow-md hover:shadow-lg"
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
