import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, X } from "lucide-react";
import type { ReactNode } from "react";

interface ChartZoomModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onExportCSV?: () => void;
}

export default function ChartZoomModal({
  open,
  onClose,
  title,
  children,
  onExportCSV,
}: ChartZoomModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogContent
          className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] bg-white shadow-2xl border-0 p-0 overflow-hidden"
          style={{
            width: "1550px",
            height: "770px",
            maxWidth: "95vw",
            maxHeight: "90vh",
            fontFamily: "'Century Gothic', 'Gothic A1', sans-serif",
          }}
        >
          <DialogHeader className="sticky top-0 z-10 bg-white border-b border-[#E0E0E0] px-6 py-4 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-2xl font-bold text-[#555555]">
              {title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {onExportCSV && (
                <Button
                  onClick={onExportCSV}
                  variant="outline"
                  size="sm"
                  className="bg-white border-[#E0E0E0] hover:bg-[#F8F8F8] text-[#333333] shadow-sm hover:shadow-md transition-all"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="hover:bg-[#F5F5F5] h-8 w-8 p-0"
              >
                <X className="h-5 w-5 text-[#555555]" />
              </Button>
            </div>
          </DialogHeader>
          <div
            className="overflow-auto"
            style={{
              height: "calc(770px - 73px)",
              maxHeight: "calc(90vh - 73px)",
            }}
          >
            <div className="p-6 flex items-center justify-center">
              <div
                style={{ width: "100%", maxWidth: "1500px", height: "650px" }}
              >
                {children}
              </div>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
