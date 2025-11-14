import type { Response } from 'express';

interface SSEClient {
  userId: number;
  res: Response;
}

class NotificationBroadcaster {
  private clients: Map<number, Set<Response>> = new Map();

  addClient(userId: number, res: Response) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(res);

    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // Remove client on connection close
    res.on('close', () => {
      this.removeClient(userId, res);
    });
  }

  removeClient(userId: number, res: Response) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(res);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  broadcast(userId: number, notification: any) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const data = JSON.stringify(notification);
      userClients.forEach(res => {
        try {
          res.write(`data: ${data}\n\n`);
        } catch (error) {
          console.error('[SSE] Error broadcasting to client:', error);
          this.removeClient(userId, res);
        }
      });
    }
  }

  getClientCount(userId?: number): number {
    if (userId !== undefined) {
      return this.clients.get(userId)?.size || 0;
    }
    let total = 0;
    this.clients.forEach(clients => {
      total += clients.size;
    });
    return total;
  }
}

export const notificationBroadcaster = new NotificationBroadcaster();
