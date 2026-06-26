import type Decimal from "decimal.js";
import type {
  PaymentChannel,
  PurchaseTerms,
  CollectionChannel,
  ReturnType,
} from "@/app/generated/prisma/client";

export type { PaymentChannel, PurchaseTerms, CollectionChannel, ReturnType };

export interface PostPurchaseInput {
  supplierId?: string;
  date: Date;
  terms: PurchaseTerms;
  recordedById: string;
  lines: Array<{
    variantId: string;
    qty: number;
    unitCost: Decimal; // 0 for FREE terms
  }>;
}

export interface PostSaleInput {
  customerId?: string;
  date: Date;
  recordedById: string;
  lines: Array<{
    variantId: string;
    qty: number;
    unitPrice: Decimal;
  }>;
  payments: Array<{
    channel: PaymentChannel;
    amount: Decimal;
  }>;
}

export interface PostDebtCollectionInput {
  customerId: string;
  amount: Decimal;
  channel: CollectionChannel;
  date: Date;
  note?: string;
  recordedById: string;
}

export interface PostSupplierPaymentInput {
  supplierId: string;
  amount: Decimal;
  date: Date;
  note?: string;
  recordedById: string;
}

export interface PostReturnInput {
  type: ReturnType;
  originalSaleLineId?: string;
  originalPurchaseLineId?: string;
  variantId: string;
  qty: number;
  unitValue: Decimal;
  date: Date;
  note?: string;
  recordedById: string;
}
