import { GoogleGenAI } from "@google/genai";
import { queryToolDecls } from "./tools";
import {
  getCustomerDebt,
  getSalesBetween,
  getProfitByVariant,
  getStockOnHand,
  getSupplierBalance,
  getTopSellingVariants,
  getDebtorsAged,
  getDayBook,
  getDebtors,
  getPurchasesBetween,
  getCustomers,
} from "@/lib/queries";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

function buildSystemPrompt(): string {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const monthStart = `${year}-${month}-01`;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - now.getUTCDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  return (
    "You are a helpful assistant for Neema Tyres shop in Kenya. " +
    "Answer questions about sales, stock, debt, suppliers, customers, and purchases using the available tools. " +
    "Be concise and clear. Format monetary amounts in KES with comma separators (e.g. KES 45,000).\n\n" +
    `TODAY IS ${todayStr}. Use this to resolve relative dates:\n` +
    `- "today" = ${todayStr}\n` +
    `- "this week" = ${weekStartStr} to ${todayStr}\n` +
    `- "this month" = ${monthStart} to ${todayStr}\n` +
    `- "yesterday" = ${new Date(now.getTime() - 86400000).toISOString().slice(0, 10)}\n\n` +
    "Tool guidance:\n" +
    "- 'what did I sell today/this week/this month?' → get_sales_between\n" +
    "- 'what did I buy/purchase today/this week?' → get_purchases_between\n" +
    "- 'who owes the most / who is my biggest debtor / highest debtor / top debtor?' → get_all_debtors (returns sorted highest first)\n" +
    "- 'how much does [name] owe?' → get_customer_debt\n" +
    "- 'show me all debtors' → get_all_debtors\n" +
    "- 'what stock do I have / what tyres are in stock?' → get_stock_on_hand\n" +
    "- 'best selling tyres / top sellers?' → get_top_selling_variants\n" +
    "- 'aged debtors / who hasn't paid in 60 days?' → get_debtors_aged\n" +
    "- 'what happened today / day summary?' → get_day_book\n" +
    "- 'find customer / is [name] a customer?' → list_customers\n" +
    "Never write SQL or raw code."
  );
}

function serialize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    const s = (value as { toString?: () => string }).toString?.();
    if (s && /^-?\d+(\.\d+)?$/.test(s)) return s;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serialize(v)])
    );
  }
  return value;
}

async function runTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "get_customer_debt":
      return serialize(await getCustomerDebt(args.customer_name as string));
    case "get_sales_between":
      return serialize(await getSalesBetween(new Date(args.from as string), new Date(args.to as string)));
    case "get_profit_by_variant":
      return serialize(await getProfitByVariant(new Date(args.from as string), new Date(args.to as string)));
    case "get_stock_on_hand":
      return serialize(
        await getStockOnHand(
          Object.keys(args).length > 0
            ? (args as { search?: string; position?: string; brand?: string })
            : undefined
        )
      );
    case "get_supplier_balance":
      return serialize(await getSupplierBalance(args.supplier_name as string));
    case "get_top_selling_variants":
      return serialize(
        await getTopSellingVariants(
          new Date(args.from as string),
          new Date(args.to as string),
          args.limit as number | undefined
        )
      );
    case "get_debtors_aged":
      return serialize(await getDebtorsAged(new Date(args.as_of as string)));
    case "get_day_book":
      return serialize(await getDayBook(new Date(args.date as string)));
    case "get_all_debtors": {
      const debtors = await getDebtors();
      const sorted = [...debtors].sort((a, b) =>
        b.outstanding.comparedTo(a.outstanding)
      );
      return serialize(
        sorted.map((d) => ({
          name: d.name,
          phone: d.phone,
          outstanding: d.outstanding,
          oldestUnpaid: d.oldestUnpaid,
        }))
      );
    }
    case "get_purchases_between":
      return serialize(
        await getPurchasesBetween(
          new Date(args.from as string),
          new Date(args.to as string)
        )
      );
    case "list_customers":
      return serialize(await getCustomers());
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function runQueryAgent(userMessage: string): Promise<string> {
  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: buildSystemPrompt(),
      tools: [{ functionDeclarations: queryToolDecls }],
    },
  });

  let response = await chat.sendMessage({ message: userMessage });

  for (let i = 0; i < 10; i++) {
    const calls = response.functionCalls;
    if (!calls || calls.length === 0) {
      return response.text ?? "No response.";
    }

    const toolParts = await Promise.all(
      calls.map(async (call) => {
        const output = await runTool(call.name!, call.args as Record<string, unknown>);
        return {
          functionResponse: {
            name: call.name!,
            response: { result: output },
          },
        };
      })
    );

    response = await chat.sendMessage({ message: toolParts });
  }

  return "Unable to complete the query. Please try rephrasing your question.";
}
