"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, ChevronDown, Lightbulb, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";
import type {
  AssistantMessageDTO,
  StepType,
  StepDTO,
  DocumentDTO,
  VerificationLogDTO,
} from "@/domain/types";
import {
  getAssistantResponse,
} from "@/domain/assistant/messages";
import { Button } from "@/components/ui/button";

interface AssistantPanelProps {
  caseId: string;
  messages: AssistantMessageDTO[];
  currentStepType: StepType;
  steps: StepDTO[];
  documents: DocumentDTO[];
  statusLogs: VerificationLogDTO[];
  businessName?: string;
  onMessagesUpdate?: (messages: AssistantMessageDTO[]) => void;
}

export function AssistantPanel({
  caseId,
  messages,
  currentStepType,
  steps,
  documents,
  statusLogs,
  businessName,
  onMessagesUpdate,
}: AssistantPanelProps) {
  const [localMessages, setLocalMessages] = useState(messages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentStep = steps.find((s) => s.type === currentStepType);
  const assistantCtx = {
    stepType: currentStepType,
    stepStatus: currentStep?.status ?? "NOT_STARTED",
    steps,
    documents,
    statusLogs,
    businessName,
  };
  const contextualResponse = getAssistantResponse(assistantCtx);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`/api/cases/${caseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "USER",
          content: text,
          stepType: currentStepType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLocalMessages(data.data);
        onMessagesUpdate?.(data.data);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <aside
      className={cn(
        "flex flex-col border-l border-zinc-200 bg-zinc-50 transition-all duration-300",
        collapsed ? "w-12" : "w-80 xl:w-96"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
          <Bot className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-800">Asistente</p>
            <p className="text-xs text-zinc-500">Guía de activación</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded hover:bg-zinc-100 text-zinc-500"
          aria-label={collapsed ? "Expandir" : "Colapsar"}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed ? "-rotate-90" : "rotate-0"
            )}
          />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Contextual guidance */}
          <div className="border-b border-zinc-200 bg-white p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Bot className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-blue-700">
                  {contextualResponse.greeting}
                </p>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {contextualResponse.mainMessage}
                </p>
              </div>
            </div>

            {contextualResponse.warnings.length > 0 && (
              <div className="space-y-1">
                {contextualResponse.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-1.5 rounded-md bg-amber-50 border border-amber-100 p-2"
                  >
                    <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">{w}</p>
                  </div>
                ))}
              </div>
            )}

            {contextualResponse.tips.length > 0 && (
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-1 text-xs text-blue-600 font-medium list-none">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Consejos ({contextualResponse.tips.length})
                </summary>
                <ul className="mt-1.5 space-y-1 pl-1">
                  {contextualResponse.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {/* Message history */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {localMessages.length === 0 && (
              <p className="text-center text-xs text-zinc-400 py-4">
                El historial del asistente aparecerá aquí.
              </p>
            )}
            {localMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-200 bg-white p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Escribe tu pregunta..."
                className="flex-1 min-w-0 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={sending}
              />
              <Button
                size="sm"
                onClick={handleSend}
                loading={sending}
                disabled={!input.trim()}
                aria-label="Enviar"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

function MessageBubble({ message }: { message: AssistantMessageDTO }) {
  const isAssistant = message.role === "ASSISTANT";
  return (
    <div
      className={cn(
        "flex gap-2",
        isAssistant ? "items-start" : "items-start flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white",
          isAssistant ? "bg-blue-500" : "bg-zinc-600"
        )}
      >
        {isAssistant ? (
          <Bot className="h-3.5 w-3.5" />
        ) : (
          <User className="h-3.5 w-3.5" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed",
          isAssistant
            ? "bg-white border border-zinc-200 text-zinc-700"
            : "bg-blue-600 text-white"
        )}
      >
        <p>{message.content}</p>
        <p
          className={cn(
            "mt-1 text-[10px]",
            isAssistant ? "text-zinc-400" : "text-blue-200"
          )}
        >
          {formatDateTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
