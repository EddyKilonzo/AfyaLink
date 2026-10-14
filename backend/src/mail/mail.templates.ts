import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderFile } from 'ejs';
import { UserRole } from '../database/entities/user.entity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, 'templates');

/**
 * Account and security notifications. Templates deliberately never contain
 * passwords, one-time codes, MFA secrets, tokens or any health-report
 * content: email is not a secure channel, and mailboxes are often shared.
 */
export type AccountEmail =
  | { kind: 'account_created'; role: UserRole }
  | { kind: 'password_changed' }
  | { kind: 'password_reset_by_admin' }
  | { kind: 'mfa_enabled' }
  | { kind: 'mfa_disabled' }
  | { kind: 'mfa_reset_by_admin' }
  | { kind: 'signed_out_everywhere' }
  | { kind: 'account_deactivated' }
  | { kind: 'account_reactivated' }
  | { kind: 'role_changed'; role: UserRole };

export type AccountEmailKind = AccountEmail['kind'];

export interface EmailRecipient {
  email: string;
  fullName: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export interface TemplateContext {
  appUrl: string;
  /** When the event happened; shown in UTC so it reads the same everywhere. */
  at: Date;
  /** For password reset emails */
  resetUrl?: string;
  /** For notifications */
  title?: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
}

const ROLE_NAMES: Record<UserRole, string> = {
  [UserRole.CHV]: 'Community Health Volunteer',
  [UserRole.ADMIN]: 'Administrator',
};

const NOT_YOU = 'If you did not expect this, contact your AfyaLink administrator straight away.';

function greetingName(fullName: string): string {
  // eslint-disable-next-line no-control-regex
  const first = fullName.replace(/[\u0000-\u001f\u007f]/g, '').trim().split(/\s+/)[0] ?? '';
  return first.slice(0, 60) || 'there';
}

function formatUtc(at: Date): string {
  return `${at.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function renderTemplate(templateName: string, data: Record<string, unknown>): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.ejs`);
  // renderFile is async by default. Do NOT pass `async: true` here: the
  // templates use `<%- include(...) -%>`, which under async mode returns a
  // Promise that EJS stringifies as "[object Promise]".
  return renderFile(templatePath, data);
}

