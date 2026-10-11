import type { ConfigService } from '@nestjs/config';
import type { AppConfig, MailConfig } from '../config/configuration.js';
import { UserRole } from '../database/entities/user.entity.js';
import { maskEmail, MailService, type MailTransporter } from './mail.service.js';
import { escapeHtml, renderAccountEmail, type AccountEmail } from './mail.templates.js';

function mailConfig(overrides: Partial<MailConfig> = {}): MailConfig {
  return {
    transport: 'smtp',
    from: 'AfyaLink <no-reply@afyalink.test>',
    appUrl: 'https://afyalink.example',
    smtp: { host: 'smtp.test', port: 587, secure: false, user: '', password: '' },
    ...overrides,
  };
}

function configWith(mail: MailConfig) {
  return { get: (key: string) => (key === 'mail' ? mail : undefined) } as unknown as ConfigService<AppConfig, true>;
}

function fakeTransporter(fail = false) {
  return {
    sendMail: vi.fn(async (_message: Parameters<MailTransporter['sendMail']>[0]) => {
      if (fail) throw Object.assign(new Error('Greeting never received from smtp.test for chv@x.test'), { code: 'ETIMEDOUT' });
      return { messageId: '<m1@test>' };
    }),
  } satisfies MailTransporter;
}

const recipient = { email: 'chv.mwende@afyalink.test', fullName: 'Mwende Mutua' };

describe('MailService', () => {
  it('sends through the transporter with the configured sender', async () => {
    const transporter = fakeTransporter();
    const service = new MailService(configWith(mailConfig()), transporter);
    const result = await service.send({ to: recipient.email, subject: 'Hi', text: 't', html: '<p>h</p>' });
    expect(result).toEqual({ status: 'sent', messageId: '<m1@test>' });
    expect(transporter.sendMail).toHaveBeenCalledWith({
      from: 'AfyaLink <no-reply@afyalink.test>',
      to: recipient.email,
      subject: 'Hi',
      text: 't',
      html: '<p>h</p>',
    });
  });

  it.each(['not-an-email', 'a@b.test, c@d.test', 'a@b.test\r\nBcc: x@y.test', 'Eve <eve@x.test>'])(
    'rejects unsafe recipient %j without sending',
    async (to) => {
      const transporter = fakeTransporter();
      const service = new MailService(configWith(mailConfig()), transporter);
      expect((await service.send({ to, subject: 's', text: 't', html: 'h' })).status).toBe('rejected');
      expect(transporter.sendMail).not.toHaveBeenCalled();
    },
  );

  it('strips line breaks from the subject (header injection)', async () => {
    const transporter = fakeTransporter();
    const service = new MailService(configWith(mailConfig()), transporter);
    await service.send({ to: recipient.email, subject: 'Hi\r\nBcc: evil@x.test', text: 't', html: 'h' });
    expect(transporter.sendMail.mock.calls[0]?.[0]).toMatchObject({ subject: 'Hi Bcc: evil@x.test' });
  });

  it('reports failure with an error code only and never throws', async () => {
    const service = new MailService(configWith(mailConfig()), fakeTransporter(true));
    const result = await service.send({ to: recipient.email, subject: 's', text: 't', html: 'h' });
    expect(result).toEqual({ status: 'failed', reason: 'ETIMEDOUT' });
  });

  it('does not send in log or none mode', async () => {
    const transporter = fakeTransporter();
    const logged = new MailService(configWith(mailConfig({ transport: 'log' })), transporter);
    const disabled = new MailService(configWith(mailConfig({ transport: 'none' })), transporter);
    expect((await logged.send({ to: recipient.email, subject: 's', text: 't', html: 'h' })).status).toBe('logged');
    expect((await disabled.send({ to: recipient.email, subject: 's', text: 't', html: 'h' })).status).toBe('disabled');
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it('notifyAccount is fire-and-forget and survives transport failures', async () => {
    const transporter = fakeTransporter(true);
    const service = new MailService(configWith(mailConfig()), transporter);
    expect(() => service.notifyAccount(recipient, { kind: 'password_changed' })).not.toThrow();
    await service.flush();
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
  });

  it('masks addresses for logs', () => {
    expect(maskEmail('chv.mwende@afyalink.test')).toBe('c***@afyalink.test');
    expect(maskEmail('nope')).toBe('***');
  });
});

describe('account email templates', () => {
  const ctx = { appUrl: 'https://afyalink.example', at: new Date('2026-10-11T08:30:00Z') };
  const events: AccountEmail[] = [
    { kind: 'account_created', role: UserRole.CHV },
    { kind: 'password_changed' },
    { kind: 'password_reset_by_admin' },
    { kind: 'mfa_enabled' },
    { kind: 'mfa_disabled' },
    { kind: 'mfa_reset_by_admin' },
    { kind: 'signed_out_everywhere' },
    { kind: 'account_deactivated' },
    { kind: 'account_reactivated' },
    { kind: 'role_changed', role: UserRole.ADMIN },
  ];

  it.each(events)('renders $kind with subject, text and html', (event) => {
    const email = renderAccountEmail(recipient, event, ctx);
    expect(email.subject.length).toBeGreaterThan(5);
    expect(email.text).toContain('Hello Mwende,');
    expect(email.text).toContain('2026-10-11 08:30 UTC');
    expect(email.html).toContain('Hello Mwende,');
  });

  it('never claims to include a password', () => {
    for (const event of events) {
      const { text } = renderAccountEmail(recipient, event, ctx);
      expect(text).not.toMatch(/password is:|your password:|code is:/i);
    }
  });

  it('escapes the recipient name in HTML', () => {
    const email = renderAccountEmail({ email: recipient.email, fullName: '<script>x</script> Doe' }, { kind: 'mfa_enabled' }, ctx);
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;x&lt;/script&gt;');
  });

  it('builds links from the configured app URL', () => {
    const email = renderAccountEmail(recipient, { kind: 'account_created', role: UserRole.CHV }, ctx);
    expect(email.text).toContain('https://afyalink.example/login');
    expect(email.html).toContain('href="https://afyalink.example/login"');
  });

  it('escapeHtml covers the five special characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});
