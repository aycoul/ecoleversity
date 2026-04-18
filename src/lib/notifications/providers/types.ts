export type WhatsAppErrorCode =
  | 'recipient_not_allowed'
  | 'template_not_found'
  | 'template_not_approved'
  | 'rate_limit_exceeded'
  | 'recipient_opted_out'
  | 'invalid_phone_format'
  | 'gateway_error'
  | 'timeout'
  | 'unauthorized'
  | 'unknown';

export type SendResult = {
  success: boolean;
  messageId?: string;
  errorCode?: WhatsAppErrorCode;
  errorMessage?: string;
};

export type SendOptions = {
  idempotencyKey?: string;
  language?: string;
};

export type WhatsAppProvider = {
  readonly name: 'ailead' | '360dialog';

  sendTemplate(
    phone: string,
    templateName: string,
    templateParams: string[],
    opts?: SendOptions,
  ): Promise<SendResult>;

  sendText(phone: string, text: string, opts?: SendOptions): Promise<SendResult>;
};

/**
 * French user-facing error messages for WhatsApp delivery failures.
 * Used when surfacing OTP/notification errors to parents in the UI.
 *
 * Any change here should be mirrored in src/i18n/messages/fr.json
 * once these strings move to i18n (post-MVP).
 */
export const WHATSAPP_ERROR_MESSAGES_FR: Record<WhatsAppErrorCode, string> = {
  recipient_not_allowed:
    'Ce numéro n\'est pas encore autorisé à recevoir des messages. Contactez le support.',
  template_not_found:
    'Erreur de configuration. Merci de contacter l\'équipe EcoleVersity.',
  template_not_approved:
    'Erreur de configuration. Merci de contacter l\'équipe EcoleVersity.',
  rate_limit_exceeded:
    'Trop de tentatives. Réessayez dans une minute.',
  recipient_opted_out:
    'Vous avez désactivé les messages WhatsApp. Nous allons essayer par email.',
  invalid_phone_format:
    'Numéro de téléphone invalide. Vérifiez le format (+225...).',
  gateway_error:
    'Service temporairement indisponible. Nous allons essayer par email.',
  timeout:
    'La connexion est lente. Nous allons essayer par email.',
  unauthorized:
    'Erreur d\'authentification. Merci de contacter le support.',
  unknown:
    'Une erreur est survenue. Merci de réessayer ou de contacter le support.',
};
