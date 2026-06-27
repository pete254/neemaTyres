import { GoogleGenerativeAI, FunctionCallingMode } from "@google/generative-ai";
import { parseToolDecl } from "./tools";
import type { RawTransaction } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function parseEntryMessage(
  message: string,
  today: Date = new Date()
): Promise<{ transactions: RawTransaction[] }> {
  const todayStr = today.toISOString().slice(0, 10);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{ functionDeclarations: [parseToolDecl] }],
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingMode.ANY },
    },
    systemInstruction: `You are a tyre shop transaction parser. Today is ${todayStr}.

Parse the user's message using the parse_transactions function. Strict rules:
- Payment vocabulary: "mum" / "M-Pesa" → MPESA channel; "cash" → CASH; "debt" / "deni" / "on credit" → DEBT
- "stock price" → set useStockPrice: true; do NOT also set unitPrice
- "rest" / "balance" / "remainder" after a payment amount → set isBalance: true on the balance channel
- Relative day names (e.g. "Saturday", "Monday") → convert to the most recent past occurrence of that weekday
- Position (AP / DIFF / STEERING / NONE): include ONLY when explicitly stated. Never infer from context.
- Prices and costs: include ONLY when explicitly stated. Never guess.
- One message may encode multiple transactions on different dates — split into separate entries.`,
  });

  const result = await model.generateContent(message);
  const calls = result.response.functionCalls();

  if (!calls || calls.length === 0) {
    return { transactions: [] };
  }

  const call = calls.find((c) => c.name === "parse_transactions");
  if (!call) return { transactions: [] };

  const input = call.args as { transactions: RawTransaction[] };
  return { transactions: input.transactions ?? [] };
}
