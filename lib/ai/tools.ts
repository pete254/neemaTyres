import type { Tool } from "@anthropic-ai/sdk/resources";

export const queryTools: Tool[] = [
  {
    name: "get_customer_debt",
    description:
      "Get outstanding debt for a specific customer with FIFO allocation of collections. Returns debt lines and totals.",
    input_schema: {
      type: "object",
      required: ["customer_name"],
      properties: {
        customer_name: {
          type: "string",
          description: "Customer name (partial match supported)",
        },
      },
    },
  },
  {
    name: "get_sales_between",
    description:
      "Get all sales between two dates, split by payment channel (CASH/MPESA/DEBT). Returns daily breakdown.",
    input_schema: {
      type: "object",
      required: ["from", "to"],
      properties: {
        from: { type: "string", description: "Start date ISO 8601 e.g. 2025-01-01" },
        to: { type: "string", description: "End date ISO 8601 e.g. 2025-01-31" },
      },
    },
  },
  {
    name: "get_profit_by_variant",
    description:
      "Get gross profit by product variant for a date range. COGS uses WAC at time of sale.",
    input_schema: {
      type: "object",
      required: ["from", "to"],
      properties: {
        from: { type: "string", description: "Start date ISO 8601" },
        to: { type: "string", description: "End date ISO 8601" },
      },
    },
  },
  {
    name: "get_stock_on_hand",
    description:
      "Get current stock on hand with WAC values. Optionally filter by search term, position, or brand.",
    input_schema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Search by size, pattern code, or brand name",
        },
        position: {
          type: "string",
          enum: ["AP", "DIFF", "STEERING", "NONE"],
          description: "Filter by tyre position",
        },
        brand: {
          type: "string",
          description: "Filter by brand name (partial match)",
        },
      },
    },
  },
  {
    name: "get_supplier_balance",
    description:
      "Get outstanding balance and full ledger statement for a supplier.",
    input_schema: {
      type: "object",
      required: ["supplier_name"],
      properties: {
        supplier_name: {
          type: "string",
          description: "Supplier name (partial match supported)",
        },
      },
    },
  },
  {
    name: "get_top_selling_variants",
    description:
      "Get top-selling product variants by quantity sold in a date range.",
    input_schema: {
      type: "object",
      required: ["from", "to"],
      properties: {
        from: { type: "string", description: "Start date ISO 8601" },
        to: { type: "string", description: "End date ISO 8601" },
        limit: {
          type: "number",
          description: "Maximum number of variants to return (default 10)",
        },
      },
    },
  },
  {
    name: "get_debtors_aged",
    description:
      "Get aged debtors analysis with buckets: 0-30 days, 31-60 days, 60+ days.",
    input_schema: {
      type: "object",
      required: ["as_of"],
      properties: {
        as_of: {
          type: "string",
          description: "As-of date ISO 8601 e.g. 2025-06-01",
        },
      },
    },
  },
  {
    name: "get_day_book",
    description:
      "Get full day book for a date: sales, purchases, debt collections, supplier payments, and returns.",
    input_schema: {
      type: "object",
      required: ["date"],
      properties: {
        date: {
          type: "string",
          description: "Date ISO 8601 e.g. 2025-06-27",
        },
      },
    },
  },
];
