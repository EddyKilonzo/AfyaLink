import { Inject, Injectable, Logger, Optional, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { AppConfig, MailConfig } from '../config/configuration.js';
import {
  renderAccountEmail,
  type AccountEmail,
  type EmailRecipient,
  type RenderedEmail,
} from './mail.templates.js';

export interface OutgoingEmail extends RenderedEmail {
  to: string;
}

export type SendResult =
  | { status: 'sent'; messageId: string | null }
  | { status: 'logged' }
  | { status: 'disabled' }
  | { status: 'rejected'; reason: string }
  | { status: 'failed'; reason: string };

/** Minimal surface of a nodemailer transporter; lets tests inject a fake. */
export interface MailTransporter {
  sendMail(message: { from: string; to: string; subject: string; text: string; html: string }): Promise<{ messageId?: string }>;
  verify?(): Promise<unknown>;
  close?(): void;
}

export const MAIL_TRANSPORTER = Symbol('MAIL_TRANSPORTER');

// Deliberately strict: one plain address, no display name, no list, no CR/LF.
const EMAIL = /^[^\s@<>(),;:"\\]+@[^\s@<>(),;:"\\]+\.[^\s@<>(),;:"\\]+$/;

/** `chv.mwende@afyalink.test` → `c***@afyalink.test`, for logs. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '***';
  return `${email[0]}***${email.slice(at)}`;
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
}

export function createSmtpTransporter(mail: MailConfig): MailTransporter {
  const { host, port, secure, user, password } = mail.smtp;
  return createTransport({
    host,
    port,
    secure,
    // Without implicit TLS, refuse to send unless STARTTLS succeeds.
    requireTLS: !secure,
    auth: user ? { user, pass: password } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: 'TLSv1.2' },
  }) as unknown as MailTransporter;
}

/**
 * Sends email server-side. Credentials stay in the backend's environment;
 * the browser never talks to the mail server.
 *
 * - `send()` reports what happened and never throws.
 * - `notifyAccount()` is fire-and-forget for account/security notices: a mail
 *   outage must never fail or slow down the action that triggered it.
 * - Logs carry a masked recipient and the subject only, never the body.
 */
@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private readonly mail: MailConfig;
  private transporter: MailTransporter | null = null;
  private readonly pending = new Set<Promise<unknown>>();

  constructor(
    config: ConfigService<AppConfig, true>,
    @Optional() @Inject(MAIL_TRANSPORTER) transporterOverride?: MailTransporter | null,
  ) {
    this.mail = config.get('mail', { infer: true });
    if (transporterOverride) this.transporter = transporterOverride;
    else if (this.mail.transport === 'smtp') this.transporter = createSmtpTransporter(this.mail);
  }

  get transport(): MailConfig['transport'] {
    return this.mail.transport;
  }

  onModuleInit(): void {
    this.logger.log(
      this.mail.transport === 'smtp'
        ? `Email: SMTP via ${this.mail.smtp.host}:${this.mail.smtp.port}.`
        : this.mail.transport === 'log'
          ? 'Email: log only (nothing is delivered). Set SMTP_HOST to send.'
          : 'Email: disabled.',
    );
    // Check the SMTP connection in the background; a failure is reported, not fatal.
    const verify = this.transporter?.verify?.();
    if (verify) {
      this.track(
        verify.then(
          () => this.logger.log('SMTP connection verified.'),
          (error: unknown) => this.logger.warn(`SMTP verification failed: ${this.reason(error)}. Emails will be retried per message.`),
        ),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.flush();
    this.transporter?.close?.();
  }

  /** Waits for in-flight fire-and-forget sends (shutdown and tests). */
  async flush(): Promise<void> {
    await Promise.allSettled(this.pending);
  }

  async send(message: OutgoingEmail): Promise<SendResult> {
    const to = message.to.trim();
    if (!EMAIL.test(to) || to.length > 160) {
      this.logger.warn('Email not sent: invalid recipient address.');
      return { status: 'rejected', reason: 'invalid recipient' };
    }
    const subject = oneLine(message.subject);
    const label = `"${subject}" to ${maskEmail(to)}`;

    if (this.mail.transport === 'none') return { status: 'disabled' };
    if (this.mail.transport === 'log' || !this.transporter) {
      this.logger.log(`[email:log] ${label}`);
      return { status: 'logged' };
    }

    try {
      const info = await this.transporter.sendMail({ from: this.mail.from, to, subject, text: message.text, html: message.html });
      this.logger.log(`Email sent: ${label}`);
      return { status: 'sent', messageId: info.messageId ?? null };
    } catch (error) {
      const reason = this.reason(error);
      this.logger.error(`Email failed: ${label} (${reason})`);
      return { status: 'failed', reason };
    }
  }

/** Renders and sends an account/security notice without blocking the caller. */
  async notifyAccount(recipient: EmailRecipient, event: AccountEmail): Promise<void> {
    const rendered = await renderAccountEmail(recipient, event, { appUrl: this.mail.appUrl, at: new Date() });
    this.track(this.send({ to: recipient.email, ...rendered }));
  }

  private track(promise: Promise<unknown>): void {
    const tracked = promise.catch(() => undefined).finally(() => this.pending.delete(tracked));
    this.pending.add(tracked);
  }

  /** Error code/name only: SMTP error messages can echo addresses or server details. */
  private reason(error: unknown): string {
    if (error && typeof error === 'object') {
      const { code, responseCode } = error as { code?: unknown; responseCode?: unknown };
      if (typeof code === 'string') return typeof responseCode === 'number' ? `${code} ${responseCode}` : code;
      if (error instanceof Error) return error.name;
    }
    return 'unknown error';
  }
}
