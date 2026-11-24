import type { Server as HttpServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { db, getUserEntitlement } from './db.ts';
import { parseJsonSafe, type AuthUser } from './security.ts';

interface SocketMeta {
  userId: string;
  username: string;
  fullName: string;
  collabSessionId?: string;
}

const userSockets = new Map<string, Set<WebSocket>>();
const collabRooms = new Map<string, Set<WebSocket>>();
const socketMetaMap = new WeakMap<WebSocket, SocketMeta>();

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function pushNotificationToUser(userId: string, notification: unknown) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  for (const ws of sockets) {
    sendJson(ws, { event: 'notification:new', payload: notification });
  }
}

export function pushMessageToUser(userId: string, message: unknown) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  for (const ws of sockets) {
    sendJson(ws, { event: 'dm:received', payload: message });
  }
}

function broadcastCollabPresence(sessionId: string) {
  const room = collabRooms.get(sessionId);
  if (!room) return;
  const participants = Array.from(room)
    .map((client) => socketMetaMap.get(client))
    .filter((m): m is SocketMeta => Boolean(m))
    .map((m) => ({ userId: m.userId, username: m.username, fullName: m.fullName }));

  const uniqueMap = new Map<string, { userId: string; username: string; fullName: string }>();
  for (const p of participants) uniqueMap.set(p.userId, p);

  for (const client of room) {
    sendJson(client, {
      event: 'collab:presence',
      payload: { sessionId, activeUsers: Array.from(uniqueMap.values()) },
    });
  }
}

