import { handleSubmit } from "../_lib/brief-http.js";

export function onRequest(context) {
  return handleSubmit(context.request, context.env);
}
