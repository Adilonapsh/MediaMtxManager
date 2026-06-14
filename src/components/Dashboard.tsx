import { useState, useEffect, useRef } from "react";
import { Activity, AlertTriangle, CheckCircle, RefreshCcw, Video, Eye } from "lucide-react";
import { cn } from "../lib/utils";
import StreamDetailModal from "./StreamDetailModal";

interface StreamItem {
  _id: string;
  name: string;
  ready: boolean;
  readyTime: string;
  serverId: string;
  serverName: string;
  confName?: string;
  source?: { type: string; id: string };
  tracks?: string[];
  readers?: any[];
  bytesReceived?: number;
  bytesSent?: number;
}

function UptimeTick({ ready, readyTime }: { ready: boolean, readyTime: string }) {
  const [uptimeStr, setUptimeStr] = useState("00:00:00");
  
  useEffect(() => {
    if (!ready || !readyTime) {
      setUptimeStr("00:00:00");
      return;
    }
    const readyDate = new Date(readyTime).getTime();
    
    const updateUptime = () => {
      const diffMs = Math.max(0, Date.now() - readyDate);
      const totalSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      
      const pad = (n: number) => n.toString().padStart(2, '0');
      setUptimeStr(`${pad(hours)}:${pad(mins)}:${pad(secs)}`);
    };
    
    updateUptime();
    const int = setInterval(updateUptime, 1000);
    return () => clearInterval(int);
  }, [ready, readyTime]);

  return <>{uptimeStr}</>;
}

