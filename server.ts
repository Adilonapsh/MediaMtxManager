import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "rawblock-secret-jwt-key";
const PORT = 3000;

interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: "admin" | "user";
}

interface MTXServer {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  hlsUrlBase?: string;
}

interface DowntimeLog {
  id: string;
  serverId?: string;
  serverName?: string;
  streamName: string;
  offlineAt: string;
  onlineAt: string | null;
  durationMs: number | null;
}

interface StreamStats {
  totalBytesSent: number;
  totalBytesReceived: number;
  lastSeenBytesSent: number;
  lastSeenBytesReceived: number;
  firstReadyTime?: string;
}

interface DB {
  users: User[];
  logs: DowntimeLog[];
  servers: MTXServer[];
  stats?: Record<string, StreamStats>;
  observedPaths?: Record<string, any>;
}

const DB_FILE = path.join(process.cwd(), "data.json");

let db: DB = { users: [], logs: [], servers: [], stats: {}, observedPaths: {} };

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    if (!db.servers || db.servers.length === 0) {
        db.servers = [{ id: uuidv4(), name: 'Default', url: 'http://103.171.84.156:9998/v3/paths/list' }];
        saveDb();
    }
    if (!db.stats) db.stats = {};
    if (!db.observedPaths) db.observedPaths = {};
  } else {
    const defaultAdmin: User = {
      id: uuidv4(),
      username: "admin",
      passwordHash: bcrypt.hashSync("admin", 10),
      role: "admin",
    };
    db.users.push(defaultAdmin);
    db.servers = [{ id: uuidv4(), name: 'Default', url: 'http://103.171.84.156:9998/v3/paths/list' }];
    saveDb();
  }
}

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

loadDb();

const app = express();
app.use(express.json());
app.use(cors());

// Auth Middleware
const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    // @ts-ignore
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  // @ts-ignore
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
};

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find((u) => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
     res.status(401).json({ error: "Invalid credentials" });
     return;
  }
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.get("/api/me", authenticate, (req, res) => {
  // @ts-ignore
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ id: user.id, username: user.username, role: user.role });
});

app.get("/api/users", authenticate, requireAdmin, (req, res) => {
  res.json(db.users.map((u) => ({ id: u.id, username: u.username, role: u.role })));
});

app.post("/api/users", authenticate, requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (db.users.find(u => u.username === username)) {
     res.status(400).json({ error: "Username taken" });
     return;
  }
  const newUser: User = {
    id: uuidv4(),
    username,
    passwordHash: bcrypt.hashSync(password, 10),
    role: role === "admin" ? "admin" : "user",
  };
  db.users.push(newUser);
  saveDb();
  res.json({ id: newUser.id, username: newUser.username, role: newUser.role });
});

app.delete("/api/users/:id", authenticate, requireAdmin, (req, res) => {
  if (db.users.find(u => u.id === req.params.id)?.username === 'admin') {
    res.status(400).json({ error: "Cannot delete initial admin" });
    return;
  }
  db.users = db.users.filter((u) => u.id !== req.params.id);
  saveDb();
  res.json({ success: true });
});

// Servers API
app.get("/api/servers", authenticate, (req, res) => {
  res.json(db.servers);
});

app.post("/api/servers", authenticate, requireAdmin, (req, res) => {
  const { name, url, username, password, hlsUrlBase } = req.body;
  const newServer: MTXServer = { id: uuidv4(), name, url, username, password, hlsUrlBase };
  db.servers.push(newServer);
  saveDb();
  res.json(newServer);
});

app.put("/api/servers/:id", authenticate, requireAdmin, (req, res) => {
  const serverId = req.params.id;
  const { name, url, username, password, hlsUrlBase } = req.body;
  const srv = db.servers.find(s => s.id === serverId);
  if (!srv) {
    return res.status(404).json({ error: "Server not found" });
  }
  srv.name = name;
  srv.url = url;
  srv.username = username || undefined;
  srv.password = password || undefined;
  srv.hlsUrlBase = hlsUrlBase || undefined;
  saveDb();
  res.json(srv);
});

