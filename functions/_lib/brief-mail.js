/* Email bodies for a project brief. The resume link is only added
   when the client asks to be emailed their own link. */

import { STUDIO_EMAIL } from "./send-mail.js";
import { summarySections } from "../../js/brief-schema.js";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cell(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

export function businessBriefMessage(answers, summary) {
  const sections = summarySections(answers);
  const sent = new Date().toLocaleString("en-AU", {
    timeZone: "Australia/Perth",
    dateStyle: "full",
    timeStyle: "short"
  });
  const blocks = sections.map((section) => {
    const rows = section.rows.map((row) =>
      `<tr><th style="text-align:left;padding:8px 12px;border:1px solid #DAD6D2;background:#F7F6F5;font-weight:600;vertical-align:top;">${escapeHtml(row.label)}</th><td style="padding:8px 12px;border:1px solid #DAD6D2;vertical-align:top;">${cell(row.value)}</td></tr>`
    ).join("");
    return `<tr><th colspan="2" style="text-align:left;padding:12px;border:1px solid #DAD6D2;background:#894332;color:#FFFFFF;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(section.title)}</th></tr>${rows}`;
  }).join("");
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#FFFFFF;color:#505050;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;">`
    + `<p style="margin:0 0 16px;">A project brief came in from the website.</p>`
    + `<table style="border-collapse:collapse;width:100%;max-width:640px;">${blocks}`
    + `<tr><th style="text-align:left;padding:8px 12px;border:1px solid #DAD6D2;background:#F7F6F5;">Received</th><td style="padding:8px 12px;border:1px solid #DAD6D2;">${escapeHtml(sent)}</td></tr>`
    + `</table></body></html>`;
  return {
    replyTo: { email: answers.email, name: answers.name },
    subject: oneLine(`Project brief from ${answers.businessName || answers.name}`, 150),
    html: html,
    text: `${summary}\n\nReceived: ${sent}`
  };
}

export function clientAckMessage(answers) {
  const text = [
    "Thanks — your project brief is in.",
    "",
    "We’ll review your answers and be in touch about the next steps.",
    "",
    "— Nicole Steinmetz"
  ].join("\n");
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#FFFFFF;color:#505050;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;">`
    + `<p>Thanks — your project brief is in.</p>`
    + `<p>We’ll review your answers and be in touch about the next steps.</p>`
    + `<p>— Nicole Steinmetz</p></body></html>`;
  return {
    to: answers.email,
    replyTo: { email: STUDIO_EMAIL, name: "Nicole Steinmetz" },
    subject: "We’ve received your project brief",
    html: html,
    text: text
  };
}

export function resumeLinkMessage(answers, link, expiresAt) {
  const date = new Date(expiresAt).toLocaleDateString("en-AU", {
    timeZone: "Australia/Perth",
    dateStyle: "long"
  });
  const text = [
    "Here’s the private link to your project brief:",
    "",
    link,
    "",
    `Anyone with this link can open the draft. It expires on ${date}. Don’t post the link publicly.`,
    "",
    "— Nicole Steinmetz"
  ].join("\n");
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#FFFFFF;color:#505050;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;">`
    + `<p>Here’s the private link to your project brief:</p>`
    + `<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`
    + `<p>Anyone with this link can open the draft. It expires on ${escapeHtml(date)}. Don’t post the link publicly.</p>`
    + `<p>— Nicole Steinmetz</p></body></html>`;
  return {
    to: answers.email,
    replyTo: { email: STUDIO_EMAIL, name: "Nicole Steinmetz" },
    subject: "Your project brief link",
    html: html,
    text: text
  };
}

function oneLine(value, max) {
  return String(value || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
