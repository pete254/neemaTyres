import { SchemaType } from "@google/generative-ai";
import type { FunctionDeclaration } from "@google/generative-ai";

export const queryToolDecls: FunctionDeclaration[] = [
  {
    name: "get_customer_debt",
    description:
      "Get outstanding debt for a specific customer with FIFO allocation of collections. Returns debt lines and totals.",
    parameters: {
      type: SchemaType.OBJECT,
      required: ["customer_name"],
      properties: {
        customer_name: {
          type: SchemaType.STRING,
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
      type: SchemaType.OBJECT,
      required: ["from", "to"],
      properties: {
        from: { type: SchemaType.STRING, description: "Start date ISO 8601 e.g. 2025-01-01" },
        to: { type: SchemaType.STRING, description: "End date ISO 8601 e.g. 2025-01-31" },
      },
    },
  },
  {
    name: "get_profit_by_variant",
    description:
      "Get gross profit by product variant for a date range. COGS uses WAC at time of sale.",
    parameters: {
      type: SchemaType.OBJECT,
      required: ["from", "to"],
      properties: {
        from: { type: SchemaType.STRING, description: "Start date ISO 8601" },
        to: { type: SchemaType.STRING, description: "End date ISO 8601" },
      },
    },
  },
  {
    name: "get_stock_on_hand",
    description:
      "Get current stock on hand with WAC values. Optionally filter by search term, position, or brand.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: {
          type: SchemaType.STRING,
          description: "Search by size, pattern code, or brand name",
        },
        position: {
          type: SchemaType.STRING,
          description: "Filter by tyre position: AP, DIFF, STEERING, or NONE",
        },
        brand: {
          type: SchemaType.STRING,
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
      type: SchemaType.OBJECT,
      required: ["supplier_name"],
      properties: {
        supplier_name: {
          type: SchemaType.STRING,
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
      type: SchemaType.OBJECT,
      required: ["from", "to"],
      properties: {
        from: { type: SchemaType.STRING, description: "Start date ISO 8601" },
        to: { type: SchemaType.STRING, description: "End date ISO 8601" },
        limit: {
          type: SchemaType.NUMBER,
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
      type: SchemaType.OBJECT,
      required: ["as_of"],
      properties: {
        as_of: {
          type: SchemaType.STRING,
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
      type: SchemaType.OBJECT,
      required: ["date"],
      properties: {
        date: {
          type: SchemaType.STRING,
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
    type: SchemaType.OBJECT,
    required: ["transactions"],
    properties: {
      transactions: {
        type: SchemaType.ARRAY,
        description: "List of transactions parsed from the message",
        items: {
          type: SchemaType.OBJECT,
          required: ["type", "date", "lines"],
          properties: {
            type: {
              type: SchemaType.STRING,
              description: "Transaction type: sale or purchase",
            },
            date: {
              type: SchemaType.STRING,
              description: "ISO 8601 date string (YYYY-MM-DD). Use today if unspecified.",
            },
            customerName: {
              type: SchemaType.STRING,
              description: "Customer name for sales",
            },
            supplierName: {
              type: SchemaType.STRING,
              description: "Supplier name for purchases",
            },
            terms: {
              type: SchemaType.STRING,
              description: "Purchase payment terms: CASH, CREDIT, or FREE",
            },
            lines: {
              type: SchemaType.ARRAY,
              description: "Product lines in this transaction",
              items: {
                type: SchemaType.OBJECT,
                required: ["qty", "raw"],
                properties: {
                  raw: {
                    type: SchemaType.STRING,
                    description: "Original text fragment for this line",
                  },
                  qty: { type: SchemaType.NUMBER, description: "Quantity" },
                  sizeAlias: {
                    type: SchemaType.STRING,
                    description: "Tyre size as written (e.g. '11R', '315', '825R20')",
                  },
                  brandName: {
                    type: SchemaType.STRING,
                    description: "Brand name (e.g. 'Roadshine', 'Linglong')",
                  },
                  position: {
                    type: SchemaType.STRING,
                    description:
                      "Tyre position: AP, DIFF, STEERING, or NONE. OMIT if not explicitly stated.",
                  },
                  unitPrice: {
                    type: SchemaType.NUMBER,
                    description:
                      "Selling price per unit for sales. OMIT if not stated.",
                  },
                  unitCost: {
                    type: SchemaType.NUMBER,
                    description:
                      "Cost price per unit for purchases. OMIT if not stated.",
                  },
                  useStockPrice: {
                    type: SchemaType.BOOLEAN,
                    description:
                      "Set true when user says 'stock price'. Do NOT also set unitPrice.",
                  },
                },
              },
            },
            payments: {
              type: SchemaType.ARRAY,
              description: "Payment breakdown for sales",
              items: {
                type: SchemaType.OBJECT,
                required: ["channel"],
                properties: {
                  channel: {
                    type: SchemaType.STRING,
                    description:
                      "Payment channel. 'mum'/'M-Pesa' → MPESA; 'cash' → CASH; 'debt'/'deni'/'on credit' → DEBT.",
                  },
                  amount: {
                    type: SchemaType.NUMBER,
                    description: "Amount for this channel. OMIT if this is the balance.",
                  },
                  isBalance: {
                    type: SchemaType.BOOLEAN,
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
