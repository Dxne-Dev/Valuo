import { type AppNotification } from "@/data";
import { fetchUserNotifications, markNotificationsAsReadInDb } from "@/lib/api";

export { fetchUserNotifications, markNotificationsAsReadInDb };
export type { AppNotification };
