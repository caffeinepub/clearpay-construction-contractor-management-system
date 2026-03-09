import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PaymentMode } from "../backend";
import { useActor } from "../hooks/useActor";
import {
  useGetAllBills,
  useGetAllClients,
  useGetAllPayments,
  useGetAllProjects,
  useGetCallerUserProfile,
} from "../hooks/useQueries";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  projectButtons?: string[];
};

export default function SeriAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { actor } = useActor();
  const { data: projects = [] } = useGetAllProjects();
  const { data: bills = [] } = useGetAllBills();
  const { data: payments = [] } = useGetAllPayments();
  const { data: clients = [] } = useGetAllClients();
  const { data: userProfile } = useGetCallerUserProfile();

  // Initialize chat with backend greeting
  useEffect(() => {
    const initializeChat = async () => {
      if (messages.length === 0 && actor) {
        try {
          const greeting = await actor.getGreetingMessage(null);
          setMessages([
            {
              id: "1",
              role: "assistant",
              content: greeting,
              timestamp: new Date(),
            },
          ]);
        } catch (error) {
          console.error("Failed to get greeting:", error);
          setMessages([
            {
              id: "1",
              role: "assistant",
              content:
                "Hello 👋\n\nI'm Seri AI 👋\nI can help you with Projects, Bills, Payments, Outstanding, GST, Reports, and Analytics.\nWhat would you like to know?",
              timestamp: new Date(),
            },
          ]);
        }
      }
    };
    initializeChat();
  }, [actor, messages.length]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional deps to trigger scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isTyping]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);
  };

  const detectTriggerKeywords = (query: string): boolean => {
    const lowerQuery = query.toLowerCase();
    const triggerKeywords = [
      "projects",
      "bills",
      "payments",
      "outstanding",
      "with gst outstanding",
    ];

    // Check for trigger keywords
    if (triggerKeywords.some((keyword) => lowerQuery.includes(keyword))) {
      return true;
    }

    // Check if query matches any project name
    return projects.some((project) =>
      lowerQuery.includes(project.name.toLowerCase()),
    );
  };

  const getProjectByName = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return projects.find((project) =>
      lowerQuery.includes(project.name.toLowerCase()),
    );
  };

  const getClientForProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return null;

    return clients.find(
      (c) => c.name.toLowerCase() === project.client.toLowerCase(),
    );
  };

  const processProjectSummary = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return "ℹ️ Sorry, the requested information is not available in the system.\n📞 +91 7575 94 4949 for more details.";
    }

    const projectBills = bills.filter((b) => b.projectId === projectId);
    const projectPayments = payments.filter((p) => p.projectId === projectId);

    const totalBills = projectBills.reduce((sum, b) => sum + b.amount, 0);
    const totalPayments = projectPayments.reduce((sum, p) => sum + p.amount, 0);

    const accountPayments = projectPayments.filter(
      (p) => p.paymentMode === PaymentMode.account,
    );
    const cashPayments = projectPayments.filter(
      (p) => p.paymentMode === PaymentMode.cash,
    );
    const accountTotal = accountPayments.reduce((sum, p) => sum + p.amount, 0);
    const cashTotal = cashPayments.reduce((sum, p) => sum + p.amount, 0);

    const outstanding = totalBills - totalPayments;
    const positiveOutstanding = outstanding > 0 ? outstanding : 0;
    const gstOutstanding = positiveOutstanding * 0.18;

    let response = `📊 **Project Summary: ${project.name}**\n\n`;
    response += `**Total Bills:** ${projectBills.length} bills - ${formatCurrency(totalBills)}\n\n`;
    response += `**Total Payments:** ${projectPayments.length} payments - ${formatCurrency(totalPayments)}\n\n`;
    response += "**Payment Split:**\n";
    response += `   • Account: ${formatCurrency(accountTotal)} (${accountPayments.length} payments)\n`;
    response += `   • Cash: ${formatCurrency(cashTotal)} (${cashPayments.length} payments)\n\n`;
    response += `**Outstanding:** ${formatCurrency(positiveOutstanding)}\n\n`;
    response += `**GST Outstanding (18%):** ${formatCurrency(gstOutstanding)}\n`;

    return response;
  };

  const processDetailQuery = (query: string) => {
    const lowerQuery = query.toLowerCase();
    const project = getProjectByName(query);

    if (!project) {
      return "ℹ️ Sorry, the requested information is not available in the system.\n📞 +91 7575 94 4949 for more details.";
    }

    // Bills detail
    if (lowerQuery.includes("bills") || lowerQuery.includes("bill")) {
      const projectBills = bills.filter((b) => b.projectId === project.id);
      const totalBills = projectBills.reduce((sum, b) => sum + b.amount, 0);

      let response = `💰 **Bills for ${project.name}**\n\n`;
      response += `**Total Bills:** ${projectBills.length} bills\n`;
      response += `**Total Amount:** ${formatCurrency(totalBills)}\n\n`;

      if (projectBills.length > 0) {
        response += "**Recent Bills:**\n";
        projectBills.slice(0, 5).forEach((bill, idx) => {
          response += `${idx + 1}. ${bill.description} - ${formatCurrency(bill.amount)}\n`;
          response += `   Date: ${bill.date}\n`;
        });
      }

      return response;
    }

    // Payments detail
    if (lowerQuery.includes("payments") || lowerQuery.includes("payment")) {
      const projectPayments = payments.filter(
        (p) => p.projectId === project.id,
      );
      const totalPayments = projectPayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );

      let response = `💳 **Payments for ${project.name}**\n\n`;
      response += `**Total Payments:** ${projectPayments.length} payments\n`;
      response += `**Total Amount:** ${formatCurrency(totalPayments)}\n\n`;

      if (projectPayments.length > 0) {
        response += "**Recent Payments:**\n";
        projectPayments.slice(0, 5).forEach((payment, idx) => {
          const mode =
            payment.paymentMode === PaymentMode.account ? "Account" : "Cash";
          response += `${idx + 1}. ${formatCurrency(payment.amount)} (${mode})\n`;
          response += `   Date: ${payment.date}, Ref: ${payment.reference}\n`;
        });
      }

      return response;
    }

    // Outstanding detail
    if (lowerQuery.includes("outstanding")) {
      const projectBills = bills.filter((b) => b.projectId === project.id);
      const projectPayments = payments.filter(
        (p) => p.projectId === project.id,
      );
      const totalBills = projectBills.reduce((sum, b) => sum + b.amount, 0);
      const totalPayments = projectPayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );
      const outstanding = totalBills - totalPayments;
      const positiveOutstanding = outstanding > 0 ? outstanding : 0;

      let response = `📊 **Outstanding for ${project.name}**\n\n`;
      response += `**Total Bills:** ${formatCurrency(totalBills)}\n`;
      response += `**Total Payments:** ${formatCurrency(totalPayments)}\n`;
      response += `**Outstanding:** ${formatCurrency(positiveOutstanding)}\n`;

      if (outstanding < 0) {
        response += `\n✅ This project is overpaid by ${formatCurrency(Math.abs(outstanding))}`;
      }

      return response;
    }

    // GST detail
    if (lowerQuery.includes("gst") || lowerQuery.includes("with gst")) {
      const projectBills = bills.filter((b) => b.projectId === project.id);
      const projectPayments = payments.filter(
        (p) => p.projectId === project.id,
      );
      const totalBills = projectBills.reduce((sum, b) => sum + b.amount, 0);
      const totalPayments = projectPayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );
      const outstanding = totalBills - totalPayments;
      const positiveOutstanding = outstanding > 0 ? outstanding : 0;
      const gstOutstanding = positiveOutstanding * 0.18;

      let response = `📋 **GST for ${project.name}**\n\n`;
      response += `**Outstanding:** ${formatCurrency(positiveOutstanding)}\n`;
      response += `**GST (18%):** ${formatCurrency(gstOutstanding)}\n`;

      if (outstanding <= 0) {
        response += "\nℹ️ No GST applicable (project is fully paid or overpaid)";
      }

      return response;
    }

    // Account payments
    if (lowerQuery.includes("account")) {
      const projectPayments = payments.filter(
        (p) =>
          p.projectId === project.id && p.paymentMode === PaymentMode.account,
      );
      const accountTotal = projectPayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );

      let response = `💳 **Account Payments for ${project.name}**\n\n`;
      response += `**Total Account Payments:** ${projectPayments.length} payments\n`;
      response += `**Total Amount:** ${formatCurrency(accountTotal)}\n`;

      return response;
    }

    // Cash payments
    if (lowerQuery.includes("cash")) {
      const projectPayments = payments.filter(
        (p) => p.projectId === project.id && p.paymentMode === PaymentMode.cash,
      );
      const cashTotal = projectPayments.reduce((sum, p) => sum + p.amount, 0);

      let response = `💵 **Cash Payments for ${project.name}**\n\n`;
      response += `**Total Cash Payments:** ${projectPayments.length} payments\n`;
      response += `**Total Amount:** ${formatCurrency(cashTotal)}\n`;

      return response;
    }

    // Client information
    if (lowerQuery.includes("client")) {
      const client = getClientForProject(project.id);

      let response = `👥 **Client Information for ${project.name}**\n\n`;
      response += `**Client Name:** ${project.client}\n`;

      if (client) {
        response += `**Contact:** ${client.contact}\n`;
        response += `**Address:** ${client.address}\n`;
        if (client.email) {
          response += `**Email:** ${client.email}\n`;
        }
      } else {
        response +=
          "\nℹ️ Detailed client information not available in the system.";
      }

      return response;
    }

    // Unit price
    if (lowerQuery.includes("unit price")) {
      let response = `💰 **Unit Price for ${project.name}**\n\n`;
      response += `**Unit Price:** ${formatCurrency(project.unitPrice)}\n`;
      response += `**Unit:** ${project.quantity > 0 ? "Per unit" : "N/A"}\n`;

      return response;
    }

    // Estimated quantity
    if (
      lowerQuery.includes("est qty") ||
      lowerQuery.includes("estimated quantity")
    ) {
      let response = `📊 **Estimated Quantity for ${project.name}**\n\n`;
      response += `**Estimated Quantity:** ${project.quantity.toFixed(2)}\n`;

      return response;
    }

    // Estimated amount
    if (
      lowerQuery.includes("est amount") ||
      lowerQuery.includes("estimated amount")
    ) {
      let response = `💰 **Estimated Amount for ${project.name}**\n\n`;
      response += `**Estimated Amount:** ${formatCurrency(project.estimatedAmount)}\n`;
      response += `**Unit Price:** ${formatCurrency(project.unitPrice)}\n`;
      response += `**Quantity:** ${project.quantity.toFixed(2)}\n`;

      return response;
    }

    return "ℹ️ Sorry, the requested information is not available in the system.\n📞 +91 7575 94 4949 for more details.";
  };

  const processQuery = (
    query: string,
  ): { content: string; projectButtons?: string[] } => {
    const lowerQuery = query.toLowerCase();

    // Check if it's a trigger keyword
    if (detectTriggerKeywords(query)) {
      // Check if it's a specific project query with detail keyword
      const project = getProjectByName(query);
      if (
        project &&
        (lowerQuery.includes("bills") ||
          lowerQuery.includes("payments") ||
          lowerQuery.includes("outstanding") ||
          lowerQuery.includes("gst") ||
          lowerQuery.includes("account") ||
          lowerQuery.includes("cash") ||
          lowerQuery.includes("client") ||
          lowerQuery.includes("unit price") ||
          lowerQuery.includes("est qty") ||
          lowerQuery.includes("est amount"))
      ) {
        return { content: processDetailQuery(query) };
      }

      // Show project list for selection
      if (projects.length === 0) {
        return {
          content:
            "ℹ️ Sorry, the requested information is not available in the system.\n📞 +91 7575 94 4949 for more details.",
        };
      }

      return {
        content: "Please select a project from the list below 👇",
        projectButtons: projects.map((p) => p.name),
      };
    }

    // Default ClearPay response
    return {
      content:
        "I can help you with information about:\n\n" +
        "📋 **Projects** - View all projects and their details\n" +
        "💰 **Bills** - Total bills, project-wise bills\n" +
        "💳 **Payments** - Payment summaries, payment modes\n" +
        "📊 **Outstanding** - Outstanding amounts by project\n" +
        "📋 **GST** - GST calculations (18%) on outstanding amounts\n" +
        "👥 **Clients** - Client information\n\n" +
        "💡 Try asking:\n" +
        '• "Projects"\n' +
        '• "Outstanding"\n' +
        '• "[Project Name] – bills"\n' +
        '• "[Project Name] – client"',
    };
  };

  const handleProjectButtonClick = (projectName: string) => {
    const project = projects.find((p) => p.name === projectName);
    if (!project) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: projectName,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    setTimeout(() => {
      const summary = processProjectSummary(project.id);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: summary,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 800);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const { content, projectButtons } = processQuery(input);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content,
        timestamp: new Date(),
        projectButtons,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 800);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleClearChat = () => {
    setMessages([]);
    if (actor) {
      actor
        .getGreetingMessage(null)
        .then((greeting) => {
          setMessages([
            {
              id: "1",
              role: "assistant",
              content: greeting,
              timestamp: new Date(),
            },
          ]);
        })
        .catch(() => {
          setMessages([
            {
              id: "1",
              role: "assistant",
              content:
                "Hello 👋\n\nI'm Seri AI 👋\nI can help you with Projects, Bills, Payments, Outstanding, GST, Reports, and Analytics.\nWhat would you like to know?",
              timestamp: new Date(),
            },
          ]);
        });
    }
    toast.success("Chat cleared");
  };

  return (
    <div className="p-6 h-[calc(100vh-12rem)]">
      <Card className="h-full flex flex-col shadow-lg border-2 border-gray-200">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/assets/generated/seri-ai-avatar-transparent.dim_200x200.png"
                alt="Seri AI"
                className="h-14 w-14 rounded-full shadow-md"
              />
              <div>
                <CardTitle className="text-[#0078D7] font-heading font-bold text-xl">
                  Seri AI Assistant
                </CardTitle>
                <p className="text-sm text-[#555555] font-body">
                  Your intelligent ClearPay helper
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              className="font-body"
            >
              Clear Chat
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <img
                      src="/assets/generated/seri-ai-avatar-transparent.dim_200x200.png"
                      alt="Seri AI"
                      className="h-10 w-10 rounded-full flex-shrink-0 shadow-sm"
                    />
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl p-4 shadow-md ${
                      message.role === "user"
                        ? "bg-[#0078D7] text-white"
                        : "bg-blue-50 text-[#333333] border border-blue-200"
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-body leading-relaxed">
                      {message.content}
                    </div>
                    {message.projectButtons &&
                      message.projectButtons.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.projectButtons.map((projectName) => (
                            <Button
                              key={projectName}
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleProjectButtonClick(projectName)
                              }
                              className="text-xs font-body bg-white hover:bg-blue-100 border-[#0078D7] text-[#0078D7] font-semibold"
                            >
                              {projectName}
                            </Button>
                          ))}
                        </div>
                      )}
                    <div
                      className={`text-xs mt-2 font-body ${
                        message.role === "user"
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                  {message.role === "user" && userProfile && (
                    <div className="h-10 w-10 rounded-full bg-[#0078D7] flex items-center justify-center text-white font-heading font-bold shadow-sm flex-shrink-0">
                      {userProfile.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <img
                    src="/assets/generated/seri-ai-avatar-transparent.dim_200x200.png"
                    alt="Seri AI"
                    className="h-10 w-10 rounded-full flex-shrink-0 shadow-sm"
                  />
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 shadow-md">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div
                          className="h-2 w-2 bg-[#0078D7] rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="h-2 w-2 bg-[#0078D7] rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="h-2 w-2 bg-[#0078D7] rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-body">
                        Seri AI is thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="border-t bg-gray-50 p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSend()
                }
                placeholder="Ask me about your projects, bills, payments, outstanding, GST..."
                className="flex-1 font-body border-2 border-gray-300 focus:border-[#0078D7] rounded-lg"
                disabled={isTyping}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="bg-[#0078D7] hover:bg-[#005a9e] text-white font-body font-semibold px-6 rounded-lg shadow-md transition-all"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 font-body">
              <Info className="h-3 w-3" />
              <span>
                Seri AI provides read-only access to your ClearPay data
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
