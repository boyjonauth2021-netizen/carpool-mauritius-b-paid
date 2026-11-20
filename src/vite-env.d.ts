/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYMENTS_MODE?: string;
  readonly VITE_PAYMENT_PROVIDER?: string;
  readonly VITE_PAYMENT_SECRET_KEY?: string;
  readonly VITE_PAYMENT_PUBLISHABLE_KEY?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string;
  readonly VITE_SMS_API_KEY?: string;
  readonly VITE_SMS_SENDER_ID?: string;
  readonly VITE_EMAIL_API_KEY?: string;
  readonly VITE_EMAIL_FROM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