export function attachWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/ws', 'http://localhost');
    let token = url.searchParams.get('token') || '';

    if (!token && req.headers.cookie) {
      for (const part of req.headers.cookie.split(';')) {
        const [k, ...rest] = part.trim().split('=');
        if (k === 'bc_session') {
          token = decodeURIComponent(rest.join('='));
        }
      }
    }

    if (!token) {
      sendJson(ws, { event: 'error', payload: { message: 'Authentication token required.' } });
      ws.close(4001, 'Unauthorized');
      return;
    }

    const sessionRow = db
      .prepare(
        `SELECT u.* FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > ? AND u.status = 'active'`
      )
      .get(token, new Date().toISOString()) as AuthUser | undefined;

    if (!sessionRow) {
      sendJson(ws, { event: 'error', payload: { message: 'Invalid or expired session.' } });
      ws.close(4001, 'Unauthorized');
      return;
    }

    const meta: SocketMeta = {
      userId: sessionRow.id,
      username: sessionRow.username,
      fullName: sessionRow.full_name,
    };
    socketMetaMap.set(ws, meta);

    if (!userSockets.has(meta.userId)) {
      userSockets.set(meta.userId, new Set());
    }
    userSockets.get(meta.userId)!.add(ws);
    sendJson(ws, { event: 'connected', payload: { userId: meta.userId } });

    ws.on('message', (raw) => {
      let msg: { event?: string; payload?: Record<string, unknown> };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      const event = msg.event;
      const payload = msg.payload || {};

      if (event === 'dm:typing') {
        const recipientId = String(payload.recipientId || '');
        if (!recipientId) return;
        const targets = userSockets.get(recipientId);
        if (targets) {
          for (const target of targets) {
            sendJson(target, {
              event: 'dm:typing',
              payload: { senderId: meta.userId, isTyping: Boolean(payload.isTyping) },
            });
          }
        }
        return;
      }

      if (event === 'collab:join') {
        const sessionId = String(payload.sessionId || '');
        if (!sessionId) return;

        const session = db
          .prepare(`SELECT * FROM collab_sessions WHERE id = ? AND status = 'active'`)
          .get(sessionId) as { id: string; workspace_id: string; owner_id: string } | undefined;

        if (!session) {
          sendJson(ws, { event: 'collab:error', payload: { message: 'Collaboration session not found or closed.' } });
          return;
        }

        const participant = db
          .prepare(`SELECT role FROM collab_participants WHERE session_id = ? AND user_id = ?`)
          .get(sessionId, meta.userId) as { role: string } | undefined;

        const entitlement = getUserEntitlement(meta.userId);
        if (!participant && session.owner_id !== meta.userId) {
          sendJson(ws, { event: 'collab:error', payload: { message: 'You are not a member of this collaboration session.' } });
          return;
        }
        if (session.owner_id === meta.userId && !entitlement.limits.canUseCollabWorkspace) {
          sendJson(ws, { event: 'collab:error', payload: { message: 'Active premium entitlement required to host sessions.' } });
          return;
        }

        if (meta.collabSessionId && collabRooms.has(meta.collabSessionId)) {
          collabRooms.get(meta.collabSessionId)!.delete(ws);
          broadcastCollabPresence(meta.collabSessionId);
        }

        meta.collabSessionId = sessionId;
        if (!collabRooms.has(sessionId)) {
          collabRooms.set(sessionId, new Set());
        }
        collabRooms.get(sessionId)!.add(ws);

        const wsRow = db
          .prepare(`SELECT files_json, name, language FROM workspaces WHERE id = ?`)
          .get(session.workspace_id) as { files_json: string; name: string; language: string } | undefined;

        const messages = db
          .prepare(
            `SELECT m.id, m.content, m.created_at, u.id as user_id, u.full_name, u.username
             FROM collab_messages m JOIN users u ON u.id = m.user_id
             WHERE m.session_id = ? ORDER BY m.created_at ASC LIMIT 100`
          )
          .all(sessionId);

        sendJson(ws, {
          event: 'collab:init',
          payload: {
            sessionId,
            role: participant?.role || (session.owner_id === meta.userId ? 'owner' : 'viewer'),
            files: parseJsonSafe(wsRow?.files_json, {}),
            messages,
          },
        });
        broadcastCollabPresence(sessionId);
        return;
      }

      if (event === 'collab:file_update') {
        const sessionId = String(payload.sessionId || meta.collabSessionId || '');
        const fileName = String(payload.fileName || '');
        const content = String(payload.content ?? '');
        if (!sessionId || !fileName) return;

        const session = db
          .prepare(`SELECT workspace_id, owner_id, status FROM collab_sessions WHERE id = ?`)
          .get(sessionId) as { workspace_id: string; owner_id: string; status: string } | undefined;
        if (!session || session.status !== 'active') return;

        const participant = db
          .prepare(`SELECT role FROM collab_participants WHERE session_id = ? AND user_id = ?`)
          .get(sessionId, meta.userId) as { role: string } | undefined;

        const role = session.owner_id === meta.userId ? 'owner' : participant?.role;
        if (role !== 'owner' && role !== 'editor') {
          sendJson(ws, { event: 'collab:error', payload: { message: 'Viewers cannot modify shared files.' } });
          return;
        }

        const wsRow = db
          .prepare(`SELECT files_json FROM workspaces WHERE id = ?`)
          .get(session.workspace_id) as { files_json: string } | undefined;
        if (!wsRow) return;

        const files = parseJsonSafe<Record<string, string>>(wsRow.files_json, {});
        files[fileName] = content;
        db.prepare(`UPDATE workspaces SET files_json = ?, updated_at = ? WHERE id = ?`).run(
          JSON.stringify(files),
          new Date().toISOString(),
          session.workspace_id
        );

        const room = collabRooms.get(sessionId);
        if (room) {
          for (const client of room) {
            if (client !== ws) {
              sendJson(client, {
                event: 'collab:file_update',
                payload: { sessionId, fileName, content, updatedBy: meta.username },
              });
            }
          }
        }
        return;
      }

      if (event === 'collab:chat') {
        const sessionId = String(payload.sessionId || meta.collabSessionId || '');
        const content = String(payload.content || '').trim().slice(0, 1000);
        if (!sessionId || !content) return;

        const msgId = `cmsg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const createdAt = new Date().toISOString();
        db.prepare(
          `INSERT INTO collab_messages (id, session_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)`
        ).run(msgId, sessionId, meta.userId, content, createdAt);

        const out = {
          id: msgId,
          sessionId,
          user_id: meta.userId,
          full_name: meta.fullName,
          username: meta.username,
          content,
          created_at: createdAt,
        };
        const room = collabRooms.get(sessionId);
        if (room) {
          for (const client of room) {
            sendJson(client, { event: 'collab:chat', payload: out });
          }
        }
      }
    });

    ws.on('close', () => {
      userSockets.get(meta.userId)?.delete(ws);
      if (userSockets.get(meta.userId)?.size === 0) {
        userSockets.delete(meta.userId);
      }
      if (meta.collabSessionId && collabRooms.has(meta.collabSessionId)) {
        collabRooms.get(meta.collabSessionId)!.delete(ws);
        broadcastCollabPresence(meta.collabSessionId);
      }
    });
  });

  return wss;
}