app.delete("/api/servers/:id", authenticate, requireAdmin, (req, res) => {
  const serverId = req.params.id;
  db.servers = db.servers.filter(s => s.id !== serverId);
  if (db.observedPaths) {
     Object.keys(db.observedPaths).forEach(key => {
        if (key.startsWith(`${serverId}_`)) {
           delete db.observedPaths![key];
        }
     });
  }
  if (db.stats) {
     Object.keys(db.stats).forEach(key => {
        if (key.startsWith(`${serverId}_`)) {
           delete db.stats![key];
        }
     });
  }
  saveDb();
  res.json({ success: true });
});

app.get("/api/paths", authenticate, async (req, res) => {
  try {
    if (!db.observedPaths) db.observedPaths = {};
    let dbChanged = false;

    for (const srv of db.servers) {
       try {
         const fetchOpts: any = {};
         if (srv.username && srv.password) {
            const base64 = Buffer.from(`${srv.username}:${srv.password}`).toString('base64');
            fetchOpts.headers = { 'Authorization': `Basic ${base64}` };
         }
         const fetchResponse = await fetch(srv.url, fetchOpts);
         if (fetchResponse.ok) {
            const data = await fetchResponse.json();
            const items = data.items || [];
            
            const activeKeys = new Set<string>();

            items.forEach((item: any) => {
               const key = `${srv.id}_${item.name}`;
               activeKeys.add(key);

               item.serverId = srv.id;
               item.serverName = srv.name;
               item._id = key;

               if (db.stats && db.stats[key]) {
                   const stat = db.stats[key];
                   let unpolledSent = 0;
                   let unpolledRecv = 0;
                   
                   if ((item.bytesSent || 0) >= stat.lastSeenBytesSent) {
                       unpolledSent = (item.bytesSent || 0) - stat.lastSeenBytesSent;
                   } else {
                       unpolledSent = (item.bytesSent || 0);
                   }
                   
                   if ((item.bytesReceived || 0) >= stat.lastSeenBytesReceived) {
                       unpolledRecv = (item.bytesReceived || 0) - stat.lastSeenBytesReceived;
                   } else {
                       unpolledRecv = (item.bytesReceived || 0);
                   }
                   
                   item.bytesSent = stat.totalBytesSent + unpolledSent;
                   item.bytesReceived = stat.totalBytesReceived + unpolledRecv;
                   
                   if (stat.firstReadyTime) {
                       item.readyTime = stat.firstReadyTime;
                   }
               } else {
                   item.bytesSent = item.bytesSent || 0;
                   item.bytesReceived = item.bytesReceived || 0;
               }

               const existing = db.observedPaths![key];
               const shouldUpdate = !existing || 
                  existing.ready !== item.ready || 
                  existing.readyTime !== (item.readyTime || '') ||
                  existing.bytesSent !== item.bytesSent ||
                  existing.bytesReceived !== item.bytesReceived ||
                  existing.confName !== (item.confName || 'all_others');

               if (shouldUpdate) {
                  db.observedPaths![key] = {
                    _id: key,
                    name: item.name,
                    ready: item.ready,
                    readyTime: item.readyTime || '',
                    serverId: srv.id,
                    serverName: srv.name,
                    confName: item.confName || 'all_others',
                    source: item.source,
                    tracks: item.tracks,
                    readers: item.readers,
                    bytesReceived: item.bytesReceived,
                    bytesSent: item.bytesSent
                  };
                  dbChanged = true;
               }
            });

            // Mark other observed paths of this server as offline if they are missing
            Object.keys(db.observedPaths).forEach(key => {
               if (key.startsWith(`${srv.id}_`) && !activeKeys.has(key)) {
                  const existing = db.observedPaths![key];
                  if (existing.ready) {
                     existing.ready = false;
                     existing.readers = [];
                     dbChanged = true;
                     
                     if (db.stats && db.stats[key]) {
                        db.stats[key].lastSeenBytesSent = 0;
                        db.stats[key].lastSeenBytesReceived = 0;
                     }
                  }
               }
            });
         }
       } catch (err) {
          console.error("Failed to fetch from server", srv.url);
       }
    }

    if (dbChanged) {
       saveDb();
    }

    const allItems = Object.values(db.observedPaths).map((p: any) => {
       const mappedSrv = db.servers.find(s => s.id === p.serverId);
       return {
          ...p,
          serverUrl: mappedSrv ? mappedSrv.url : undefined,
          hlsUrlBase: mappedSrv ? mappedSrv.hlsUrlBase : undefined
       };
    });
    res.json({ items: allItems });
  } catch (error: any) {
    res.status(502).json({ error: "Failed to fetch mediamtx paths", details: error.message });
  }
});

