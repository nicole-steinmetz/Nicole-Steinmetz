/* Guided project brief. Drafts on this device are not a backup elsewhere.
   Online drafts use /api/brief-draft. The resume token stays in the
   address hash and the Authorization header — never in the request body. */

import {
  COPY,
  DRAFT_TTL_DAYS,
  FORM,
  NAMED_SYSTEMS,
  SCHEMA_VERSION,
  applyCheckToggle,
  approachNotes,
  budgetChoices,
  emptyAnswers,
  fieldByName,
  hasMeaningfulAnswers,
  isActive,
  summarySections,
  validateStep,
  validateSubmission
} from "./brief-schema.js";
import { LOCAL_KEY, clearLocal, loadLocal, saveLocal } from "./brief-local.js";

const card = document.getElementById("brief-card");
const resumeDialog = document.getElementById("brief-resume");
const saveDialog = document.getElementById("brief-save");
const conflictDialog = document.getElementById("brief-conflict");

const state = {
  step: 1,
  answers: emptyAnswers(),
  idempotencyKey: crypto.randomUUID(),
  revision: 0,
  token: "",
  expiresAt: "",
  ttlDays: DRAFT_TTL_DAYS,
  canEmail: false,
  onlineSync: false,
  syncHold: false,
  returnToReview: false,
  errors: {},
  banner: "",
  visualStatus: "We’ll save a copy in this browser as you go.",
  liveStatus: "",
  storageOk: true,
  submitted: false,
  clientEmail: "",
  alreadySubmitted: false,
  timer: 0
};

function el(tag, props, children) {
  const node = document.createElement(tag);
  Object.entries(props || {}).forEach(function (entry) {
    const key = entry[0];
    const value = entry[1];
    if (value == null || value === false) return;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value === true ? "" : String(value));
  });
  (children || []).flat().filter(Boolean).forEach(function (child) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  });
  return node;
}

function storage() {
  return window.localStorage;
}

