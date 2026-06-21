interface QueueItem {
  companyId: string;
  jid:       string;
  content:   string;
  outboxId?: number;
}

type SockGetter     = (companyId: string) => import("@whiskeysockets/baileys").WASocket | null;
type OnSentCallback = (outboxId: number) => void;

const queue: QueueItem[] = [];
let processing = false;

const sentMessages = new Map<string, string>();

export function getStoredMessage(id: string): string | undefined {
  return sentMessages.get(id);
}

export function enqueueMessage(
  companyId: string,
  jid:       string,
  content:   string,
  outboxId?: number
): void {
  queue.push({ companyId, jid, content, outboxId });
}

export function startMessageQueueWorker(
  getSock:  SockGetter,
  onSent:   OnSentCallback
): void {
  setInterval(async () => {
    if (processing || queue.length === 0) return;

    const item = queue[0];
    const sock = getSock(item.companyId);
    if (!sock) return;

    processing = true;
    queue.shift();

    try {
      const result = await sock.sendMessage(item.jid, { text: item.content });

      const msgId = result?.key?.id;
      if (msgId) {
        sentMessages.set(msgId, item.content);
        setTimeout(() => sentMessages.delete(msgId), 5 * 60 * 1000);
      }

      console.log(`[queue:${item.companyId}] ✓ Enviado a ${item.jid} (cola restante: ${queue.length})`);

      if (item.outboxId !== undefined) {
        onSent(item.outboxId);
      }
    } catch (err) {
      console.error(`[queue:${item.companyId}] Error enviando a ${item.jid}:`, err);
      if (item.outboxId !== undefined) {
        queue.unshift(item);
      }
    } finally {
      processing = false;
    }
  }, 500);
}

export function getQueueLength(): number {
  return queue.length;
}
