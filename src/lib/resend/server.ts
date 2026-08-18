import { Resend } from "resend";

const FROM_ADDRESS = "OpenRoster <notifications@openroster.app>";

// Notifications are a nice-to-have riding on top of the real feature
// (a message that's already recorded, a roster post that's already
// live). A missing/invalid RESEND_API_KEY — which this environment has
// no real value for — or any other send failure must never fail the
// action that triggered it. Log and move on.
export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`RESEND_API_KEY not set; skipping email to ${options.to}`);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
  } catch (error) {
    console.error("Failed to send email", error);
  }
}
