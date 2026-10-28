/* Sends one message to nicole@kneecoal.com.
   Pages has no Send Email binding in the dashboard, so production uses the
   Email Sending API. Settings → Variables and secrets → secret EMAIL_API_TOKEN
   (Account → Email Sending → Edit). quotes@kneecoal.com is the sender name
   on the onboarded kneecoal.com domain. It is not a mailbox. */

const ACCOUNT_ID = "a393e31f6d97e53b89a3eabec18b069e";
const TO = "nicole@kneecoal.com";
const FROM = "quotes@kneecoal.com";
const FROM_NAME = "Nicole Steinmetz website";

export function canSendMail(env) {
  return Boolean(
    (env.EMAIL && typeof env.EMAIL.send === "function") ||
    (typeof env.EMAIL_API_TOKEN === "string" && env.EMAIL_API_TOKEN.trim())
  );
}

export async function sendSiteMail(env, message) {
  if (env.EMAIL && typeof env.EMAIL.send === "function") {
    await env.EMAIL.send({
      to: TO,
      from: { email: FROM, name: FROM_NAME },
      replyTo: message.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text
    });
    return;
  }

  const token = typeof env.EMAIL_API_TOKEN === "string" ? env.EMAIL_API_TOKEN.trim() : "";
  if (!token) {
    const error = new Error("email not configured");
    error.code = "not_configured";
    throw error;
  }

  const body = {
    to: TO,
    from: { address: FROM, name: FROM_NAME },
    subject: message.subject,
    html: message.html,
    text: message.text
  };
  if (message.replyTo && message.replyTo.email) {
    body.reply_to = { address: message.replyTo.email, name: message.replyTo.name };
  }

  const response = await fetch(
    "https://api.cloudflare.com/client/v4/accounts/" + ACCOUNT_ID + "/email/sending/send",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok || !payload || payload.success !== true) {
    const detail = payload && payload.errors && payload.errors[0];
    const error = new Error((detail && detail.message) || "email send failed");
    error.code = detail && detail.code;
    throw error;
  }
}
