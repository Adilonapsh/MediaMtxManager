import { X, Activity, Server, Clock, HardDrive, Wifi, Shield, ExternalLink, Play, Copy, Check, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useEffect, useState, useRef } from "react";
import { cn } from "../lib/utils";

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
  serverUrl?: string;
  hlsUrlBase?: string;
}

interface StreamDetailModalProps {
  stream: StreamItem | null;
  onClose: () => void;
}

export default function StreamDetailModal({ stream, onClose }: StreamDetailModalProps) {
  const [data, setData] = useState<any[]>([]);
  const [uptimeStr, setUptimeStr] = useState("--:--:--");
  const [liveStream, setLiveStream] = useState<StreamItem | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const prevBytesRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const getStreamUrl = () => {
    const s = liveStream || stream;
    if (!s) return "";
    let base = s.hlsUrlBase;
    if (!base && s.serverUrl) {
       try {
          const urlObj = new URL(s.serverUrl);
          urlObj.port = "8888";
          urlObj.pathname = "";
          urlObj.search = "";
          base = urlObj.toString().replace(/\/$/, "");
       } catch (e) {
          base = "";
       }
    }
    if (!base) return "";
    const streamName = s.name;
    return `${base}/${streamName}/`;
  };

  const getHost = () => {
    const s = liveStream || stream;
    if (!s) return "";
    let base = s.hlsUrlBase;
    if (!base && s.serverUrl) base = s.serverUrl;
    if (!base) return "";
    try {
      const urlObj = new URL(base);
      return urlObj.hostname;
    } catch (e) {
      return "";
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };
  
  useEffect(() => {
    setLiveStream(stream);
  }, [stream]);

  useEffect(() => {
    if (!stream) return;
    const poll = async () => {
      try {
        const res = await fetch("/api/paths", {
           headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.ok) {
          const obj = await res.json();
          const found = obj.items?.find((i: any) => i._id === stream._id);
          if (found) setLiveStream(found);
        }
      } catch (e) {}
    };
    const int = setInterval(poll, 2000);
    return () => clearInterval(int);
  }, [stream]);

  useEffect(() => {
    const s = liveStream || stream;
    if (!s?.ready || !s?.readyTime) {
      setUptimeStr("--:--:--");
      return;
    }
    const readyDate = new Date(s.readyTime).getTime();
    
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
  }, [stream?.ready, stream?.readyTime]);

  useEffect(() => {
    const s = liveStream || stream;
    if (s && s.ready) {
      const now = Date.now();
      const currentBytes = s.bytesReceived || 0;
      let bitrate = 0;

      if (prevBytesRef.current !== null && lastTimeRef.current !== null && currentBytes >= prevBytesRef.current) {
        const deltaBytes = currentBytes - prevBytesRef.current;
        const deltaMs = now - lastTimeRef.current;
        if (deltaMs > 0) {
           const bytesPerSec = (deltaBytes / deltaMs) * 1000;
           bitrate = (bytesPerSec * 8) / 1000000; // Mbps
        }
      }

      setData(prev => {
        let newChart = [...prev];
        if (newChart.length === 0) {
           newChart = Array.from({ length: 20 }).map((_, i) => ({
             time: new Date(Date.now() - (20 - i) * 5000).toLocaleTimeString([], { hour12: false }),
             bitrate: 0
           }));
        }
        
        const newPoint = {
           time: new Date().toLocaleTimeString([], { hour12: false }),
           bitrate: bitrate.toFixed(2),
        };

        return [...newChart.slice(1), newPoint];
      });

      prevBytesRef.current = currentBytes;
      lastTimeRef.current = now;
    } else if (!liveStream?.ready) {
      setData([]);
      prevBytesRef.current = null;
      lastTimeRef.current = null;
    }
  }, [liveStream]);

  const s = liveStream || stream;
  if (!s) return null;

  const formatBytes = (bytes: number) => {
      if (bytes === 0) return { val: "0.00", unit: "MB" };
      if (bytes < 1024 * 1024) return { val: (bytes / 1024).toFixed(2), unit: "KB" };
      if (bytes < 1024 * 1024 * 1024) return { val: (bytes / (1024 * 1024)).toFixed(2), unit: "MB" };
      return { val: (bytes / (1024 * 1024 * 1024)).toFixed(2), unit: "GB" };
  };

  const sentObj = formatBytes(s.bytesSent ?? 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white border border-zinc-200 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {s.name}
              <span className={cn("inline-block w-2.5 h-2.5 rounded-full", s.ready ? "bg-zinc-900" : "bg-zinc-400 opacity-60")}></span>
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-1">ID: {s._id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Top Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-zinc-200 rounded p-4 bg-zinc-50/50">
              <div className="flex justify-between">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Status</p>
                <Activity size={14} className={s.ready ? "text-zinc-900" : "text-zinc-400"} />
              </div>
              <p className={cn("text-lg font-medium mt-1 uppercase", !s.ready && "text-zinc-400")}>
                {s.ready ? "Online" : "Offline"}
              </p>
            </div>
            <div className="border border-zinc-200 rounded p-4 bg-zinc-50/50">
              <div className="flex justify-between">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Readers</p>
                <Wifi size={14} className="text-zinc-400" />
              </div>
              <p className="text-lg font-mono font-medium mt-1">
                {s.ready ? (s.readers?.length ?? 0) : "0"} 
                <span className="text-xs text-zinc-400 font-sans ml-1">Koneksi</span>
              </p>
            </div>
            <div className="border border-zinc-200 rounded p-4 bg-zinc-50/50">
              <div className="flex justify-between">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Data Transferred</p>
                <HardDrive size={14} className="text-zinc-400" />
              </div>
              <p className="text-lg font-mono font-medium mt-1">
                {s.ready ? sentObj.val : "0.00"} <span className="text-xs text-zinc-400 font-sans">{sentObj.unit}</span>
              </p>
            </div>
            <div className="border border-zinc-200 rounded p-4 bg-zinc-50/50">
              <div className="flex justify-between">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Uptime</p>
                <Clock size={14} className="text-zinc-400" />
              </div>
              <p className="text-lg font-mono font-medium mt-1">
                {uptimeStr}
              </p>
            </div>
          </div>

          {/* Live Video Preview Section */}
          <div className="border border-zinc-200 rounded p-5 bg-white space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                   <Play size={16} className="text-zinc-900" />
                   Web Live Player (MediaMTX)
                </h3>
                <p className="text-xs text-zinc-500">Preview siaran langsung menggunakan player internal WebRTC/HLS.</p>
              </div>
              {s.ready && getStreamUrl() && (
                 <a 
                   href={getStreamUrl()} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors rounded text-xs font-medium"
                 >
                   Open Player in New Tab <ExternalLink size={12} />
                 </a>
              )}
            </div>

            {s.ready ? (
               getStreamUrl() ? (
                 <div className="space-y-4">
                    <div className="relative aspect-video bg-zinc-950 rounded-lg overflow-hidden border border-zinc-200">
                      <iframe 
                        src={getStreamUrl()} 
                        title={`MediaMTX Stream: ${s.name}`}
                        className="w-full h-full border-0"
                        allowFullScreen
                        allow="autoplay; encrypted-media"
                      />
                    </div>
                    
                    <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3 text-xs space-y-2 text-zinc-600">
                      <p className="flex items-start gap-1.5 text-[11px] text-amber-800 leading-relaxed">
                         <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                         <span>
                           <b>Info Tampilan Video:</b> Jika pratinjau di atas tidak tampil (kosong/abu-abu), hal ini kemungkinan disebabkan proteksi browser terhadap Mixed Content (situs HTTPS memuat video beralamat HTTP non-SSL). Silakan klik tombol <b>Open Player in New Tab</b> di kanan atas untuk memutar langsung pada tab baru.
                         </span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="border border-zinc-200 rounded p-2.5 bg-zinc-50/50">
                           <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">HLS Playlist (.m3u8)</span>
                           <div className="flex gap-2 items-center mt-1">
                              <input 
                                type="text" 
                                readOnly 
                                value={`${getStreamUrl()}index.m3u8`} 
                                className="bg-white border rounded px-2 py-1 text-xs font-mono grow text-zinc-650 outline-none select-all"
                              />
                              <button 
                                onClick={() => handleCopy(`${getStreamUrl()}index.m3u8`, 'hls')}
                                className="p-1 px-2 border rounded hover:bg-zinc-50 text-zinc-600 flex items-center gap-1 text-xs active:bg-zinc-100"
                              >
                                {copiedType === 'hls' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                Copy
                              </button>
                           </div>
                        </div>

                        <div className="border border-zinc-200 rounded p-2.5 bg-zinc-50/50">
                           <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">WebRTC WHEP Endpoint</span>
                           <div className="flex gap-2 items-center mt-1">
                              <input 
                                type="text" 
                                readOnly 
                                value={`${getStreamUrl()}whep`} 
                                className="bg-white border rounded px-2 py-1 text-xs font-mono grow text-zinc-650 outline-none select-all"
                              />
                              <button 
                                onClick={() => handleCopy(`${getStreamUrl()}whep`, 'whep')}
                                className="p-1 px-2 border rounded hover:bg-zinc-50 text-zinc-600 flex items-center gap-1 text-xs active:bg-zinc-100"
                              >
                                {copiedType === 'whep' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                Copy
                              </button>
                           </div>
                        </div>
                      </div>

                      {getHost() && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="border border-zinc-200 rounded p-2.5 bg-zinc-50/50">
                             <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">RTMP URL (Fallback)</span>
                             <div className="flex gap-2 items-center mt-1">
                                <input 
                                  type="text" 
                                  readOnly 
                                  value={`rtmp://${getHost()}:1935/${s.name}`} 
                                  className="bg-white border rounded px-2 py-1 text-xs font-mono grow text-zinc-650 outline-none select-all"
                                />
                                <button 
                                  onClick={() => handleCopy(`rtmp://${getHost()}:1935/${s.name}`, 'rtmp')}
                                  className="p-1 px-2 border rounded hover:bg-zinc-50 text-zinc-600 flex items-center gap-1 text-xs active:bg-zinc-100"
                                >
                                  {copiedType === 'rtmp' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                  Copy
                                </button>
                             </div>
                          </div>

                          <div className="border border-zinc-200 rounded p-2.5 bg-zinc-50/50">
                             <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">SRT URL (Read)</span>
                             <div className="flex gap-2 items-center mt-1">
                                <input 
                                  type="text" 
                                  readOnly 
                                  value={`srt://${getHost()}:8890?streamid=read:${s.name}`} 
                                  className="bg-white border rounded px-2 py-1 text-xs font-mono grow text-zinc-650 outline-none select-all"
                                />
                                <button 
                                  onClick={() => handleCopy(`srt://${getHost()}:8890?streamid=read:${s.name}`, 'srt')}
                                  className="p-1 px-2 border rounded hover:bg-zinc-50 text-zinc-600 flex items-center gap-1 text-xs active:bg-zinc-100"
                                >
                                  {copiedType === 'srt' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                  Copy
                                </button>
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                 </div>
               ) : (
                 <div className="aspect-video bg-zinc-50 border border-dashed rounded-lg flex flex-col items-center justify-center text-zinc-400 p-6 text-center">
                    <AlertCircle size={32} className="mb-2 text-zinc-300" />
                    <p className="text-sm font-medium text-zinc-500">Streaming URL cannot be guessed</p>
                    <p className="text-xs max-w-sm mt-1">Silakan konfigurasikan "Streaming / Player URL Base" untuk server ini di menu <b>Servers</b> agar web player dapat mendeteksi jalur streaming.</p>
                 </div>
               )
            ) : (
               <div className="py-12 bg-zinc-50 border border-dashed rounded-lg flex flex-col items-center justify-center text-zinc-400 p-6 text-center">
                  <Play size={28} className="mb-2 text-zinc-300 stroke-[1.5]" />
                  <p className="text-sm font-medium text-zinc-500">Stream Offline</p>
                  <p className="text-xs max-w-sm mt-1">Video preview hanya tersedia saat siaran langsung aktif.</p>
               </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4 border border-zinc-200 rounded p-4">
              <div>
                <h3 className="text-sm font-semibold">Trafik Jaringan (Bitrate)</h3>
                <p className="text-xs text-zinc-400">Data simulasi live bitrate berdasarkan koneksi aktif.</p>
              </div>
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorBitrate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18181b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={10} minTickGap={30} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dx={-10} domain={[0, 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', color: '#fff', fontSize: '12px', border: 'none', borderRadius: '4px' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#a1a1aa' }}
                    />
                    <Area type="monotone" dataKey="bitrate" stroke="#18181b" strokeWidth={2} fillOpacity={1} fill="url(#colorBitrate)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border border-zinc-200 rounded p-4 space-y-4">
                 <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Konfigurasi Server</h3>
                 </div>
                 <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-zinc-50 text-sm">
                      <span className="text-zinc-500">Node</span>
                      <span className="font-semibold flex items-center gap-1"><Server size={14} className="text-zinc-400"/> {s.serverName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-zinc-50 text-sm">
                      <span className="text-zinc-500">Source Type</span>
                      <span className="font-medium text-zinc-900">{s.source?.type || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-zinc-50 text-sm">
                      <span className="text-zinc-500">Tracks</span>
                      <span className="font-medium text-zinc-900">{s.tracks?.join(", ") || "N/A"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-zinc-50 text-sm">
                      <span className="text-zinc-500">Security</span>
                      <span className="font-medium text-zinc-900 flex items-center gap-1"><Shield size={14} className="text-zinc-400"/> E2E TLS</span>
                    </div>
                 </div>
              </div>

               <div className="border border-zinc-200 rounded p-4 bg-zinc-900 text-white overflow-hidden">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Diagnostic Data</h3>
                 <pre className="font-mono text-[10px] whitespace-pre-wrap mt-2 text-zinc-300">
{JSON.stringify({
  path: s.name,
  ready: s.ready,
  confName: s.confName,
  source: s.source,
  tracks: s.tracks,
  bytesReceived: s.bytesReceived,
  bytesSent: s.bytesSent
}, null, 2)}
                 </pre>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

