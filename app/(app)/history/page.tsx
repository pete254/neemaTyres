import { prisma } from "@/lib/prisma";

const ACTION_LABELS: Record<string, string> = {
  CREATE_SALE: "New Sale",
  UPDATE_SALE: "Sale Updated",
  DELETE_SALE: "Sale Deleted",
  CREATE_PURCHASE: "New Purchase",
  UPDATE_PURCHASE: "Purchase Updated",
  DELETE_PURCHASE: "Purchase Deleted",
  CREATE_DEBT_COLLECTION: "Debt Collection",
  CREATE_SUPPLIER_PAYMENT: "Supplier Payment",
  CREATE_RETURN: "Return",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE_SALE: "text-green-400 bg-green-900/30 border-green-800",
  UPDATE_SALE: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
  DELETE_SALE: "text-red-400 bg-red-900/30 border-red-800",
  CREATE_PURCHASE: "text-blue-400 bg-blue-900/30 border-blue-800",
  UPDATE_PURCHASE: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
  DELETE_PURCHASE: "text-red-400 bg-red-900/30 border-red-800",
  CREATE_DEBT_COLLECTION: "text-orange-400 bg-orange-900/30 border-orange-800",
  CREATE_SUPPLIER_PAYMENT: "text-purple-400 bg-purple-900/30 border-purple-800",
  CREATE_RETURN: "text-pink-400 bg-pink-900/30 border-pink-800",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const pageNum = Math.max(1, parseInt(page ?? "1"));
  const pageSize = 50;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity History</h1>
          <p className="text-sm text-zinc-500 mt-1">{total.toLocaleString()} total entries</p>
        </div>
      </div>

      <div className="space-y-2">
        {logs.length === 0 && (
          <p className="text-zinc-500 text-center py-12">No activity recorded yet.</p>
        )}
        {logs.map((log) => {
          const colorClass = ACTION_COLORS[log.action] ?? "text-zinc-400 bg-zinc-900/30 border-zinc-700";
          const label = ACTION_LABELS[log.action] ?? log.action;
          const meta = log.metadata as Record<string, unknown> | null;
          const source = meta?.source === "mobile" ? " · Mobile" : " · Web";
          return (
            <div key={log.id} className="flex items-start gap-4 bg-[#111] border border-[#2A2A2A] rounded-lg px-4 py-3">
              <span className={`shrink-0 text-xs font-semibold border rounded px-2 py-0.5 mt-0.5 ${colorClass}`}>
                {label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{log.description}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {log.user.name} · {new Date(log.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}{source}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          {pageNum > 1 && (
            <a href={`?page=${pageNum - 1}`} className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 border border-[#2A2A2A] rounded">
              ← Prev
            </a>
          )}
          <span className="text-sm text-zinc-500">Page {pageNum} of {totalPages}</span>
          {pageNum < totalPages && (
            <a href={`?page=${pageNum + 1}`} className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 border border-[#2A2A2A] rounded">
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