function hashToken() {
  const token = new URLSearchParams(location.hash.replace(/^#/, "")).get("d") || "";
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : "";
}

function resumeHref() {
  const url = new URL(location.href);
  return url.origin + url.pathname + "#d=" + state.token;
}

function snapshot() {
  return {
    schemaVersion: SCHEMA_VERSION,
    step: state.step,
    answers: state.answers,
    idempotencyKey: state.idempotencyKey,
    revision: state.revision,
    token: state.token,
    expiresAt: state.expiresAt,
    onlineSync: state.onlineSync,
    savedAt: new Date().toISOString()
  };
}

function applyDraft(draft, online) {
  state.answers = Object.assign(emptyAnswers(), draft.answers || {});
  state.step = Math.min(8, Math.max(1, Number(draft.step) || 1));
  if (draft.idempotencyKey) state.idempotencyKey = draft.idempotencyKey;
  state.revision = Number(draft.revision) || 0;
  if (draft.token) state.token = draft.token;
  if (draft.expiresAt) state.expiresAt = draft.expiresAt;
  if (online) state.onlineSync = true;
  else state.onlineSync = Boolean(draft.onlineSync && state.token);
}

function setVisual(message) {
  state.visualStatus = message;
  const node = document.getElementById("brief-save-visual");
  if (node) node.textContent = message;
}

function announce(message) {
  if (!message || message === state.liveStatus) return;
  state.liveStatus = message;
  const node = document.getElementById("brief-save-live");
  if (node) node.textContent = message;
}

function scheduleSave() {
  if (state.submitted) return;
  setVisual("Saving…");
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(flush, 400);
}

async function flush() {
  const saved = saveLocal(storage(), snapshot());
  state.storageOk = saved.ok;
  if (!saved.ok) {
    setVisual("Couldn’t save on this device. You can keep going.");
    announce("Couldn’t save on this device. Save and exit can try online.");
  } else if (!(state.onlineSync && state.token)) {
    setVisual("Saved on this device. Only in this browser — not a backup on another device.");
    announce(state.visualStatus);
  }
  if (state.onlineSync && state.token && !state.syncHold) await pushOnline(false);
}

async function api(path, options) {
  const headers = Object.assign({
    Accept: "application/json",
    "Content-Type": "application/json"
  }, options.headers || {});
  if (state.token) headers.Authorization = "Bearer " + state.token;
  let response;
  try {
    response = await fetch(path, {
      method: options.method,
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      referrerPolicy: "no-referrer"
    });
  } catch (error) {
    return { ok: false, status: 0, data: null };
  }
  let data = null;
  try { data = await response.json(); } catch (error) { data = null; }
  return { ok: response.ok, status: response.status, data: data };
}

function onlineBody() {
  return {
    schemaVersion: SCHEMA_VERSION,
    step: state.step,
    answers: state.answers,
    idempotencyKey: state.idempotencyKey,
    revision: state.revision,
    brief_hp: ""
  };
}

async function pushOnline(interactive) {
  const creating = !state.token;
  const result = await api("/api/brief-draft", {
    method: creating ? "POST" : "PUT",
    body: onlineBody()
  });
  if (result.data && result.data.error === "conflict") {
    state.syncHold = true;
    state.conflict = result.data;
    if (interactive) fillConflict();
    else fillConflict();
    setVisual("Online save didn’t go through. Your answers are still on this device.");
    announce("This brief was saved in another tab or on another device.");
    return { ok: false, conflict: true };
  }
  if (!result.ok || !result.data || !result.data.ok || (creating && !result.data.token)) {
    const message = (result.data && result.data.message) || "Online saving didn’t go through. Your answers are still on this device.";
    setVisual(message);
    announce(message);
    return { ok: false, message: message };
  }
  if (result.data.token) state.token = result.data.token;
  state.revision = result.data.revision || state.revision;
  state.expiresAt = result.data.expiresAt || state.expiresAt;
  state.ttlDays = result.data.ttlDays || state.ttlDays;
  state.canEmail = Boolean(result.data.canEmail);
  if (state.token) history.replaceState(null, "", "#d=" + state.token);
  saveLocal(storage(), snapshot());
  setVisual("Saved online. A copy is also on this device.");
  announce(state.visualStatus);
  return { ok: true };
}

async function pullOnline() {
  const result = await api("/api/brief-draft", { method: "GET" });
  if (!result.ok || !result.data || !result.data.ok) {
    state.banner = (result.data && result.data.message) || "That resume link didn’t open. You can start a new brief, or resume a copy if this browser still has one.";
    return false;
  }
  applyDraft(result.data, true);
  state.canEmail = Boolean(result.data.canEmail);
  state.ttlDays = result.data.ttlDays || state.ttlDays;
  saveLocal(storage(), snapshot());
  setVisual("Saved online. A copy is also on this device.");
  announce("Opened the brief saved online.");
  return true;
}

function optionsFor(field) {
  return field.dynamicOptions === "budget" ? budgetChoices() : (field.options || []);
}

function hintFor(field) {
  if (field.dynamicOptions === "budget") {
    return budgetChoices().length > 1
      ? "Prices are in AUD. If you’re unsure, choose guidance."
      : "Budget ranges aren’t published on this form yet. Choose guidance and we’ll talk it through. If you already have a figure in mind, add it on the last step.";
  }
  return field.hint || "";
}

function mark(field) {
  if (!field.required) return "Optional";
  if (typeof field.requireWhen === "function" && !field.requireWhen(state.answers)) return "Optional";
  return "Required";
}

function fieldError(name) {
  return state.errors[name] || "";
}

function render(focus) {
  if (state.submitted) return renderSuccess();
  const step = FORM[state.step - 1];
  const progress = el("div", {
    class: "brief-progress",
    role: "progressbar",
    "aria-valuemin": "1",
    "aria-valuemax": "8",
    "aria-valuenow": String(state.step),
    "aria-valuetext": "Step " + state.step + " of 8, " + step.title
  }, [el("span", { class: "brief-progress__bar" })]);
  progress.firstChild.style.width = (state.step / 8 * 100) + "%";

  const body = el("div", { class: "brief-card__body" }, [
    state.banner ? el("p", { class: "brief-banner", role: "status", text: state.banner }) : null,
    el("p", { class: "brief-kicker", text: "Step " + state.step + " of 8" }),
    el("h2", { id: "brief-step-title", tabindex: "-1", text: step.title }),
    progress,
    el("p", { id: "brief-save-visual", class: "brief-status", "aria-hidden": "true", text: state.visualStatus }),
    el("p", { id: "brief-save-live", class: "visually-hidden", role: "status", text: state.liveStatus }),
    errorSummary(),
    ...step.fields.filter(function (field) { return isActive(field, state.answers); }).map(renderField)
  ]);
  if (state.step === 8) body.append(renderReview());

  const actions = el("div", { class: "brief-actions" }, [
    el("div", { class: "brief-actions__inner" }, [
      el("button", { type: "button", class: "brief-btn brief-btn--text", "data-action": "save-exit", text: "Save and exit" }),
      el("button", { type: "button", class: "brief-btn brief-btn--ghost", "data-action": "back", text: "Back", disabled: state.step === 1 ? "" : false }),
      state.returnToReview && state.step < 8
        ? el("button", { type: "button", class: "brief-btn brief-btn--ghost", "data-action": "review", text: "Back to review" })
        : null,
      state.step < 8
        ? el("button", { type: "button", class: "brief-btn brief-btn--primary", "data-action": "continue", text: "Continue" })
        : el("button", { type: "button", class: "brief-btn brief-btn--primary", "data-action": "submit", text: "Submit project brief" })
    ])
  ]);
  card.replaceChildren(body, actions);
  if (state.step === 1) {
    const back = card.querySelector("[data-action=back]");
    back.disabled = true;
  }
  if (focus === "heading") {
    const heading = document.getElementById("brief-step-title");
    if (heading) heading.focus();
  } else if (focus === "errors") {
    const box = document.getElementById("brief-errors");
    if (box) box.focus();
  } else if (focus && focus.name) {
    const target = card.querySelector('[data-field="' + focus.name + '"][value="' + CSS.escape(focus.value) + '"]');
    if (target) target.focus();
  } else if (focus && focus.list === "liked") {
    const target = card.querySelector('[data-liked-url="' + focus.index + '"]');
    if (target) target.focus();
  } else if (focus && focus.list) {
    const target = card.querySelector('[data-list="' + focus.list + '"][data-index="' + focus.index + '"]');
    if (target) target.focus();
  }
}

function errorSummary() {
  const entries = Object.entries(state.errors);
  if (!entries.length) return null;
  return el("div", { id: "brief-errors", class: "brief-errors", tabindex: "-1", role: "alert" }, [
    el("p", { text: "A few answers need another look." }),
    el("ul", {}, entries.map(function (entry) {
      return el("li", {}, [el("a", { href: "#brief-field-" + entry[0], "data-action": "jump", "data-jump": entry[0], text: entry[1] })]);
    }))
  ]);
}

function renderField(field) {
  const wrap = el("div", { class: "brief-field", id: "brief-field-" + field.name });
  const error = fieldError(field.name);
  if (field.type === "radio" || field.type === "checks") wrap.append(renderChoices(field, error));
  else if (field.type === "urls") wrap.append(renderUrls(field, error));
  else if (field.type === "liked") wrap.append(renderLiked(field, error));
  else if (field.type === "system-names") wrap.append(renderSystems(field));
  else wrap.append(renderControl(field, error));
  return wrap;
}

function renderChoices(field, error) {
  const options = optionsFor(field);
  const selected = field.type === "checks" ? (state.answers[field.name] || []) : [state.answers[field.name]];
  const hint = hintFor(field);
  const set = el("fieldset", { class: "brief-question" }, [
    el("legend", {}, [
      field.label + " ",
      el("span", { class: "brief-mark", text: mark(field) })
    ])
  ]);
  if (hint) set.append(el("p", { class: "brief-hint", id: "brief-hint-" + field.name, text: hint }));
  set.append(el("p", { class: "brief-limit", id: "brief-limit-" + field.name, role: "status" }));
  set.append(el("div", { class: "brief-choices" }, options.map(function (option) {
    const input = el("input", { type: field.type === "checks" ? "checkbox" : "radio", name: field.name, value: option.value, "data-field": field.name });
    input.checked = selected.includes(option.value);
    const label = el("label", { class: "choice" }, [
      input,
      el("span", { class: "choice__body" }, [
        el("span", { class: "choice__label", text: option.label }),
        option.hint ? el("span", { class: "choice__hint", text: option.hint }) : null
      ])
    ]);
    return label;
  })));
  if (error) set.append(el("p", { class: "brief-error", id: "brief-error-" + field.name, text: error }));
  const described = [hint ? "brief-hint-" + field.name : "", error ? "brief-error-" + field.name : ""].filter(Boolean).join(" ");
  if (described) set.querySelectorAll("input").forEach(function (input) { input.setAttribute("aria-describedby", described); });
  if (error) set.querySelectorAll("input").forEach(function (input) { input.setAttribute("aria-invalid", "true"); });
  return set;
}

function renderControl(field, error) {
  const id = "brief-input-" + field.name;
  const described = [];
  const block = el("div", { class: "brief-question" }, [
    el("label", { for: id }, [
      field.label + " ",
      el("span", { class: "brief-mark", text: mark(field) })
    ])
  ]);
  if (field.hint) {
    described.push("brief-hint-" + field.name);
    block.append(el("p", { class: "brief-hint", id: "brief-hint-" + field.name, text: field.hint }));
  }
  if (field.example) {
    described.push("brief-example-" + field.name);
    block.append(el("p", { class: "brief-example", id: "brief-example-" + field.name, text: "Example: " + field.example }));
  }
  const input = el(field.type === "textarea" ? "textarea" : "input", {
    id: id,
    class: field.type === "textarea" ? "brief-textarea" : "brief-input",
    "data-field": field.name,
    maxlength: field.max ? String(field.max) : false
  });
  if (field.type !== "textarea") input.type = field.type === "text" ? "text" : field.type;
  if (field.autocomplete) input.autocomplete = field.autocomplete;
  if (field.type === "date") input.type = "date";
  input.value = state.answers[field.name] || "";
  if (mark(field) === "Required") input.setAttribute("aria-required", "true");
  if (error) {
    described.push("brief-error-" + field.name);
    input.setAttribute("aria-invalid", "true");
  }
  if (described.length) input.setAttribute("aria-describedby", described.join(" "));
  block.append(input);
  if (error) block.append(el("p", { class: "brief-error", id: "brief-error-" + field.name, text: error }));
  return block;
}

function renderUrls(field, error) {
  const rows = state.answers[field.name].length ? state.answers[field.name] : [""];
  const block = el("fieldset", { class: "brief-question" }, [
    el("legend", {}, [field.label + " ", el("span", { class: "brief-mark", text: "Optional" })])
  ]);
  if (field.hint) block.append(el("p", { class: "brief-hint", text: field.hint }));
  rows.forEach(function (value, index) {
    const row = el("div", { class: "brief-repeat" }, [
      el("label", { class: "visually-hidden", for: field.name + "-" + index, text: field.label + " " + (index + 1) })
    ]);
    const input = el("input", {
      id: field.name + "-" + index,
      class: "brief-input",
      type: "url",
      inputmode: "url",
      "data-list": field.name,
      "data-index": String(index),
      maxlength: "300",
      autocomplete: "url"
    });
    input.value = value;
    row.append(input);
    if (rows.length > 1) {
      row.append(el("button", { type: "button", class: "brief-btn brief-btn--text", "data-action": "remove-url", "data-list": field.name, "data-index": String(index), text: "Remove" }));
    }
    block.append(row);
  });
  if (rows.length < field.maxItems) {
    block.append(el("button", { type: "button", class: "brief-btn brief-btn--text", "data-action": "add-url", "data-list": field.name, text: field.addLabel }));
  }
  if (error) block.append(el("p", { class: "brief-error", text: error }));
  return block;
}

function renderLiked(field, error) {
  const rows = state.answers.likedSites.length ? state.answers.likedSites : [{ url: "", likes: [] }];
  const block = el("fieldset", { class: "brief-question" }, [
    el("legend", { text: field.label }),
    el("p", { class: "brief-hint", text: "Up to three. For each one, tick what you like about it." })
  ]);
  rows.forEach(function (row, index) {
    const group = el("div", { class: "brief-liked" }, [
      el("label", { for: "liked-" + index, text: "Website " + (index + 1) })
    ]);
    const input = el("input", { id: "liked-" + index, class: "brief-input", type: "url", inputmode: "url", "data-liked-url": String(index), maxlength: "300" });
    input.value = row.url || "";
    group.append(input);
    group.append(el("div", { class: "brief-choices brief-choices--compact" }, field.likes.map(function (like) {
      const box = el("input", { type: "checkbox", value: like.value, "data-liked-like": String(index) });
      box.checked = (row.likes || []).includes(like.value);
      return el("label", { class: "choice choice--compact" }, [box, el("span", { class: "choice__label", text: like.label })]);
    })));
    if (rows.length > 1) group.append(el("button", { type: "button", class: "brief-btn brief-btn--text", "data-action": "remove-liked", "data-index": String(index), text: "Remove this website" }));
    block.append(group);
  });
  if (rows.length < field.maxItems) block.append(el("button", { type: "button", class: "brief-btn brief-btn--text", "data-action": "add-liked", text: "Add another website" }));
  if (error) block.append(el("p", { class: "brief-error", text: error }));
  return block;
}

function renderSystems(field) {
  const block = el("fieldset", { class: "brief-question" }, [
    el("legend", { text: field.label }),
    field.hint ? el("p", { class: "brief-hint", text: field.hint }) : null
  ]);
  NAMED_SYSTEMS.filter(function (item) { return (state.answers.systems || []).includes(item.value); }).forEach(function (item) {
    const id = "system-" + item.value;
    const input = el("input", { id: id, class: "brief-input", type: "text", "data-system": item.value, maxlength: "160" });
    input.value = state.answers.systemNames[item.value] || "";
    block.append(el("div", { class: "brief-field" }, [
      el("label", { for: id, text: item.label }),
      input
    ]));
  });
  return block;
}

function renderReview() {
  const sections = summarySections(state.answers);
  const notes = approachNotes(state.answers);
  const review = el("section", { class: "brief-review", "aria-labelledby": "brief-review-title" }, [
    el("h3", { id: "brief-review-title", text: "Review your brief" }),
    el("p", { class: "brief-hint", text: "This is what we’ll use to understand the project. Edit any section and your other answers stay put." })
  ]);
  if (notes.length) {
    review.append(el("div", { class: "brief-notes" }, [
      el("h3", { text: "How we’ll read this" }),
      el("ul", {}, notes.map(function (note) { return el("li", { text: note }); })),
      el("p", { class: "brief-hint", text: "We’ll confirm the approach with you. You don’t need to choose the tools." })
    ]));
  }
  sections.forEach(function (section) {
    const index = FORM.findIndex(function (step) { return step.id === section.id; }) + 1;
    review.append(el("section", { class: "brief-summary" }, [
      el("div", { class: "brief-summary__head" }, [
        el("h3", { text: section.title }),
        el("button", { type: "button", class: "brief-btn brief-btn--text", "data-action": "edit", "data-step": String(index), text: "Edit" })
      ]),
      el("dl", {}, section.rows.flatMap(function (row) {
        return [el("dt", { text: row.label }), el("dd", { text: row.value })];
      }))
    ]));
  });
  review.append(el("p", { class: "brief-privacy", text: "We’ll use your answers to understand the project and recommend a way forward. They’re stored so we can review them. This form doesn’t sign you up to a mailing list." }));
  return review;
}

function renderSuccess() {
  const parts = [
    el("h2", { id: "brief-step-title", tabindex: "-1", text: COPY.successTitle }),
    el("p", { class: "brief-lede", text: COPY.successBody })
  ];
  if (state.alreadySubmitted) parts.push(el("p", { text: COPY.alreadySubmitted }));
  if (state.clientEmail === "sent") parts.push(el("p", { text: "A short confirmation has been emailed to you." }));
  parts.push(el("p", {}, [el("a", { class: "brief-btn brief-btn--primary", href: "/", text: "Back to the homepage" })]));
  card.replaceChildren(el("div", { class: "brief-card__body brief-success" }, parts));
  const heading = document.getElementById("brief-step-title");
  if (heading) heading.focus();
}

function showErrors(errors) {
  state.errors = {};
  errors.forEach(function (error) { state.errors[error.field] = error.message; });
  render("errors");
}

function continueStep(toReview) {
  const errors = validateStep(state.step, state.answers);
  if (errors.length) return showErrors(errors);
  state.errors = {};
  state.banner = "";
  if (toReview) {
    state.step = 8;
    state.returnToReview = false;
  } else {
    state.step = Math.min(8, state.step + 1);
    if (state.step === 8) state.returnToReview = false;
  }
  flush();
  render("heading");
}

function backStep() {
  if (state.step === 1) return;
  state.errors = {};
  state.step -= 1;
  render("heading");
}

async function submitBrief() {
  const validation = validateSubmission(state.answers);
  if (!validation.ok) {
    const first = validation.errors[0].step;
    state.step = first;
    state.returnToReview = first !== 8;
    const mine = validation.errors.filter(function (error) { return error.step === first; });
    return showErrors(mine);
  }
  setVisual("Sending your brief…");
  const button = card.querySelector("[data-action=submit]");
  if (button) button.disabled = true;
  const result = await api("/api/brief", {
    method: "POST",
    body: {
      schemaVersion: SCHEMA_VERSION,
      answers: state.answers,
      idempotencyKey: state.idempotencyKey,
      brief_hp: hpValue()
    }
  });
  if (!result.ok || !result.data || !result.data.stored) {
    if (result.data && result.data.fields) {
      state.step = result.data.fields[0].step;
      return showErrors(result.data.fields.filter(function (error) { return error.step === state.step; }));
    }
    state.banner = (result.data && result.data.message) || "That didn’t go through. Your answers are still here — try again.";
    setVisual(state.banner);
    announce(state.banner);
    render();
    return;
  }
  state.submitted = true;
  state.clientEmail = result.data.clientEmail || "";
  state.alreadySubmitted = Boolean(result.data.alreadySubmitted);
  clearLocal(storage());
  state.token = "";
  history.replaceState(null, "", location.pathname);
  renderSuccess();
}

function hpValue() {
  const box = document.getElementById("brief-hp");
  return box ? box.value : "";
}

async function openSave() {
  saveDialog.replaceChildren(
    el("h2", { id: "brief-save-title", text: "Save and exit" }),
    el("p", { text: "Saving your brief online…" })
  );
  if (!saveDialog.open) saveDialog.showModal();
  await flush();
  const result = await pushOnline(true);
  if (result.conflict) {
    saveDialog.close();
    return;
  }
  if (!result.ok) {
    saveDialog.replaceChildren(
      el("h2", { id: "brief-save-title", text: "Save and exit" }),
      el("p", { text: result.message || "Online saving didn’t go through. Your answers are still on this device — only in this browser." }),
      el("button", { type: "button", class: "brief-btn brief-btn--primary", "data-action": "retry-save", text: "Try again" }),
      el("button", { type: "button", class: "brief-btn brief-btn--ghost", "data-action": "close-save", text: "Keep editing" })
    );
    return;
  }
  const link = resumeHref();
  const date = state.expiresAt
    ? new Date(state.expiresAt).toLocaleDateString("en-AU", { timeZone: "Australia/Perth", dateStyle: "long" })
    : "";
  const linkInput = el("input", { id: "brief-resume-link", class: "brief-input", readonly: "readonly", "aria-label": "Private resume link" });
  linkInput.value = link;
  const sync = el("input", { id: "brief-keep-sync", type: "checkbox" });
  sync.checked = state.onlineSync;
  saveDialog.replaceChildren(
    el("h2", { id: "brief-save-title", text: "Saved online" }),
    el("p", { text: "This private link opens the draft on another device. Anyone with the link can see it, so treat it like a password and don’t post it publicly." }),
    el("p", { text: "Online drafts expire " + state.ttlDays + " days after the last save." + (date ? " This one expires on " + date + "." : "") }),
    linkInput,
    el("p", { id: "brief-copy-status", class: "brief-hint", role: "status" }),
    el("div", { class: "brief-dialog__actions" }, [
      el("button", { type: "button", class: "brief-btn brief-btn--primary", "data-action": "copy-link", text: "Copy link" }),
      state.canEmail ? el("button", { type: "button", class: "brief-btn brief-btn--ghost", "data-action": "email-link", text: "Email me this link" }) : null
    ]),
    state.canEmail ? null : el("p", { class: "brief-hint", text: "Emailing the link isn’t available. Copy it if you want to open the draft somewhere else." }),
    el("label", { class: "brief-checkline" }, [
      sync,
      el("span", { text: "Keep updating this online draft while I continue on this device." })
    ]),
    el("div", { class: "brief-dialog__actions" }, [
      el("a", { class: "brief-btn brief-btn--primary", href: "/", text: "Leave the form" }),
      el("button", { type: "button", class: "brief-btn brief-btn--ghost", "data-action": "close-save", text: "Keep editing" })
    ])
  );
}

function fillConflict() {
  const data = state.conflict;
  if (!data) return;
  conflictDialog.replaceChildren(
    el("h2", { id: "brief-conflict-title", text: "This brief changed somewhere else" }),
    el("p", { text: "It was saved in another tab or on another device. Loading that version replaces what’s on this screen. Saving this version replaces the other one." }),
    el("div", { class: "brief-dialog__actions" }, [
      el("button", { type: "button", class: "brief-btn brief-btn--primary", "data-action": "load-conflict", text: "Load the other version" }),
      el("button", { type: "button", class: "brief-btn brief-btn--ghost", "data-action": "keep-conflict", text: "Save this version instead" })
    ])
  );
  if (!conflictDialog.open) conflictDialog.showModal();
}

function offerLocal(draft, prefix) {
  resumeDialog.replaceChildren(
    el("h2", { id: "brief-resume-title", text: "Resume your brief?" }),
    el("p", { text: (prefix ? prefix + " " : "") + "There’s a project brief saved in this browser." }),
    el("p", { text: "It’s only on this device. It isn’t a copy you can open on another phone or computer, unless you also saved an online link." }),
    el("div", { class: "brief-dialog__actions" }, [
      el("button", { type: "button", class: "brief-btn brief-btn--primary", "data-action": "resume-local", text: "Resume" }),
      el("button", { type: "button", class: "brief-btn brief-btn--ghost", "data-action": "discard-local", text: "Start again" })
    ])
  );
  resumeDialog.dataset.ready = "yes";
  resumeDialog.showModal();
  state.pendingLocal = draft;
}

function renderLoading(message) {
  card.replaceChildren(el("div", { class: "brief-card__body" }, [el("p", { text: message })]));
}

document.addEventListener("input", function (event) {
  const input = event.target;
  if (!input.closest || !input.closest("#brief-card, #brief-save")) return;
  if (input.id === "brief-keep-sync") {
    state.onlineSync = input.checked;
    saveLocal(storage(), snapshot());
    if (state.onlineSync && state.token) pushOnline(false);
    return;
  }
  if (input.type === "checkbox" || input.type === "radio") return;
  if (input.dataset.list) {
    const list = state.answers[input.dataset.list].slice();
    list[Number(input.dataset.index)] = input.value;
    state.answers[input.dataset.list] = list;
  } else if (input.dataset.likedUrl != null) {
    const rows = state.answers.likedSites.length ? state.answers.likedSites.map(cloneLiked) : [{ url: "", likes: [] }];
    rows[Number(input.dataset.likedUrl)].url = input.value;
    state.answers.likedSites = rows;
  } else if (input.dataset.system) {
    state.answers.systemNames = Object.assign({}, state.answers.systemNames, { [input.dataset.system]: input.value });
  } else if (input.dataset.field) {
    state.answers[input.dataset.field] = input.value;
    delete state.errors[input.dataset.field];
    const message = document.getElementById("brief-error-" + input.dataset.field);
    if (message) message.hidden = true;
  }
  scheduleSave();
});

document.addEventListener("change", function (event) {
  const input = event.target;
  if (!input.closest || !input.closest("#brief-card")) return;
  if (input.dataset.likedLike != null) {
    const index = Number(input.dataset.likedLike);
    const rows = (state.answers.likedSites.length ? state.answers.likedSites : [{ url: "", likes: [] }]).map(cloneLiked);
    const likes = new Set(rows[index].likes);
    if (input.checked) likes.add(input.value); else likes.delete(input.value);
    rows[index].likes = [...likes];
    state.answers.likedSites = rows;
    scheduleSave();
    return;
  }
  if (input.type !== "checkbox" && input.type !== "radio") return;
  const field = fieldByName(input.name);
  if (!field) return;
  if (input.type === "radio") {
    state.answers[field.name] = input.value;
    state.errors = {};
    scheduleSave();
    render({ name: field.name, value: input.value });
    return;
  }
  const result = applyCheckToggle(state.answers[field.name], input.value, input.checked, field);
  if (result.blocked) {
    input.checked = false;
    const note = document.getElementById("brief-limit-" + field.name);
    if (note) note.textContent = "That’s " + field.max + " already. Remove one if you want to change the mix.";
    return;
  }
  state.answers[field.name] = result.values;
  state.errors = {};
  scheduleSave();
  render({ name: field.name, value: input.value });
});

document.addEventListener("click", function (event) {
  const button = event.target.closest && event.target.closest("[data-action]");
  if (!button) return;
  const action = button.getAttribute("data-action");
  if (action === "continue") continueStep(false);
  else if (action === "back") backStep();
  else if (action === "review") continueStep(true);
  else if (action === "submit") submitBrief();
  else if (action === "save-exit" || action === "retry-save") openSave();
  else if (action === "close-save") saveDialog.close();
  else if (action === "edit") {
    state.returnToReview = true;
    state.errors = {};
    state.step = Number(button.getAttribute("data-step"));
    render("heading");
  } else if (action === "jump") {
    event.preventDefault();
    const target = document.getElementById("brief-field-" + button.getAttribute("data-jump"));
    const focusable = target && target.querySelector("input, textarea, select");
    if (focusable) focusable.focus();
  } else if (action === "add-url") addUrl(button.getAttribute("data-list"));
  else if (action === "remove-url") removeUrl(button.getAttribute("data-list"), Number(button.getAttribute("data-index")));
  else if (action === "add-liked") addLiked();
  else if (action === "remove-liked") removeLiked(Number(button.getAttribute("data-index")));
  else if (action === "resume-local") {
    applyDraft(state.pendingLocal, false);
    resumeDialog.close();
    render("heading");
    setVisual(state.onlineSync ? "Saved online. A copy is also on this device." : "Saved on this device. Only in this browser — not a backup on another device.");
  } else if (action === "discard-local") {
    clearLocal(storage());
    state.answers = emptyAnswers();
    state.step = 1;
    state.token = "";
    state.revision = 0;
    state.onlineSync = false;
    state.idempotencyKey = crypto.randomUUID();
    resumeDialog.close();
    history.replaceState(null, "", location.pathname);
    render("heading");
  } else if (action === "copy-link") copyLink();
  else if (action === "email-link") emailLink();
  else if (action === "load-conflict") loadConflict();
  else if (action === "keep-conflict") keepConflict();
});

document.addEventListener("keydown", function (event) {
  if (event.key !== "Enter") return;
  const target = event.target;
  if (!target.closest || !target.closest("#brief-card")) return;
  if (target.tagName === "TEXTAREA") return;
  if (target.tagName !== "INPUT") return;
  event.preventDefault();
  if (state.step < 8) continueStep(false);
});

function addUrl(name) {
  const field = fieldByName(name);
  const list = state.answers[name].slice();
  if (!list.length) list.push("");
  if (list.length >= field.maxItems) return;
  list.push("");
  state.answers[name] = list;
  render({ list: name, index: list.length - 1 });
}

function removeUrl(name, index) {
  const list = state.answers[name].slice();
  list.splice(index, 1);
  state.answers[name] = list;
  scheduleSave();
  render();
}

function addLiked() {
  const rows = (state.answers.likedSites.length ? state.answers.likedSites : [{ url: "", likes: [] }]).map(cloneLiked);
  if (rows.length >= 3) return;
  rows.push({ url: "", likes: [] });
  state.answers.likedSites = rows;
  render({ list: "liked", index: rows.length - 1 });
}

function removeLiked(index) {
  const rows = state.answers.likedSites.map(cloneLiked);
  rows.splice(index, 1);
  state.answers.likedSites = rows;
  scheduleSave();
  render();
}

function cloneLiked(row) {
  return { url: row.url || "", likes: (row.likes || []).slice() };
}

async function copyLink() {
  const input = document.getElementById("brief-resume-link");
  const status = document.getElementById("brief-copy-status");
  if (!input) return;
  try {
    await navigator.clipboard.writeText(input.value);
    if (status) status.textContent = "Copied.";
  } catch (error) {
    input.focus();
    input.select();
    if (status) status.textContent = "Select the link and copy it.";
  }
}

async function emailLink() {
  const status = document.getElementById("brief-copy-status");
  if (status) status.textContent = "Sending the link…";
  const result = await api("/api/brief-draft", { method: "POST", body: { action: "email-link", brief_hp: hpValue() } });
  if (status) status.textContent = result.ok && result.data && result.data.emailed
    ? "Sent to the email on this brief."
    : ((result.data && result.data.message) || "The email didn’t send. Copy the link instead.");
}

function loadConflict() {
  const data = state.conflict;
  if (!data) return;
  applyDraft({
    answers: data.answers,
    step: data.step,
    revision: data.revision,
    expiresAt: data.expiresAt,
    idempotencyKey: state.idempotencyKey,
    token: state.token
  }, true);
  state.syncHold = false;
  state.conflict = null;
  conflictDialog.close();
  saveLocal(storage(), snapshot());
  setVisual("Saved online. A copy is also on this device.");
  render("heading");
}

async function keepConflict() {
  if (!state.conflict) return;
  state.revision = Number(state.conflict.revision) || state.revision;
  state.syncHold = false;
  state.conflict = null;
  conflictDialog.close();
  const result = await pushOnline(true);
  if (!result.ok && !result.conflict) render();
  else render();
}

window.addEventListener("storage", function (event) {
  if (event.key !== LOCAL_KEY || !event.newValue || state.submitted) return;
  state.banner = "This brief was updated in another tab. Resume that copy if you want this screen to match it.";
  const node = document.querySelector(".brief-card__body");
  if (node && !document.getElementById("brief-tab-note")) {
    node.prepend(el("p", { id: "brief-tab-note", class: "brief-banner", text: state.banner }));
  }
});

async function init() {
  const token = hashToken();
  const local = loadLocal(storage());
  if (!local.ok) {
    state.storageOk = false;
    state.visualStatus = "This browser couldn’t store a copy on this device. You can keep going, and Save and exit can try online.";
  }
  if (token) {
    state.token = token;
    renderLoading("Opening your saved brief…");
    const opened = await pullOnline();
    if (opened) {
      render("heading");
      return;
    }
    if (local.draft && hasMeaningfulAnswers(local.draft.answers)) {
      offerLocal(local.draft, state.banner);
      render();
      return;
    }
    render();
    return;
  }
  if (local.ignored === "version") {
    state.banner = "A saved brief on this device is from a different version of the form, so it wasn’t reopened.";
  }
  if (local.draft && hasMeaningfulAnswers(local.draft.answers)) {
    offerLocal(local.draft);
    render();
    return;
  }
  render();
}

init();