function StreamCard({ st, onClick }: { st: StreamItem; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "border border-zinc-200 rounded p-4 flex flex-col justify-between cursor-pointer transition-all hover:border-zinc-300 hover:shadow-sm", 
        !st.ready ? "opacity-70 bg-zinc-50/50 hover:bg-zinc-50" : "bg-white hover:bg-zinc-50/50"
      )}
    >
      <div className="flex justify-between items-start">
         <span className={cn("text-sm font-semibold", !st.ready && "text-zinc-400 line-through")}>{st.name}</span>
         <span className={cn("w-2 h-2 rounded-full mt-1", st.ready ? "bg-zinc-900" : "bg-zinc-400 opacity-60")}></span>
      </div>
      <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">{st.serverName}</span>
          {st.confName && st.confName !== "all_others" && (
             <span className="text-[9px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-mono uppercase tracking-wide">
               {st.confName}
             </span>
          )}
      </div>
      
      <div className={cn("mt-4 aspect-video rounded flex flex-col items-center justify-center relative overflow-hidden", st.ready ? "bg-zinc-100" : "bg-zinc-200/50")}>
        <Video className={cn("w-8 h-8", st.ready ? "text-zinc-300" : "text-zinc-300/50")} strokeWidth={1.5} />
        <div className="absolute top-2 left-2 flex gap-1">
           <div className="bg-white/80 backdrop-blur text-zinc-600 px-1.5 rounded text-[10px] font-medium leading-none py-1">TLS</div>
           <div className="bg-white/80 backdrop-blur text-zinc-600 px-1.5 rounded text-[10px] font-medium leading-none py-1">E2E</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-100 flex justify-between items-center">
        <span className="text-[10px] text-zinc-400 font-mono">
          <UptimeTick ready={st.ready} readyTime={st.readyTime} />
        </span>
        <span className={cn("text-[10px] font-medium tracking-wide flex items-center gap-1", st.ready ? "text-zinc-900" : "text-zinc-400")}>
          <Eye size={12} className={st.ready ? "text-zinc-400" : "opacity-0"} />
          {st.ready ? "ACTIVE" : "OFFLINE"}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [notifications, setNotifications] = useState<{ id: number, msg: string }[]>([]);
  const [selectedStream, setSelectedStream] = useState<StreamItem | null>(null);
  const [groupBy, setGroupBy] = useState<"none" | "server" | "group">("none");
  
  const previousStreamsRef = useRef<{ [key: string]: boolean }>({});

  const fetchPaths = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/paths", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const items: StreamItem[] = data.items || [];
        
        // Check for offline streams
        const currentStreams: { [key: string]: boolean } = {};
        items.forEach(st => {
           currentStreams[st._id] = st.ready;
        });

        const previous = previousStreamsRef.current;
        for (const id of Object.keys(previous)) {
           if (previous[id] && !currentStreams[id]) {
              addNotification(`Stream offline: ${id.split('_').slice(1).join('_')}`);
           }
        }
        previousStreamsRef.current = currentStreams;

        setStreams(items);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaths();
    const int = setInterval(fetchPaths, 5000);
    return () => clearInterval(int);
  }, []);

  const addNotification = (msg: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const total = streams.length;
  const online = streams.filter(s => s.ready).length;
  const offline = total - online;

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {/* Notifications */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2">
         {notifications.map(n => (
           <div key={n.id} className="bg-red-50 border border-red-100 text-red-600 rounded p-4 flex items-center gap-3 shadow-sm">
             <AlertTriangle size={16} />
             <span className="text-xs font-medium">{n.msg}</span>
           </div>
         ))}
      </div>

      {/* Header and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-semibold">Stream Status</h2>
           <p className="text-xs font-mono text-zinc-400 mt-1">LAST UPDATE: {lastUpdated.toLocaleTimeString()}</p>
        </div>
        <button 
          onClick={() => { setLoading(true); fetchPaths(); }}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white border border-zinc-200 rounded hover:bg-zinc-50 text-zinc-600 transition-colors"
        >
          <span className={cn("text-zinc-900", loading && "animate-pulse")}>●</span>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-zinc-200 rounded bg-white p-4">
          <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">Total Kamera</p>
          <div className="text-2xl font-light mt-1">{total}</div>
        </div>
        <div className="border border-zinc-200 rounded bg-white p-4">
          <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">Online</p>
          <div className="text-2xl font-light mt-1 text-zinc-900">{online}</div>
        </div>
        <div className="border border-zinc-200 rounded bg-white p-4">
          <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter text-red-500">Offline</p>
          <div className="text-2xl font-light mt-1 text-red-500">{offline}</div>
        </div>
      </div>      {/* Grouping Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
         <p className="text-sm font-semibold text-zinc-900">Kelompokkan Kamera:</p>
         <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200 max-w-max">
           <button 
             type="button"
             onClick={() => setGroupBy("none")}
             className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", groupBy === "none" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800")}
           >
             Semua Stream
           </button>
           <button 
             type="button"
             onClick={() => setGroupBy("server")}
             className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", groupBy === "server" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800")}
           >
             Per Server
           </button>
           <button 
             type="button"
             onClick={() => setGroupBy("group")}
             className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", groupBy === "group" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800")}
           >
             Per Kategori (confName)
           </button>
         </div>
      </div>

      {/* Grid rendering with Grouping support */}
      <div className="w-full">
        {(() => {
          if (streams.length === 0 && !loading) {
            return (
              <div className="border border-zinc-200 rounded p-8 text-center bg-white text-zinc-400 text-sm">
                0 Data Ditemukan
              </div>
            );
          }

          if (groupBy === "server") {
            const grouped = streams.reduce((acc, st) => {
              const group = st.serverName || "Unassigned Server";
              if (!acc[group]) acc[group] = [];
              acc[group].push(st);
              return acc;
            }, {} as Record<string, StreamItem[]>);

            return (
              <div className="space-y-8">
                {Object.entries(grouped).map(([srvName, items]) => (
                  <div key={srvName} className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2 border-b border-zinc-200 pb-2">
                       <span>Server: {srvName}</span>
                       <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2.5 py-0.5 rounded-full font-mono">
                          {items.filter(i => i.ready).length}/{items.length} ONLINE
                       </span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                       {items.map(st => (
                          <StreamCard key={st._id} st={st} onClick={() => setSelectedStream(st)} />
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          if (groupBy === "group") {
            const grouped = streams.reduce((acc, st) => {
              const group = st.confName === "all_others" ? "Kategori: Umum (all_others)" : (st.confName || "Kategori: Umum");
              if (!acc[group]) acc[group] = [];
              acc[group].push(st);
              return acc;
            }, {} as Record<string, StreamItem[]>);

            return (
              <div className="space-y-8">
                {Object.entries(grouped).map(([groupName, items]) => (
                  <div key={groupName} className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2 border-b border-zinc-200 pb-2">
                       <span>Group: {groupName}</span>
                       <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2.5 py-0.5 rounded-full font-mono">
                          {items.filter(i => i.ready).length}/{items.length} ONLINE
                       </span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                       {items.map(st => (
                          <StreamCard key={st._id} st={st} onClick={() => setSelectedStream(st)} />
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          // Default "none"
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {streams.map(st => (
                <StreamCard key={st._id} st={st} onClick={() => setSelectedStream(st)} />
              ))}
            </div>
          );
        })()}
      </div>

      <StreamDetailModal stream={selectedStream} onClose={() => setSelectedStream(null)} />
    </div>
  );
}
