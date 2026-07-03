"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";

export async function createQuotation(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const customerId = (formData.get("customerId") as string) || null;
  const date = new Date(formData.get("date") as string);
  const validDays = parseInt((formData.get("validDays") as string) || "14");
  const note = (formData.get("note") as string)?.trim() || null;
  const linesRaw = JSON.parse(formData.get("lines") as string) as Array<{
    description: string;
    qty: string;
    unitPrice: string;
  }>;

  const lines = linesRaw.map((l, i) => {
    const qty = parseInt(l.qty);
    const unitPrice = new Decimal(l.unitPrice);
    return {
      description: l.description.trim(),
      qty,
      unitPrice,
      lineTotal: unitPrice.mul(qty),
      sortOrder: i,
    };
  });

  const year = date.getFullYear();
  const existingCount = await prisma.quotation.count({ where: { quotationNo: { startsWith: `Q${year}-` } } });
  const quotationNo = `Q${year}-${String(existingCount + 1).padStart(3, "0")}`;

  const quotation = await prisma.quotation.create({
    data: {
      quotationNo,
      customerId,
      date,
      validDays,
      note,
      createdById: session.user.id,
      lines: {
        create: lines.map((l) => ({
          description: l.description,
          qty: l.qty,
          unitPrice: l.unitPrice.toDecimalPlaces(2),
          lineTotal: l.lineTotal.toDecimalPlaces(2),
          sortOrder: l.sortOrder,
        })),
      },
    },
  });

  redirect(`/quotations/${quotation.id}`);
}
