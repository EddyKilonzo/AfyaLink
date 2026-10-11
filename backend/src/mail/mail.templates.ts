import { UserRole } from '../database/entities/user.entity.js';

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
}

const ROLE_NAMES: Record<UserRole, string> = {
  [UserRole.CHV]: 'Community Health Volunteer',
  [UserRole.ADMIN]: 'Administrator',
};

const NOT_YOU = 'If you did not expect this, contact your AfyaLink administrator straight away.';

interface Content {
  subject: string;
  lines: string[];
  action?: { label: string; path: string };
  /** Security events get the "not you?" warning. */
  security: boolean;
}

function content(event: AccountEmail): Content {
  switch (event.kind) {
    case 'account_created':
      return {
        subject: 'Your AfyaLink account is ready',
        lines: [
          `An administrator created an AfyaLink account for you as a ${ROLE_NAMES[event.role]}.`,
          'Your administrator will give you your first password in person or by phone. It is never sent by email.',
          'After signing in, change it under Settings.',
        ],
        action: { label: 'Sign in to AfyaLink', path: '/login' },
        security: false,
      };
    case 'password_changed':
      return {
        subject: 'Your AfyaLink password was changed',
        lines: ['The password for your AfyaLink account was just changed. Your other devices have been signed out.'],
        security: true,
      };
    case 'password_reset_by_admin':
      return {
        subject: 'Your AfyaLink password was reset',
        lines: [
          'An administrator reset the password for your AfyaLink account and you have been signed out on every device.',
          'Your administrator will give you the new password directly. It is never sent by email.',
        ],
        action: { label: 'Sign in to AfyaLink', path: '/login' },
        security: true,
      };
    case 'mfa_enabled':
      return {
        subject: 'Two-factor sign-in is on',
        lines: ['Two-factor sign-in was turned on for your AfyaLink account. You will need a code from your authenticator app each time you sign in.'],
        security: true,
      };
    case 'mfa_disabled':
      return {
        subject: 'Two-factor sign-in is off',
        lines: ['Two-factor sign-in was turned off for your AfyaLink account.'],
        action: { label: 'Review your settings', path: '/settings' },
        security: true,
      };
    case 'mfa_reset_by_admin':
      return {
        subject: 'Two-factor sign-in was reset',
        lines: [
          'An administrator turned off two-factor sign-in for your AfyaLink account and signed you out on every device.',
          'We recommend turning it back on with your new device under Settings.',
        ],
        action: { label: 'Open settings', path: '/settings' },
        security: true,
      };
    case 'signed_out_everywhere':
      return {
        subject: 'You were signed out on all devices',
        lines: ['Every session of your AfyaLink account was ended, on every device.'],
        security: true,
      };
    case 'account_deactivated':
      return {
        subject: 'Your AfyaLink account was deactivated',
        lines: [
          'An administrator deactivated your AfyaLink account. You can no longer sign in.',
          'Reports that had not synced stay on your device. Ask your administrator if you need access again.',
        ],
        security: false,
      };
    case 'account_reactivated':
      return {
        subject: 'Your AfyaLink account was reactivated',
        lines: ['An administrator reactivated your AfyaLink account. You can sign in again.'],
        action: { label: 'Sign in to AfyaLink', path: '/login' },
        security: false,
      };
    case 'role_changed':
      return {
        subject: 'Your AfyaLink role changed',
        lines: [
          `An administrator changed your AfyaLink role to ${ROLE_NAMES[event.role]}.`,
          'You have been signed out; sign in again to continue.',
        ],
        action: { label: 'Sign in to AfyaLink', path: '/login' },
        security: true,
      };
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

/** First name for the greeting; control characters removed, length capped. */
function greetingName(fullName: string): string {
  // eslint-disable-next-line no-control-regex
  const first = fullName.replace(/[\u0000-\u001f\u007f]/g, '').trim().split(/\s+/)[0] ?? '';
  return first.slice(0, 60) || 'there';
}

function formatUtc(at: Date): string {
  return `${at.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export function renderAccountEmail(recipient: EmailRecipient, event: AccountEmail, ctx: TemplateContext): RenderedEmail {
  const c = content(event);
  const name = greetingName(recipient.fullName);
  const when = `Time: ${formatUtc(ctx.at)}`;
  const link = c.action ? `${ctx.appUrl}${c.action.path}` : null;
  const footer = 'This is an automatic message from AfyaLink. Please do not reply.';

  const text = [
    `Hello ${name},`,
    '',
    ...c.lines,
    '',
    when,
    ...(link && c.action ? ['', `${c.action.label}: ${link}`] : []),
    ...(c.security ? ['', NOT_YOU] : []),
    '',
    '—',
    footer,
  ].join('\n');

  const p = (s: string) => `<p style="margin:0 0 12px">${escapeHtml(s)}</p>`;
  const html = [
    '<!doctype html><html lang="en"><body style="margin:0;background:#f6f5f1;font-family:Arial,Helvetica,sans-serif;color:#13221f">',
    '<div style="max-width:520px;margin:0 auto;padding:24px">',
    '<p style="margin:0 0 16px;font-weight:bold;color:#0e6a59;font-size:18px">AfyaLink</p>',
    '<div style="background:#ffffff;border:1px solid #e3e1d9;border-radius:12px;padding:20px">',
    p(`Hello ${name},`),
    ...c.lines.map(p),
    `<p style="margin:0 0 12px;color:#5b6b67;font-size:13px">${escapeHtml(when)}</p>`,
    link && c.action
      ? `<p style="margin:16px 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#0e6a59;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:bold">${escapeHtml(c.action.label)}</a></p>`
      : '',
    c.security ? `<p style="margin:12px 0 0;color:#b91c1c;font-size:13px">${escapeHtml(NOT_YOU)}</p>` : '',
    '</div>',
    `<p style="margin:16px 0 0;color:#5b6b67;font-size:12px">${escapeHtml(footer)}</p>`,
    '</div></body></html>',
  ].join('');

  return { subject: c.subject, text, html };
}
