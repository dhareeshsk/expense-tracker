import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

const isConfigured = Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject);

if (isConfigured) {
  webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!);
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
) {
  if (!isConfigured) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired/revoked on the browser side — clean it up.
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }),
  );
}
