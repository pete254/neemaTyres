import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources";
import { queryTools } from "./tools";
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

const client = new Anthropic();

const SYSTEM =
  "You are a helpful assistant for Neema Tyres shop. Answer questions about sales, " +
  "stock, debt, and suppliers using the available tools. Be concise and clear. " +
  "Format monetary amounts in KES with comma separators (e.g. KES 45,000). " +
  "When asked about a date range, pick sensible defaults if the user is vague " +
  "(e.g. 'this month' = first to today). Never write SQL or raw code.";

function serialize(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v instanceof Date) return v.toISOString();
    if (v && typeof v === "object" && typeof (v as { toString?: unknown }).toString === "function") {
      const s = (v as { toString: () => string }).toString();
      if (/^-?\d+(\.\d+)?$/.test(s) && !Array.isArray(v)) return s;
    }
    return v;
  });
}

async function runTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_customer_debt":
      return serialize(await getCustomerDebt(input.customer_name as string));

    case "get_sales_between":
      return serialize(
        await getSalesBetween(
          new Date(input.from as string),
          new Date(input.to as string)
        )
      );

    case "get_profit_by_variant":
      return serialize(
        await getProfitByVariant(
          new Date(input.from as string),
          new Date(input.to as string)
        )
      );

    case "get_stock_on_hand":
      return serialize(
        await getStockOnHand(
          Object.keys(input).length > 0
            ? (input as { search?: string; position?: string; brand?: string })
            : undefined
        )
      );

    case "get_supplier_balance":
      return serialize(
        await getSupplierBalance(input.supplier_name as string)
      );

    case "get_top_selling_variants":
      return serialize(
        await getTopSellingVariants(
          new Date(input.from as string),
          new Date(input.to as string),
          input.limit as number | undefined
        )
      );

    case "get_debtors_aged":
      return serialize(
        await getDebtorsAged(new Date(input.as_of as string))
      );

    case "get_day_book":
      return serialize(await getDayBook(new Date(input.date as string)));

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export async function runQueryAgent(userMessage: string): Promise<string> {
  const messages: MessageParam[] = [{ role: "user", content: userMessage }];

  for (let i = 0; i < 10; i++) {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      tools: queryTools,
      system: SYSTEM,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text");
      return text?.text ?? "";
    }

    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter((b) => b.type === "tool_use");
      messages.push({ role: "assistant", content: response.content });

      const toolResults = await Promise.all(
        toolUses.map(async (block) => {
          if (block.type !== "tool_use") return null;
          const output = await runTool(
            block.name,
            block.input as Record<string, unknown>
          );
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: output,
          };
        })
      );

      messages.push({
        role: "user",
        content: toolResults.filter(
          Boolean
        ) as Anthropic.ToolResultBlockParam[],
      });
    }
  }

  return "Unable to complete the query. Please try rephrasing your question.";
}
