export { getInventory } from "./inventory";
export { getDebtors } from "./debtors";
export { getSuppliers, getSupplierStatement } from "./suppliers";
export { getDailyReport, getReportSummary } from "./reports";
export { getExceptionFlags } from "./exceptions";
export { getVariants } from "./variants";
export { getCustomers } from "./customers";

// Phase 6 — predetermined query layer
export { getCustomerDebt } from "./customerDebt";
export type { CustomerDebtResult, CustomerDebtLine } from "./customerDebt";

export { getSalesBetween } from "./sales";
export type { SalesBetweenResult, SaleDay } from "./sales";

export { getProfitByVariant } from "./profit";
export type { VariantProfit } from "./profit";

export { getProfitBreakdown } from "./profitBreakdown";
export type {
  ProfitBreakdownResult,
  ProfitDay,
  ProfitLineRow,
  ProfitFilters,
} from "./profitBreakdown";

export { getStockOnHand } from "./stock";
export type { StockOnHandResult, StockLine } from "./stock";

export { getSupplierBalance } from "./supplierBalance";
export type { SupplierBalanceResult, SupplierStatementLine } from "./supplierBalance";

export { getTopSellingVariants } from "./topVariants";
export type { TopVariant } from "./topVariants";

export { getDebtorsAged } from "./aged";
export type { AgedDebtorsResult, AgedDebtor } from "./aged";

export { getDayBook } from "./dayBook";
export type { DayBookResult } from "./dayBook";

export { getStockPerformance, getStaleStock } from "./stockPerformance";
export type {
  StockPerformanceResult,
  PerfRow,
  StaleStockResult,
  StaleItem,
} from "./stockPerformance";

export { getStockableVariants, getVariantStockLedger } from "./stockLedger";
export type {
  StockableVariant,
  VariantLedger,
  LedgerRow,
  LedgerRowKind,
} from "./stockLedger";

export { getPurchasesBetween } from "./purchasesBetween";
export type {
  PurchasesBetweenResult,
  PurchaseDay,
  PurchaseLineItem,
} from "./purchasesBetween";

export { getPurchasePerformance } from "./purchasePerformance";
export type {
  PurchasePerformanceResult,
  PurchasePerfRow,
} from "./purchasePerformance";
