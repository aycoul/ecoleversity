export type NotificationEvent =
  | 'booking_confirmed'
  | 'payment_confirmed'
  | 'session_reminder_24h'
  | 'session_reminder_15min'
  | 'new_message'
  | 'teacher_verified'
  | 'teacher_rejected'
  | 'new_enrollment'
  | 'new_review'
  | 'payout_processed'
  | 'new_follower'
  | 'new_class_from_followed';

export type NotificationPayload = {
  event: NotificationEvent;
  userId: string;
  data: Record<string, string | number>;
};
