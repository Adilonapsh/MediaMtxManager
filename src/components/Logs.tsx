import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { formatDistanceStrict } from "date-fns";

interface LogItem {
  id: string;
  streamName: string;
  serverId?: string;
  serverName?: string;
  offlineAt: string;
  onlineAt: string | null;
  durationMs: number | null;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logs", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(r => r.json())
      .then(data => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
     return <div className="text-sm font-semibold uppercase tracking-widest text-zinc-400 animate-pulse">Loading Logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock size={20} className="text-zinc-400" />
        <h2 className="text-xl font-semibold">Downtime Logs</h2>
      </div>

      <div className="border border-zinc-200 bg-white rounded flex flex-col">
          <div className="p-3 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Historical Downtime Logs</h3>
            <span className="text-[10px] text-zinc-500">Distant Incidents</span>
          </div>
          <div className="p-4 space-y-0">
            {logs.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-400">Tidak ada data historis.</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="text-xs border-b border-zinc-50/50 last:border-0 pb-3 mb-3 last:pb-0 last:mb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                  <span className="font-mono text-zinc-400 w-full sm:w-32 whitespace-nowrap">
                    [{new Date(log.offlineAt).toLocaleTimeString([], { hour12: false })}]
                  </span>
                  <span className="flex-1 text-zinc-600 break-all">
                    {log.serverName && <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mr-2">[{log.serverName}]</span>}
                    <span className="font-semibold text-zinc-900">{log.streamName}</span> offline. 
                    {!log.onlineAt && <span className="font-semibold text-[10px] tracking-wide text-red-500 ml-2 py-0.5 px-1.5 bg-red-50 rounded">ONGOING</span>}
                  </span>
                  <span className="text-zinc-400 w-full sm:w-24 sm:text-right mt-1 sm:mt-0 font-mono text-[11px]">
                    {log.durationMs ? formatDistanceStrict(0, log.durationMs) : "-- : --"}
                  </span>
                </div>
              ))
            )}
          </div>
      </div>
    </div>
  );
}
