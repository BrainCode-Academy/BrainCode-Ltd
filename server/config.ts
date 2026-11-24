import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const generatedFallbackSecret = crypto.randomBytes(32).toString('hex');

export const config = {
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  authSecret: process.env.AUTH_SECRET || generatedFallbackSecret,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gemini-4-hydrogen',
  aiDailyFreeLimit: Number(process.env.AI_DAILY_FREE_LIMIT || 15),
  aiDailyPremiumLimit: Number(process.env.AI_DAILY_PREMIUM_LIMIT || 250),
  productName: process.env.PRODUCT_NAME || 'Braincode',
  tagline: process.env.PRODUCT_TAGLINE || 'Learn. Build. Innovate. Grow.',
  companyName: process.env.COMPANY_NAME || 'BrainCode Technology Limited',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@braincode.dev',
  contactInfo: {
    officialEmail: process.env.OFFICIAL_CONTACT_EMAIL || '',
    businessPhone: process.env.BUSINESS_PHONE || '',
    whatsappUrl: process.env.WHATSAPP_URL || '',
    businessAddress: process.env.BUSINESS_ADDRESS || '',
    officeHours: process.env.OFFICE_HOURS || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
  },
  oauth: {
    googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    appleEnabled: Boolean(process.env.APPLE_CLIENT_ID),
    appleClientId: process.env.APPLE_CLIENT_ID || '',
  },
  payments: {
    provider: process.env.STRIPE_SECRET_KEY ? 'stripe' : 'sandbox',
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || '',
  },
  sandbox: {
    remoteSandboxUrl: process.env.CODE_SANDBOX_URL || '',
    remoteSandboxEnabled: Boolean(process.env.CODE_SANDBOX_URL),
    browserLanguages: ['html', 'css', 'javascript', 'typescript'],
    remoteOnlyLanguages: ['python', 'go', 'rust', 'cpp'],
  },
};
