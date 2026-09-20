import nodemailer from "nodemailer";

// Agar EMAIL_PASSWORD (Gmail App Password) set hai to usko use karo —
// ye expire nahi hota. Warna OAuth2 refresh token (ye Testing-mode apps
// me har 7 din expire ho jata hai -> "invalid_grant" error).
const authConfig = process.env.EMAIL_PASSWORD
    ? {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
      }
    : {
          type: "OAuth2",
          user: process.env.EMAIL_USER,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      };

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: authConfig,
});

transporter.verify((error, success) => {
    if (error) {
        console.error("Error verifying transporter:", error);
    } else {
        console.log("Transporter is ready to send emails");
    }
});

 export const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Your Name" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.code === 'EAUTH') {
      console.error(
        '=> Gmail auth fail (invalid_grant). Fix: EMAIL_PASSWORD (App Password) set karo ya naya GOOGLE_REFRESH_TOKEN generate karo.'
      );
    }
  }
}

