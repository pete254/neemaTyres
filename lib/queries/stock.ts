import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export interface StockLine {
  variantId: string;
  sizeCanonical: string;
  brandName: string;
  position: string;
  subLabel: string | null;
  patternCode: string | null;
  qtyOnHand: number;
  wacCost: Decimal;
  stockValue: Decimal;
}

export interface StockOnHandResult {
  lines: StockLine[];
  totalQty: number;
  totalValue: Decimal;
}

export async function getStockOnHand(filter?: {
  search?: string;
  position?: string;
  brand?: string;
}): Promise<StockOnHandResult> {
  const variants = await prisma.productVariant.findMany({
    where: {
      ...(filter?.search
        ? {
            OR: [
              { sizeCanonical: { contains: filter.search, mode: "insensitive" } },
              { patternCode: { contains: filter.search, mode: "insensitive" } },
              { brand: { name: { contains: filter.search, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(filter?.position ? { position: filter.position as never } : {}),
      ...(filter?.brand
        ? { brand: { name: { contains: filter.brand, mode: "insensitive" } } }
        : {}),
    },
    include: { brand: true },
    orderBy: [{ sizeCanonical: "asc" }, { brand: { name: "asc" } }],
  });

  let totalQty = 0;
  let totalValue = new Decimal(0);

  const lines: StockLine[] = variants.map((v) => {
    const wacCost = new Decimal(v.wacCost.toString());
    const stockValue = wacCost.mul(v.qtyOnHand);
    totalQty += v.qtyOnHand;
    totalValue = totalValue.plus(stockValue);
    return {
      variantId: v.id,
      sizeCanonical: v.sizeCanonical,
      brandName: v.brand.name,
      position: v.position,
      subLabel: v.subLabel,
      patternCode: v.patternCode,
      qtyOnHand: v.qtyOnHand,
      wacCost,
      stockValue,
    };
  });

  return { lines, totalQty, totalValue };
}
