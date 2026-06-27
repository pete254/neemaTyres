import { Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";

export const queryToolDecls: FunctionDeclaration[] = [
  {
    name: "get_customer_debt",
    description:
      "Get outstanding debt for a specific customer with FIFO allocation of collections. Returns debt lines and totals.",
    parameters: {
      type: Type.OBJECT,
      required: ["customer_name"],
      properties: {
        customer_name: {
          type: Type.STRING,
          description: "Customer name (partial match supported)",
        },
      },
    },
  },
  {
    name: "get_sales_between",
    description:
      "Get all sales between two dates, split by payment channel (CASH/MPESA/DEBT). Returns daily breakdown.",
    parameters: {
      type: Type.OBJECT,
      required: ["from", "to"],
      properties: {
        from: { type: Type.STRING, description: "Start date ISO 8601 e.g. 2025-01-01" },
        to: { type: Type.STRING, description: "End date ISO 8601 e.g. 2025-01-31" },
      },
    },
  },
  {
    name: "get_profit_by_variant",
    description:
      "Get gross profit by product variant for a date range. COGS uses WAC at time of sale.",
    parameters: {
      type: Type.OBJECT,
      required: ["from", "to"],
      properties: {
        from: { type: Type.STRING, description: "Start date ISO 8601" },
        to: { type: Type.STRING, description: "End date ISO 8601" },
      },
    },
  },
  {
    name: "get_stock_on_hand",
    description:
      "Get current stock on hand with WAC values. Optionally filter by search term, position, or brand.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        search: {
          type: Type.STRING,
          description: "Search by size, pattern code, or brand name",
        },
        position: {
          type: Type.STRING,
          description: "Filter by tyre position: AP, DIFF, STEERING, or NONE",
        },
        brand: {
          type: Type.STRING,
          description: "Filter by brand name (partial match)",
        },
      },
    },
  },
  {
    name: "get_supplier_balance",
    description:
      "Get outstanding balance and full ledger statement for a supplier.",
    parameters: {
      type: Type.OBJECT,
      required: ["supplier_name"],
      properties: {
        supplier_name: {
          type: Type.STRING,
          description: "Supplier name (partial match supported)",
        },
      },
    },
  },
  {
    name: "get_top_selling_variants",
    description:
      "Get top-selling product variants by quantity sold in a date range.",
    parameters: {
      type: Type.OBJECT,
      required: ["from", "to"],
      properties: {
        from: { type: Type.STRING, description: "Start date ISO 8601" },
        to: { type: Type.STRING, description: "End date ISO 8601" },
        limit: {
          type: Type.NUMBER,
          description: "Maximum number of variants to return (default 10)",
        },
      },
    },
  },
  {
    name: "get_debtors_aged",
    description:
      "Get aged debtors analysis with buckets: 0-30 days, 31-60 days, 60+ days.",
    parameters: {
      type: Type.OBJECT,
      required: ["as_of"],
      properties: {
        as_of: {
          type: Type.STRING,
          description: "As-of date ISO 8601 e.g. 2025-06-01",
        },
      },
    },
  },
  {
    name: "get_day_book",
    description:
      "Get full day book for a date: sales, purchases, debt collections, supplier payments, and returns.",
    parameters: {
      type: Type.OBJECT,
      required: ["date"],
      properties: {
        date: {
          type: Type.STRING,
          description: "Date ISO 8601 e.g. 2025-06-27",
        },
      },
    },
  },
];

export const parseToolDecl: FunctionDeclaration = {
  name: "parse_transactions",
  description:
    "Extract structured transaction data from natural language tyre shop entry text.",
  parameters: {
    type: Type.OBJECT,
    required: ["transactions"],
    properties: {
      transactions: {
        type: Type.ARRAY,
        description: "List of transactions parsed from the message",
        items: {
          type: Type.OBJECT,
          required: ["type", "date", "lines"],
          properties: {
            type: {
              type: Type.STRING,
              description: "Transaction type: sale or purchase",
            },
            date: {
              type: Type.STRING,
              description: "ISO 8601 date string (YYYY-MM-DD). Use today if unspecified.",
            },
            customerName: {
              type: Type.STRING,
              description: "Customer name for sales",
            },
            supplierName: {
              type: Type.STRING,
              description: "Supplier name for purchases",
            },
            terms: {
              type: Type.STRING,
              description: "Purchase payment terms: CASH, CREDIT, or FREE",
            },
            lines: {
              type: Type.ARRAY,
              description: "Product lines in this transaction",
              items: {
                type: Type.OBJECT,
                required: ["qty", "raw"],
                properties: {
                  raw: {
                    type: Type.STRING,
                    description: "Original text fragment for this line",
                  },
                  qty: { type: Type.NUMBER, description: "Quantity" },
                  sizeAlias: {
                    type: Type.STRING,
                    description: "Tyre size as written (e.g. '11R', '315', '825R20')",
                  },
                  brandName: {
                    type: Type.STRING,
                    description: "Brand name (e.g. 'Roadshine', 'Linglong')",
                  },
                  position: {
                    type: Type.STRING,
                    description:
                      "Tyre position: AP, DIFF, STEERING, or NONE. OMIT if not explicitly stated.",
                  },
                  unitPrice: {
                    type: Type.NUMBER,
                    description:
                      "Selling price per unit for sales. OMIT if not stated.",
                  },
                  unitCost: {
                    type: Type.NUMBER,
                    description:
                      "Cost price per unit for purchases. OMIT if not stated.",
                  },
                  useStockPrice: {
                    type: Type.BOOLEAN,
                    description:
                      "Set true when user says 'stock price'. Do NOT also set unitPrice.",
                  },
                },
              },
            },
            payments: {
              type: Type.ARRAY,
              description: "Payment breakdown for sales",
              items: {
                type: Type.OBJECT,
                required: ["channel"],
                properties: {
                  channel: {
                    type: Type.STRING,
                    description:
                      "Payment channel. 'mum'/'M-Pesa' → MPESA; 'cash' → CASH; 'debt'/'deni'/'on credit' → DEBT.",
                  },
                  amount: {
                    type: Type.NUMBER,
                    description: "Amount for this channel. OMIT if this is the balance.",
                  },
                  isBalance: {
                    type: Type.BOOLEAN,
                    description:
                      "True if this payment covers the remaining balance (e.g. 'rest debt', 'balance MPESA').",
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
