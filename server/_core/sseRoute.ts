import type { Request, Response } from 'express';
import { sdk } from './sdk';
import { notificationBroadcaster } from './notificationBroadcaster';

export async function handleSSE(req: Request, res: Response) {
  try {
    // Verify authentication
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Add client to broadcaster
    notificationBroadcaster.addClient(user.id, res);

    console.log(`[SSE] Client connected: userId=${user.id}, total=${notificationBroadcaster.getClientCount()}`);
  } catch (error) {
    console.error('[SSE] Connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