app.get("/api/logs", authenticate, (req, res) => {
  res.json(db.logs.sort((a,b) => new Date(b.offlineAt).getTime() - new Date(a.offlineAt).getTime()));
});

// Background poller to monitor downtime and accumulate stats
interface PolledStream { ready: boolean, name: string, serverId: string, serverName: string, bytesSent: number, bytesReceived: number, readyTime: string }
let previousStreams: { [key: string]: PolledStream } = {};

setInterval(async () => {
  try {
    const currentStreams: { [key: string]: PolledStream } = {};
    const now = new Date().toISOString();
    let dbChanged = false;

    for (const srv of db.servers) {
        try {
           const fetchOpts: any = {};
           if (srv.username && srv.password) {
              const base64 = Buffer.from(`${srv.username}:${srv.password}`).toString('base64');
              fetchOpts.headers = { 'Authorization': `Basic ${base64}` };
           }
           const fetchResponse = await fetch(srv.url, fetchOpts);
           if (fetchResponse.ok) {
              const data = await fetchResponse.json();
              const items = data.items || [];
              items.forEach((item: any) => {
                 const key = `${srv.id}_${item.name}`;
                 currentStreams[key] = { 
                   ready: item.ready, 
                   name: item.name, 
                   serverId: srv.id, 
                   serverName: srv.name,
                   bytesSent: item.bytesSent || 0,
                   bytesReceived: item.bytesReceived || 0,
                   readyTime: item.readyTime || ''
                 };
              });
           }
        } catch (e) {}
    }

    const allKeys = new Set([...Object.keys(previousStreams), ...Object.keys(currentStreams)]);
    for (const key of allKeys) {
        const prev = previousStreams[key];
        const curr = currentStreams[key];

        const wasReady = prev ? prev.ready : false;
        const isReadyNow = curr ? curr.ready : false;
        
        const info = curr || prev;
        if (!info) continue;

        if (wasReady && !isReadyNow) {
          db.logs.push({
            id: uuidv4(),
            streamName: info.name,
            serverId: info.serverId,
            serverName: info.serverName,
            offlineAt: now,
            onlineAt: null,
            durationMs: null
          });
          if (db.observedPaths && db.observedPaths[key]) {
            db.observedPaths[key].ready = false;
            db.observedPaths[key].readers = [];
          }
          dbChanged = true;
        } else if (!wasReady && isReadyNow) {
          const ongoingLog = db.logs.find(l => l.serverId === info.serverId && l.streamName === info.name && l.onlineAt === null);
          if (ongoingLog) {
            ongoingLog.onlineAt = now;
            ongoingLog.durationMs = new Date(now).getTime() - new Date(ongoingLog.offlineAt).getTime();
            dbChanged = true;
          }
          if (db.observedPaths && db.observedPaths[key] && curr) {
            db.observedPaths[key].ready = true;
            db.observedPaths[key].readyTime = curr.readyTime;
          }
        }

        if (curr && curr.ready) {
            if (!db.stats) db.stats = {};
            if (!db.stats[key]) {
                 db.stats[key] = { totalBytesSent: 0, totalBytesReceived: 0, lastSeenBytesSent: 0, lastSeenBytesReceived: 0 };
            }
            const stat = db.stats[key];
            
            if (!stat.firstReadyTime && curr.readyTime) {
                stat.firstReadyTime = curr.readyTime;
            }

            const currentSent = curr.bytesSent;
            let deltaSent = 0;
            if (currentSent >= stat.lastSeenBytesSent) {
                deltaSent = currentSent - stat.lastSeenBytesSent;
            } else {
                deltaSent = currentSent;
            }
            stat.totalBytesSent += deltaSent;
            stat.lastSeenBytesSent = currentSent;
            
            const currentRecv = curr.bytesReceived;
            let deltaRecv = 0;
            if (currentRecv >= stat.lastSeenBytesReceived) {
                deltaRecv = currentRecv - stat.lastSeenBytesReceived;
            } else {
                deltaRecv = currentRecv;
            }
            stat.totalBytesReceived += deltaRecv;
            stat.lastSeenBytesReceived = currentRecv;
            
            dbChanged = true;
        }
    }
    
    previousStreams = currentStreams;
    if (dbChanged) saveDb();
  } catch (error) {
    console.error("Poller error:", error);
  }
}, 5000);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
