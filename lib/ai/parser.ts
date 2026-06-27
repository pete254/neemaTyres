import Anthropic from "@anthropic-ai/sdk";
import type { RawTransaction } from "./types";

const client = new Anthropic();

const PARSE_TOOL = {
  name: "parse_transactions",
  description:
    "Extract structured transaction data from natural language tyre shop entry text.",
  input_schema: {
    type: "object" as const,
    required: ["transactions"],
    properties: {
      transactions: {
        type: "array",
        description: "List of transactions parsed from the message",
        items: {
          type: "object",
          required: ["type", "date", "lines"],
          properties: {
            type: {
              type: "string",
              enum: ["sale", "purchase"],
              description: "Transaction type",
            },
            date: {
              type: "string",
              description:
                "ISO 8601 date string (YYYY-MM-DD). Use today if unspecified.",
            },
            customerName: {
              type: "string",
              description: "Customer name for sales",
            },
            supplierName: {
              type: "string",
              description: "Supplier name for purchases",
            },
            terms: {
              type: "string",
              enum: ["CASH", "CREDIT", "FREE"],
              description: "Purchase payment terms",
            },
            lines: {
              type: "array",
              description: "Product lines in this transaction",
              items: {
                type: "object",
                required: ["qty", "raw"],
                properties: {
                  raw: {
                    type: "string",
                    description: "Original text fragment for this line",
                  },
                  qty: { type: "number", description: "Quantity" },
                  sizeAlias: {
                    type: "string",
                    description: "Tyre size as written (e.g. '11R', '315', '825R20')",
                  },
                  brandName: {
                    type: "string",
                    description: "Brand name (e.g. 'Roadshine', 'Linglong')",
                  },
                  position: {
                    type: "string",
                    enum: ["AP", "DIFF", "STEERING", "NONE"],
                    description:
                      "Tyre position. OMIT if not explicitly stated — never guess.",
                  },
                  unitPrice: {
                    type: "number",
                    description:
                      "Selling price per unit for sales. OMIT if not stated.",
                  },
                  unitCost: {
                    type: "number",
                    description:
                      "Cost price per unit for purchases. OMIT if not stated.",
                  },
                  useStockPrice: {
                    type: "boolean",
                    description:
                      "Set true when user says 'stock price' — do NOT also set unitPrice.",
                  },
                },
              },
            },
            payments: {
              type: "array",
              description: "Payment breakdown for sales",
              items: {
                type: "object",
                required: ["channel"],
                properties: {
                  channel: {
                    type: "string",
                    enum: ["CASH", "MPESA", "DEBT"],
                    description:
                      "Payment channel. 'mum' or 'M-Pesa' → MPESA; 'cash' → CASH; 'debt'/'deni'/'on credit' → DEBT.",
                  },
                  amount: {
                    type: "number",
                    description: "Amount for this channel. OMIT if this is the balance.",
                  },
                  isBalance: {
                    type: "boolean",
                    description:
                      "Set true if this payment covers the remaining balance (e.g. 'rest debt', 'balance MPESA').",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export async function parseEntryMessage(
  message: string,
  today: Date = new Date()
): Promise<{ transactions: RawTransaction[] }> {
  const todayStr = today.toISOString().slice(0, 10);

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    tools: [PARSE_TOOL],
    tool_choice: { type: "any" },
    system: `You are a tyre shop transaction parser. Today is ${todayStr}.

Parse the user's message using the parse_transactions tool. Strict rules:
- Payment vocabulary: "mum" / "M-Pesa" → MPESA channel; "cash" → CASH; "debt" / "deni" / "on credit" → DEBT
- "stock price" → set useStockPrice: true; do NOT also set unitPrice
- "rest" / "balance" / "remainder" after a payment amount → set isBalance: true on the balance channel
- Relative day names (e.g. "Saturday", "Monday") → convert to the most recent past occurrence of that weekday
- Position (AP / DIFF / STEERING / NONE): include ONLY when explicitly stated. Never infer from context.
- Prices and costs: include ONLY when explicitly stated. Never guess.
- One message may encode multiple transactions on different dates — split into separate entries.
- Language: English only. Do not produce bilingual output.`,
    messages: [{ role: "user", content: message }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { transactions: [] };
  }

  const input = toolUse.input as { transactions: RawTransaction[] };
  return { transactions: input.transactions ?? [] };
}
