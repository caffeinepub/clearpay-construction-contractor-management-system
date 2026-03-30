import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Info, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePayGo } from "../context/PayGoContext";
import { formatINR } from "../utils/money";

const GREEN = "#28A745";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export default function PayGoAIPage() {
  const { projects, contractors, payments } = usePayGo();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content:
            'Hello! \u{1F44B} I\'m the **PayGo Assistant**.\n\nI can help you with:\n\u{1F4CB} **Projects** \u2013 summaries and status\n\u{1F4B3} **Payments** \u2013 totals, outstanding\n\u{1F3D7}\uFE0F **Contractors** \u2013 contract details\n\nTry: "projects", "payments", "outstanding", or a project name.',
          timestamp: new Date(),
        },
      ]);
    }
  }, [messages.length]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message change
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, isTyping]);

  const processQuery = (query: string): string => {
    const q = query.toLowerCase().trim();

    if (q.includes("project") || q.includes("projects")) {
      const active = projects.filter((p) => p.status === "Active");
      const completed = projects.filter((p) => p.status === "Completed");
      const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
      let r = "\u{1F4CB} **Projects Summary**\n\n";
      r += `**Total Projects:** ${projects.length} (${active.length} active, ${completed.length} completed)\n`;
      r += `**Total Budget:** ${formatINR(totalBudget)}\n\n`;
      if (projects.length > 0) {
        r += "**Project List:**\n";
        projects.forEach((p, i) => {
          r += `${i + 1}. ${p.name} \u2013 ${p.client} (${p.status})\n`;
        });
      }
      return r;
    }

    if (q.includes("payment") || q.includes("payments")) {
      const total = payments.reduce((s, p) => s + p.amount, 0);
      const completed = payments
        .filter((p) => p.status === "Completed")
        .reduce((s, p) => s + p.amount, 0);
      const pending = payments
        .filter((p) => p.status === "Pending")
        .reduce((s, p) => s + p.amount, 0);
      let r = "\u{1F4B3} **Payments Summary**\n\n";
      r += `**Total Payments:** ${payments.length} \u2013 ${formatINR(total)}\n`;
      r += `**Completed:** ${formatINR(completed)}\n`;
      r += `**Pending:** ${formatINR(pending)}\n`;
      return r;
    }

    if (q.includes("outstanding")) {
      const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      const outstanding = Math.max(0, totalBudget - totalPaid);
      let r = "\u{1F4CA} **Outstanding Summary**\n\n";
      r += `**Total Budget:** ${formatINR(totalBudget)}\n`;
      r += `**Total Payments:** ${formatINR(totalPaid)}\n`;
      r += `**Outstanding:** ${formatINR(outstanding)}\n`;
      return r;
    }

    if (q.includes("contractor") || q.includes("contractors")) {
      const active = contractors.filter((c) => c.status === "Active");
      const total = contractors.reduce((s, c) => s + c.contractingPrice, 0);
      let r = "\u{1F3D7}\uFE0F **Contractors Summary**\n\n";
      r += `**Total Contractors:** ${contractors.length} (${active.length} active)\n`;
      r += `**Total Contract Value:** ${formatINR(total)}\n\n`;
      if (contractors.length > 0) {
        r += "**Contractor List:**\n";
        contractors.forEach((c, i) => {
          r += `${i + 1}. ${c.name} \u2013 ${c.trade} (${formatINR(c.contractingPrice)})\n`;
        });
      }
      return r;
    }

    // Check for specific project name
    const matchedProject = projects.find((p) =>
      q.includes(p.name.toLowerCase()),
    );
    if (matchedProject) {
      const projectPayments = payments.filter(
        (p) => p.project === matchedProject.name,
      );
      const totalPaid = projectPayments.reduce((s, p) => s + p.amount, 0);
      const outstanding = Math.max(0, matchedProject.budget - totalPaid);
      let r = `\u{1F4CB} **Project: ${matchedProject.name}**\n\n`;
      r += `**Client:** ${matchedProject.client}\n`;
      r += `**Status:** ${matchedProject.status}\n`;
      r += `**Budget:** ${formatINR(matchedProject.budget)}\n`;
      r += `**Total Payments:** ${formatINR(totalPaid)} (${projectPayments.length} payments)\n`;
      r += `**Outstanding:** ${formatINR(outstanding)}\n`;
      return r;
    }

    return "I can help with:\n\n\u{1F4CB} **projects** \u2013 all project details\n\u{1F4B3} **payments** \u2013 payment totals\n\u{1F4CA} **outstanding** \u2013 outstanding amounts\n\u{1F3D7}\uFE0F **contractors** \u2013 contractor list\n\nOr type a project name for its details.";
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    const query = input;
    setTimeout(() => {
      const response = processQuery(query);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 700);
  };

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-6 h-[calc(100vh-12rem)]">
      <Card
        className="h-full flex flex-col shadow-lg"
        style={{ border: `2px solid ${GREEN}` }}
      >
        <CardHeader
          className="border-b"
          style={{ background: "linear-gradient(to right, #f0fff4, #d4edda)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center"
                style={{ background: GREEN }}
              >
                <Bot className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle
                  style={{ color: GREEN }}
                  className="font-bold text-xl"
                >
                  PayGo Assistant
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Your intelligent PayGo helper
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMessages([])}
              style={{ borderColor: GREEN, color: GREEN }}
            >
              Clear Chat
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ background: GREEN }}
                    >
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div
                    className="max-w-[75%] rounded-2xl p-4 shadow-sm"
                    style={{
                      background: msg.role === "user" ? GREEN : "#f0fff4",
                      color: msg.role === "user" ? "#fff" : "#1a3a1a",
                      border:
                        msg.role === "assistant"
                          ? "1px solid #c3e6cb"
                          : undefined,
                    }}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </div>
                    <div
                      className="text-xs mt-2"
                      style={{
                        color:
                          msg.role === "user"
                            ? "rgba(255,255,255,0.7)"
                            : "#888",
                      }}
                    >
                      {fmtTime(msg.timestamp)}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <div
                      className="h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: "#555" }}
                    >
                      U
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div
                    className="h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: GREEN }}
                  >
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((d) => (
                        <div
                          key={d}
                          className="h-2 w-2 rounded-full animate-bounce"
                          style={{
                            background: GREEN,
                            animationDelay: `${d}ms`,
                          }}
                        />
                      ))}
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
                placeholder="Ask about projects, payments, outstanding..."
                className="flex-1 border-2 focus:outline-none"
                style={{ borderColor: isTyping ? "#ccc" : GREEN }}
                disabled={isTyping}
                data-ocid="paygo.ai.input"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                style={{ background: GREEN }}
                className="text-white px-6 rounded-lg"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <Info className="h-3 w-3" />
              <span>
                PayGo Assistant provides read-only access to your PayGo data
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
