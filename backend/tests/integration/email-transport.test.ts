import nodemailer from 'nodemailer';

describe('patched email transport compatibility', () => {
  it('renders a Vietnamese message locally with the existing CommonJS import', async () => {
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
    try {
      const result = await transport.sendMail({
        from: 'EduSchedule <sender@example.test>',
        to: 'recipient@example.test',
        subject: 'Xác thực tài khoản',
        html: '<p>Xin chào học viên</p>',
      });
      expect(result.envelope.to).toEqual(['recipient@example.test']);
      expect(Buffer.isBuffer(result.message)).toBe(true);
      expect(result.message.toString()).toContain('Content-Type: text/html; charset=utf-8');
    } finally {
      transport.close();
    }
  });

  it('respects file-access restrictions when composing a message', async () => {
    const transport = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    try {
      await expect(
        transport.sendMail({
          from: 'sender@example.test',
          to: 'recipient@example.test',
          subject: 'Synthetic fixture',
          attachments: [{ filename: 'blocked.json', path: 'package.json' }],
        })
      ).rejects.toThrow(/file access/i);
    } finally {
      transport.close();
    }
  });
});
