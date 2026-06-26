import { getExceptionFlags } from "@/lib/queries";
import { resolveException } from "@/lib/actions/exceptions";

interface PageProps {
  searchParams: Promise<{ all?: string }>;
}

export default async function ExceptionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const showAll = params.all === "1";
  const flags = await getExceptionFlags(showAll);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Exception Flags</h2>
        <a
          href={showAll ? "/exceptions" : "/exceptions?all=1"}
          className="text-sm text-zinc-400 hover:text-white"
        >
          {showAll ? "Show unresolved only" : "Show all"}
        </a>
      </div>

      {flags.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          {showAll ? "No exception flags." : "No unresolved flags. All clear!"}
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className={`bg-[#111] border rounded-lg p-4 ${
                flag.resolved
                  ? "border-[#2A2A2A] opacity-60"
                  : "border-orange-800"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        flag.resolved
                          ? "bg-zinc-700 text-zinc-300"
                          : "bg-orange-900 text-orange-300"
                      }`}
                    >
                      {flag.flagType}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {flag.entityType} · {flag.entityId.slice(0, 12)}...
                    </span>
                  </div>
                  <pre className="text-xs text-zinc-400 mt-1 whitespace-pre-wrap">
                    {JSON.stringify(flag.details, null, 2)}
                  </pre>
                  <p className="text-xs text-zinc-600 mt-2">
                    {new Date(flag.createdAt).toLocaleString("en-KE")}
                    {flag.resolved && flag.resolvedBy
                      ? ` · Resolved by ${flag.resolvedBy.name}`
                      : ""}
                  </p>
                </div>
                {!flag.resolved && (
                  <form
                    action={async () => {
                      "use server";
                      await resolveException(flag.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs bg-[#EAB308] hover:bg-[#CA8A04] text-black font-semibold rounded px-3 py-1.5 transition-colors whitespace-nowrap"
                    >
                      Resolve
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