export async function renderAccountEmail(recipient: EmailRecipient, event: AccountEmail, ctx: TemplateContext): Promise<{ subject: string; text: string; html: string }> {
  const name = greetingName(recipient.fullName);
  const when = `Time: ${formatUtc(ctx.at)}`;
  // Templates build HTML by string concatenation, so escape the name once
  // here and hand the safe copy to every template.
  const safeName = escapeHtml(recipient.fullName);

  switch (event.kind) {
    case 'account_created': {
      const subject = 'Welcome to AfyaLink';
      const html = await renderTemplate('welcome', {
        subject,
        fullName: recipient.fullName,
        safeName,
        role: event.role,
        appUrl: ctx.appUrl,
      });
      const text = [
        `Hello ${name},`,
        '',
        `An administrator created an AfyaLink account for you as a ${ROLE_NAMES[event.role]}.`,
        'Your administrator will give you your first password in person or by phone. It is never sent by email.',
        'After signing in, change it under Settings.',
        '',
        when,
        '',
        `Sign in to AfyaLink: ${ctx.appUrl}/login`,
        '',
        '—',
        'This is an automatic message from AfyaLink. Please do not reply.',
      ].join('\n');
      return { subject, text, html };
    }

    case 'password_changed': {
      const subject = 'Your AfyaLink password was changed';
      const html = await renderTemplate('notification', {
        subject,
        fullName: recipient.fullName,
        safeName,
        title: 'Password Changed',
        message: 'The password for your AfyaLink account was just changed. Your other devices have been signed out.',
        appUrl: ctx.appUrl,
        actionUrl: undefined,
        actionLabel: undefined,
      });
      const text = [
        `Hello ${name},`,
        '',
        'The password for your AfyaLink account was just changed. Your other devices have been signed out.',
        '',
        when,
        '',
        NOT_YOU,
        '',
        '—',
        'This is an automatic message from AfyaLink. Please do not reply.',
      ].join('\n');
      return { subject, text, html };
    }

    case 'password_reset_by_admin': {
      const subject = 'Your AfyaLink password was reset';
      const html = await renderTemplate('password-reset', {
        subject,
        fullName: recipient.fullName,
        safeName,
        appUrl: ctx.appUrl,
        resetUrl: ctx.resetUrl || `${ctx.appUrl}/login`,
      });
      const text = [
        `Hello ${name},`,
        '',
        'An administrator reset the password for your AfyaLink account and you have been signed out on every device.',
        'Your administrator will give you the new password directly. It is never sent by email.',
        '',
        when,
        '',
        `Sign in to AfyaLink: ${ctx.appUrl}/login`,
        '',
        NOT_YOU,
        '',
        '—',
        'This is an automatic message from AfyaLink. Please do not reply.',
      ].join('\n');
      return { subject, text, html };
    }

    case 'mfa_enabled': {
      const subject = 'Two-factor authentication enabled';
      const html = await renderTemplate('mfa-change', {
        subject,
        fullName: recipient.fullName,
        safeName,
        enabled: true,
        appUrl: ctx.appUrl,
      });
      const text = [
        `Hello ${name},`,
        '',
        'Two-factor authentication (2FA) has been successfully enabled on your AfyaLink account.',
        'You will need a code from your authenticator app each time you sign in.',
        '',
        when,
        '',
        NOT_YOU,
        '',
        '—',
        'This is an automatic message from AfyaLink. Please do not reply.',
      ].join('\n');
      return { subject, text, html };
    }

    case 'mfa_disabled': {
      const subject = 'Two-factor authentication disabled';
      const html = await renderTemplate('mfa-change', {
        subject,
        fullName: recipient.fullName,
        safeName,
        enabled: false,
        appUrl: ctx.appUrl,
      });
      const text = [
        `Hello ${name},`,
        '',
        'Two-factor authentication (2FA) has been disabled on your AfyaLink account.',
        'Your account now uses password-only authentication.',
        '',
        when,
        '',
        NOT_YOU,
        '',
        '—',
        'This is an automatic message from AfyaLink. Please do not reply.',
      ].join('\n');
      return { subject, text, html };
    }

    case 'mfa_reset_by_admin': {
      const subject = 'Two-factor authentication was reset';
      const html = await renderTemplate('mfa-change', {
        subject,
        fullName: recipient.fullName,
        safeName,
        enabled: false,
        appUrl: ctx.appUrl,
      });
      const text = [
        `Hello ${name},`,
        '',
        'An administrator turned off two-factor authentication for your AfyaLink account and signed you out on every device.',
        'We recommend turning it back on with your new device under Settings.',
        '',
        when,
        '',
        `Open settings: ${ctx.appUrl}/settings`,
        '',
        NOT_YOU,
        '',
        '—',
        'This is an automatic message from AfyaLink. Please do not reply.',
      ].join('\n');
      return { subject, text, html };
    }

    case 'signed_out_everywhere': {
      const subject = 'You were signed out on all devices';
      const html = await renderTemplate('notification', {
        subject,
        fullName: recipient.fullName,
        safeName,
        title: 'Signed Out Everywhere',
        message: 'Every session of your AfyaLink account was ended, on every device.',
        appUrl: ctx.appUrl,
        actionUrl: undefined,
        actionLabel: undefined,
      });
      const text = [
        `Hello ${name},`,
        '',
        'Every session of your AfyaLink account was ended, on every device.',
        '',
        when,
        '',
        NOT_YOU,
        '',
        '—',
        'This is an automatic message from AfyaLink. Please do not reply.',
      ].join('\n');
      return { subject, text, html };
    }

    case 'account_deactivated': {
      const subject = 'Your AfyaLink account was deactivated';
      const html = await renderTemplate('notification', {
        subject,
        fullName: recipient.fullName,
        safeName,
        title: 'Account Deactivated',
        message: 'An administrator deactivated your AfyaLink account. You can no longer sign in. Reports that had not synced stay on your device. Ask your administrator if you need access again.',
        appUrl: ctx.appUrl,
        actionUrl: undefined,
        actionLabel: undefined,
      });
      const text = [
        `Hello ${name},`,
        '',
        'An administrator deactivated your AfyaLink account. You can no longer sign in.',
        'Reports that had not synced stay on your device. Ask your administrator if you need access again.',
        '',
        when,
        '',
        '—',
        'This is an automatic message from AfyaLink. Please do not reply.',
      ].join('\n');
      return { subject, text, html };
    }

    case 'account_reactivated': {
      const subject = 'Your AfyaLink account was reactivated';
      const html = await renderTemplate('notification', {
        subject,
        fullName: recipient.fullName,
        safeName,
        title: 'Account Reactivated',
        message: 'An administrator reactivated your AfyaLink account. You can sign in again.',
        appUrl: ctx.appUrl,
        actionUrl: `${ctx.appUrl}/login`,
        actionLabel: 'Sign In to AfyaLink',
      });
      const text = [
        `Hello ${name},`,
        '',
        'An administrator reactivated your AfyaLink account. You can sign in again.',
        '',
        when,
        '',
        `Sign in to AfyaLink: ${ctx.appUrl}/login`,
        '',
        '—',
        'This is an automatic message from AfyaLink. Please do not reply.',
      ].join('\n');
      return { subject, text, html };
    }

    case 'role_changed': {
      const subject = 'Your AfyaLink role changed';
      const html = await renderTemplate('notification', {
        subject,
        fullName: recipient.fullName,
        safeName,
        title: 'Role Changed',
        message: `An administrator changed your AfyaLink role to ${ROLE_NAMES[event.role]}. You have been signed out; sign in again to continue.`,
        appUrl: ctx.appUrl,
        actionUrl: `${ctx.appUrl}/login`,
        actionLabel: 'Sign In to AfyaLink',
      });
      const text = [
        `Hello ${name},`,
        '',
        `An administrator changed your AfyaLink role to ${ROLE_NAMES[event.role]}.`,
        'You have been signed out; sign in again to continue.',
        '',
        when,
        '',
        `Sign in to AfyaLink: ${ctx.appUrl}/login`,
        '',
        NOT_YOU,
        '',
        '—',
        'This is an automatic message from AfyaLink. Please do not reply.',
      ].join('\n');
      return { subject, text, html };
    }
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}