import { prisma } from "@/lib/prisma";

export type ShopInfoData = {
  id: string;
  name: string;
  address: string | null;
  town: string | null;
  county: string | null;
  country: string;
  poBox: string | null;
  email: string | null;
  phone: string | null;
  terms: string[];
};

export async function getShopInfo(): Promise<ShopInfoData> {
  const info = await prisma.shopInfo.findUnique({ where: { id: "main" } });
  return info ?? {
    id: "main",
    name: "",
    address: null,
    town: null,
    county: null,
    country: "Kenya",
    poBox: null,
    email: null,
    phone: null,
    terms: [],
  };
}
