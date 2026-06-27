import { GoogleGenerativeAI } from "@google/generative-ai";
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
} from "@/lib/queries";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM =
  "You are a helpful assistant for Neema Tyres shop. Answer questions about sales, " +
  "stock, debt, and suppliers using the available tools. Be concise and clear. " +
  "Format monetary amounts in KES with comma separators (e.g. KES 45,000). " +
  "When asked about a date range, pick sensible defaults if the user is vague " +
  "(e.g. 'this month' = first to today). Never write SQL or raw code.";

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
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function runQueryAgent(userMessage: string): Promise<string> {
  const model = genAI.getGenerativeModel(
    {
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM,
      tools: [{ functionDeclarations: queryToolDecls }],
    },
    { apiVersion: "v1" }
  );

  const chat = model.startChat();
  let result = await chat.sendMessage(userMessage);

  for (let i = 0; i < 10; i++) {
    const calls = result.response.functionCalls();
    if (!calls || calls.length === 0) {
      return result.response.text();
    }

    const toolParts = await Promise.all(
      calls.map(async (call) => {
        const output = await runTool(call.name, call.args as Record<string, unknown>);
        return {
          functionResponse: {
            name: call.name,
            response: { result: output },
          },
        };
      })
    );

    result = await chat.sendMessage(toolParts);
  }

  return "Unable to complete the query. Please try rephrasing your question.";
}
