import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // Khởi tạo transporter kết nối Gmail SMTP
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: false, // TLS (STARTTLS trên port 587)
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    const fromName = this.configService.get<string>('mail.fromName');
    const fromEmail = this.configService.get<string>('mail.user');

    // Gửi email đặt lại mật khẩu tới người dùng
    await this.transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Đặt lại mật khẩu tài khoản HITO CRM',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Yêu cầu đặt lại mật khẩu</h2>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
          <p>Click vào nút bên dưới để đặt lại mật khẩu. Link này sẽ hết hạn sau <strong>15 phút</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}"
               style="background-color: #4CAF50; color: white; padding: 12px 30px;
                      text-decoration: none; border-radius: 4px; font-size: 16px;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p>Hoặc copy đường link sau vào trình duyệt:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
          <hr/>
          <p style="color: #999; font-size: 12px;">
            Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
            Tài khoản của bạn vẫn an toàn.
          </p>
        </div>
      `,
    });
  }
}
