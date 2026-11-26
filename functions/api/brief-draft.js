import { handleDraft } from "../_lib/brief-http.js";

export function onRequest(context) {
  return handleDraft(context.request, context.env);
}
