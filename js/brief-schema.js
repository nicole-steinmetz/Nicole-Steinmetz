/* Project brief — questions, validation and the stored shape.
   Imported by the page and by the Pages Functions. No DOM.
   Schema version 1. Drafts store the full answers, including
   conditional answers the client might come back to. Submissions
   store relevantAnswers(), which drops anything that no longer applies.

   Budget ranges are configuration. Leave BUDGET_RANGES empty until
   the figures are approved. Do not add placeholder prices. */

export const SCHEMA_VERSION = 1;
export const DRAFT_TTL_DAYS = 30;
export const CURRENCY = "AUD";

/* Approved investment ranges, in AUD.
   Each item: { value: "stable-id", label: "Words the client sees" }.
   The guidance option is added in code and is not a price. */
export const BUDGET_RANGES = [];

export const COPY = {
  title: "Let’s plan your website.",
  lede: "Tell us about your business, your goals and what you have in mind. You don’t need to have it all figured out — we’ll help with the recommendations.",
  successTitle: "Thanks — your project brief is in.",
  successBody: "We’ll review your answers and be in touch about the next steps.",
  alreadySubmitted: "This brief was already submitted, so we kept the original."
};

export const GUIDANCE_BUDGET = {
  value: "guidance",
  label: "I haven’t set a budget and need guidance."
};

const LIMIT = {
  name: 80,
  email: 120,
  business: 120,
  role: 80,
  phone: 40,
  url: 300,
  short: 160,
  text: 2000,
  other: 200,
  event: 300,
  urls: 6,
  similar: 5,
  liked: 3
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function budgetChoices() {
  return BUDGET_RANGES.concat([GUIDANCE_BUDGET]);
}

export function draftTtlDays(env) {
  const raw = Number(env && env.BRIEF_DRAFT_TTL_DAYS);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 365) return Math.floor(raw);
  return DRAFT_TTL_DAYS;
}

export function isSellingOnline(answers) {
  const a = answers || {};
  if (a.helpWith === "sell-online") return true;
  if (includes(a.goals, "sell")) return true;
  if (includes(a.visitorActions, "buy")) return true;
  if ((a.pagesKnown === "yes" || a.pagesKnown === "rough") && includes(a.pages, "shop")) return true;
  return false;
}

export function showExistingFollowups(answers) {
  const a = answers || {};
  if (a.helpWith === "refresh" || a.helpWith === "redesign" || a.helpWith === "new-features") return true;
  return Boolean(String(a.website || "").trim());
}

export function showPages(answers) {
  const known = answers && answers.pagesKnown;
  return known === "yes" || known === "rough";
}

function includes(list, value) {
  return Array.isArray(list) && list.includes(value);
}

const BUSINESS_KINDS = [
  { value: "hospitality", label: "Hospitality", hint: "Café, restaurant, bar or accommodation." },
  { value: "professional", label: "Professional services" },
  { value: "health", label: "Health, wellness or fitness" },
  { value: "retail", label: "Retail or online store" },
  { value: "creative", label: "Creative business or personal brand" },
  { value: "trades", label: "Trades or local services" },
  { value: "community", label: "Community or not-for-profit" },
  { value: "other", label: "Something else" }
];

const HELP = [
  { value: "first-site", label: "My business needs its first website." },
  { value: "refresh", label: "I have a website, but it needs a refresh." },
  { value: "redesign", label: "I need a complete website redesign." },
  { value: "sell-online", label: "I want to start selling online." },
  { value: "new-features", label: "I need new features or pages." },
  { value: "not-sure", label: "I’m not sure — I’d like your advice." }
];

const PROMPTS = [
  { value: "launching", label: "I’m launching a new business." },
  { value: "grown", label: "My business has grown or changed." },
  { value: "outdated", label: "My current website looks outdated." },
  { value: "hard-to-update", label: "It’s difficult to update." },
  { value: "unclear", label: "It doesn’t explain what we do clearly." },
  { value: "low-results", label: "We aren’t getting enough enquiries or sales." },
  { value: "mobile", label: "It doesn’t work well on mobile." },
  { value: "rebrand", label: "I’m rebranding." },
  { value: "other", label: "Something else." }
];

const GOALS = [
  { value: "enquiries", label: "Get more enquiries." },
  { value: "bookings", label: "Generate bookings or reservations." },
  { value: "sell", label: "Sell products online." },
  { value: "explain", label: "Explain our services clearly." },
  { value: "established", label: "Make the business look more established." },
  { value: "work-examples", label: "Show examples of our work." },
  { value: "find-us", label: "Help people find or visit us." },
  { value: "less-admin", label: "Reduce repetitive questions and admin." },
  { value: "need-help", label: "I need help working this out." }
];

const ACTIONS = [
  { value: "call-email", label: "Call or email us." },
  { value: "enquiry-form", label: "Complete an enquiry form." },
  { value: "book", label: "Book an appointment." },
  { value: "reserve", label: "Reserve a table or accommodation." },
  { value: "buy", label: "Buy products." },
  { value: "services-pricing", label: "View services and pricing." },
  { value: "browse-work", label: "Browse our work." },
  { value: "hours-directions", label: "Find opening hours and directions." },
  { value: "subscribe", label: "Subscribe to updates." },
  { value: "download", label: "Download information." },
  { value: "not-sure", label: "I’m not sure yet." },
  { value: "other", label: "Something else." }
];

const AUDIENCES = [
  { value: "local", label: "Local individuals or households." },
  { value: "businesses", label: "Other businesses." },
  { value: "visitors", label: "Visitors and tourists." },
  { value: "online", label: "An online audience." },
  { value: "figuring-out", label: "I’m still figuring this out." }
];

const PRIORITIES = [
  { value: "quality", label: "Quality." },
  { value: "value", label: "Price or value." },
  { value: "convenience", label: "Convenience." },
  { value: "expertise", label: "Experience and expertise." },
  { value: "personal", label: "Personal service." },
  { value: "location", label: "Location." },
  { value: "style", label: "Style or atmosphere." },
  { value: "speed", label: "Speed." },
  { value: "trust", label: "Trust and reputation." },
  { value: "specialist", label: "Specialist products or services." },
  { value: "not-sure", label: "I’m not sure." }
];

const FEELINGS = [
  { value: "minimal", label: "Clean and minimal." },
  { value: "warm", label: "Warm and welcoming." },
  { value: "premium", label: "Refined and premium." },
  { value: "bold", label: "Bold and expressive." },
  { value: "playful", label: "Playful and colourful." },
  { value: "natural", label: "Natural and earthy." },
  { value: "professional", label: "Professional and established." },
  { value: "creative", label: "Creative and unconventional." },
  { value: "recommend", label: "I’d like you to recommend a direction." }
];

const BRANDING = [
  { value: "consistent", label: "Keep it consistent with what we have." },
  { value: "refresh", label: "Keep the basics, but give it a refresh." },
  { value: "new-direction", label: "I’m open to a completely new direction." },
  { value: "none-yet", label: "We don’t have branding yet." },
  { value: "advice", label: "I need advice." }
];

const LIKES = [
  { value: "colours", label: "Colours." },
  { value: "fonts", label: "Fonts." },
  { value: "layout", label: "Layout." },
  { value: "photography", label: "Photography." },
  { value: "ease", label: "How easy it is to use." },
  { value: "feel", label: "Overall feel." },
  { value: "feature", label: "A particular feature." },
  { value: "cant-pinpoint", label: "I can’t pinpoint it — I just like it." }
];

const CONTENT = [
  { value: "logo", label: "Logo." },
  { value: "brand", label: "Brand colours and fonts." },
  { value: "writing", label: "Written website content." },
  { value: "photos", label: "Professional photos." },
  { value: "videos", label: "Videos." },
  { value: "testimonials", label: "Testimonials or reviews." },
  { value: "products", label: "Product information and images." },
  { value: "existing-site", label: "Content on our existing website." },
  { value: "nothing-ready", label: "Nothing ready yet." },
  { value: "need-check", label: "I need help checking what’s usable." }
];

const WORDING = [
  { value: "final", label: "I’ll supply the final wording." },
  { value: "polish", label: "I have a draft that needs polishing." },
  { value: "existing", label: "Use our existing content as a starting point." },
  { value: "help-writing", label: "I need help writing it." },
  { value: "not-sure", label: "I’m not sure yet." }
];

const PAGES_KNOWN = [
  { value: "yes", label: "Yes — I’d like to select them." },
  { value: "rough", label: "I have a rough idea." },
  { value: "recommend", label: "I’d like you to recommend the structure." }
];

const PAGES = [
  { value: "home", label: "Home." },
  { value: "about", label: "About." },
  { value: "services", label: "Services." },
  { value: "service-pages", label: "Individual service pages." },
  { value: "shop", label: "Shop." },
  { value: "portfolio", label: "Portfolio or projects." },
  { value: "testimonials", label: "Testimonials." },
  { value: "faqs", label: "FAQs." },
  { value: "blog", label: "Blog or resources." },
  { value: "contact", label: "Contact." },
  { value: "other", label: "Other." }
];

const SYSTEMS = [
  { value: "booking", label: "A booking or reservation system." },
  { value: "shop", label: "An online shop or payment system." },
  { value: "email-marketing", label: "Email marketing." },
  { value: "crm", label: "A customer management system." },
  { value: "none", label: "None of these." },
  { value: "not-sure", label: "I’m not sure." }
];

export const NAMED_SYSTEMS = [
  { value: "booking", label: "What’s the booking or reservation system called?" },
  { value: "shop", label: "What’s the online shop or payment system called?" },
  { value: "email-marketing", label: "What’s the email marketing tool called?" },
  { value: "crm", label: "What’s the customer management system called?" }
];

const PRODUCT_COUNTS = [
  { value: "1-10", label: "1–10." },
  { value: "11-50", label: "11–50." },
  { value: "51-200", label: "51–200." },
  { value: "200-plus", label: "More than 200." },
  { value: "not-sure", label: "Not sure yet." }
];

const PRODUCT_TYPES = [
  { value: "physical", label: "Physical products." },
  { value: "digital", label: "Digital products." },
  { value: "services", label: "Services." },
  { value: "mix", label: "A mix." },
  { value: "not-sure", label: "Not sure yet." }
];

const BUDGET_COVERS = [
  { value: "branding", label: "Branding." },
  { value: "copywriting", label: "Copywriting." },
  { value: "photo-video", label: "Photography or video." },
  { value: "website-only", label: "I’m budgeting for website design only." },
  { value: "not-sure", label: "I’m not sure yet." }
];

const LAUNCH = [
  { value: "asap", label: "As soon as realistically possible." },
  { value: "1-3-months", label: "Within 1–3 months." },
  { value: "3-6-months", label: "Within 3–6 months." },
  { value: "6-plus", label: "More than 6 months away." },
  { value: "flexible", label: "I’m flexible." },
  { value: "specific-date", label: "I have a specific date." }
];

const FLEX = [
  { value: "fixed", label: "The date is fixed." },
  { value: "flexible", label: "The date can move if it needs to." }
];

const INVOLVEMENT = [
  { value: "myself", label: "I’d like to manage it myself." },
  { value: "team", label: "Someone on my team will manage it." },
  { value: "you", label: "I’d like you to handle updates." },
  { value: "mix", label: "A mix — we’ll do small edits and ask for help when needed." },
  { value: "not-sure", label: "I’m not sure yet." }
];

const CONTACTS = [
  { value: "yes", label: "Yes." },
  { value: "no", label: "No — someone else will be." },
  { value: "together", label: "We’ll be working on it together." }
];

const LIKED_CHOICE = [
  { value: "yes", label: "Yes — I’ll add the links." },
  { value: "guide", label: "Not yet — I’d prefer you to guide the direction." }
];

export const FORM = [
  {
    id: "business",
    title: "Your business",
    fields: [
      { type: "text", name: "name", label: "Your name", required: true, max: LIMIT.name, autocomplete: "name", message: "Add your name." },
      { type: "email", name: "email", label: "Email address", required: true, max: LIMIT.email, autocomplete: "email", message: "Add a valid email address." },
      { type: "text", name: "businessName", label: "Business name", required: true, max: LIMIT.business, autocomplete: "organization", message: "Add the business name." },
      { type: "text", name: "role", label: "Your role", max: LIMIT.role, autocomplete: "organization-title" },
      { type: "tel", name: "phone", label: "Phone number", max: LIMIT.phone, autocomplete: "tel", message: "Check the phone number." },
      { type: "url", name: "website", label: "Current website", max: LIMIT.url, autocomplete: "url", hint: "If you have one. A full link is best, like https://example.com.au." },
      { type: "urls", name: "socials", label: "Social links", maxItems: LIMIT.urls, hint: "Optional. Add a link for each profile you want us to see.", addLabel: "Add another social link" },
      { type: "text", name: "location", label: "Where is your business based?", max: LIMIT.short, hint: "A city or town is plenty." },
      { type: "radio", name: "businessKind", label: "What kind of business do you run?", required: true, options: BUSINESS_KINDS, message: "Choose the kind of business, or Something else." },
      { type: "text", name: "businessKindOther", label: "What kind of business is it?", required: true, max: LIMIT.other, when: (a) => a.businessKind === "other", message: "Tell us a little about the kind of business." },
      { type: "textarea", name: "offer", label: "Briefly, what does your business offer?", max: LIMIT.text, hint: "One or two sentences is plenty.", example: "We’re a neighbourhood café in Perth serving breakfast and lunch, with catering for local businesses." },
      { type: "radio", name: "mainContact", label: "Will you be the main contact for this project?", required: true, options: CONTACTS, message: "Let us know who we’ll be talking to." },
      { type: "text", name: "otherContactName", label: "Their name", required: true, max: LIMIT.name, when: (a) => a.mainContact === "no" || a.mainContact === "together", message: "Add the other contact’s name." },
      { type: "email", name: "otherContactEmail", label: "Their email", required: true, requireWhen: (a) => a.mainContact === "no", max: LIMIT.email, when: (a) => a.mainContact === "no" || a.mainContact === "together", hint: "Needed when someone else is the main contact. Optional if you’re working on it together.", message: "Add the other contact’s email." },
      { type: "text", name: "otherContactRole", label: "Their role", max: LIMIT.role, when: (a) => a.mainContact === "no" || a.mainContact === "together" }
    ]
  },
  {
    id: "project",
    title: "Your project",
    fields: [
      { type: "radio", name: "helpWith", label: "What would you like help with?", required: true, options: HELP, message: "Choose the kind of help you’re after, or I’m not sure." },
      { type: "checks", name: "prompts", label: "What prompted you to get started?", options: PROMPTS, hint: "Choose any that apply." },
      { type: "text", name: "promptOther", label: "What’s the other reason?", required: true, max: LIMIT.other, when: (a) => includes(a.prompts, "other"), message: "Add a short note for Something else." },
      { type: "textarea", name: "promptNote", label: "Anything you’d like to add?", max: LIMIT.text },
      { type: "textarea", name: "keep", label: "What would you like to keep?", max: LIMIT.text, hint: "Optional. Colours, pages, a shop, a booking link — whatever is already working.", when: showExistingFollowups },
      { type: "textarea", name: "change", label: "What would you most like to change?", max: LIMIT.text, when: showExistingFollowups }
    ]
  },
  {
    id: "goals",
    title: "Website goals",
    fields: [
      { type: "checks", name: "goals", label: "What would you most like your website to help with?", required: true, min: 1, max: 3, exclusive: ["need-help"], options: GOALS, hint: "Choose up to three. If you’re unsure, choose the last option.", message: "Choose up to three goals, or I need help working this out." },
      { type: "checks", name: "visitorActions", label: "What should visitors be able to do?", exclusive: ["not-sure"], options: ACTIONS, hint: "Choose any that apply. You don’t need to know how it will be built." },
      { type: "text", name: "visitorActionOther", label: "What else should visitors be able to do?", required: true, max: LIMIT.other, when: (a) => includes(a.visitorActions, "other"), message: "Add a short note for Something else." }
    ]
  },
  {
    id: "customers",
    title: "Your customers",
    fields: [
      { type: "checks", name: "audiences", label: "Who do you mainly work with or sell to?", exclusive: ["figuring-out"], options: AUDIENCES, hint: "Choose any that apply." },
      { type: "checks", name: "priorities", label: "What matters most to your customers when choosing you?", max: 3, exclusive: ["not-sure"], options: PRIORITIES, hint: "Choose up to three. Your best guess is fine." },
      { type: "textarea", name: "customerNote", label: "Is there anything useful we should know about your customers?", max: LIMIT.text },
      { type: "urls", name: "similarBusinesses", label: "Are there any similar businesses you’d like us to look at?", maxItems: LIMIT.similar, hint: "Optional. A link to each one.", addLabel: "Add another business" }
    ]
  },
  {
    id: "design",
    title: "Design direction",
    fields: [
      { type: "checks", name: "feelings", label: "How should your website feel?", max: 3, exclusive: ["recommend"], options: FEELINGS, hint: "Choose up to three, or ask us to recommend a direction." },
      { type: "radio", name: "branding", label: "How closely should we follow your current branding?", options: BRANDING },
      { type: "radio", name: "likedSitesChoice", label: "Do you have any websites you like?", options: LIKED_CHOICE },
      { type: "liked", name: "likedSites", label: "Add up to three websites, and what you like about each.", maxItems: LIMIT.liked, likes: LIKES, when: (a) => a.likedSitesChoice === "yes" },
      { type: "textarea", name: "avoid", label: "Anything you definitely want to avoid?", max: LIMIT.text }
    ]
  },
  {
    id: "content",
    title: "Content and features",
    fields: [
      { type: "checks", name: "contentHave", label: "What content do you already have?", exclusive: ["nothing-ready"], options: CONTENT, hint: "Choose any that apply. Nothing ready yet stands on its own." },
      { type: "radio", name: "wording", label: "How would you like to handle the website wording?", options: WORDING },
      { type: "radio", name: "pagesKnown", label: "Do you know which pages you need?", options: PAGES_KNOWN },
      { type: "checks", name: "pages", label: "Which pages should we plan for?", options: PAGES, hint: "A rough list is fine. We’ll recommend anything that’s missing.", when: showPages },
      { type: "text", name: "pagesOther", label: "What other page do you have in mind?", required: true, max: LIMIT.other, when: (a) => showPages(a) && includes(a.pages, "other"), message: "Name the other page, or untick Other." },
      { type: "checks", name: "systems", label: "Does your business already use any of these?", exclusive: ["none", "not-sure"], options: SYSTEMS },
      { type: "system-names", name: "systemNames", label: "What’s it called?", hint: "If you don’t know, you can leave this blank.", when: (a) => NAMED_SYSTEMS.some((item) => includes(a.systems, item.value)) },
      { type: "radio", name: "productCount", label: "How many products do you expect to sell?", options: PRODUCT_COUNTS, when: isSellingOnline },
      { type: "radio", name: "productType", label: "What will you sell?", options: PRODUCT_TYPES, when: isSellingOnline },
      { type: "url", name: "assetFolder", label: "Have a folder of content or brand assets? Add the link here.", max: LIMIT.url, hint: "Please don’t share passwords or sensitive account details." }
    ]
  },
  {
    id: "budget",
    title: "Budget and timing",
    fields: [
      { type: "radio", name: "budget", label: "What investment range are you considering?", required: true, options: budgetChoices(), dynamicOptions: "budget", message: "Choose a range, or let us know you’d like guidance." },
      { type: "checks", name: "budgetCovers", label: "Does that budget also need to cover any of these?", exclusive: ["website-only", "not-sure"], options: BUDGET_COVERS, hint: "Choose any that apply." },
      { type: "radio", name: "launch", label: "When would you ideally like to launch?", required: true, options: LAUNCH, message: "Choose a timing, or add a specific date." },
      { type: "date", name: "launchDate", label: "What’s the date?", required: true, when: (a) => a.launch === "specific-date", message: "Choose the launch date." },
      { type: "text", name: "launchEvent", label: "What’s happening on that date?", required: true, max: LIMIT.event, when: (a) => a.launch === "specific-date", message: "Tell us what’s happening on that date." },
      { type: "radio", name: "launchDateFlexibility", label: "Is that date fixed?", required: true, options: FLEX, when: (a) => a.launch === "specific-date", message: "Let us know if the date can move." }
    ]
  },
  {
    id: "support",
    title: "Ongoing support and review",
    fields: [
      { type: "radio", name: "involvement", label: "How involved would you like to be in updating your website?", options: INVOLVEMENT },
      { type: "textarea", name: "anythingElse", label: "Anything else you’d like us to know?", max: LIMIT.text }
    ]
  }
];

export function emptyAnswers() {
  return {
    name: "",
    email: "",
    businessName: "",
    role: "",
    phone: "",
    website: "",
    socials: [],
    location: "",
    businessKind: "",
    businessKindOther: "",
    offer: "",
    mainContact: "",
    otherContactName: "",
    otherContactEmail: "",
    otherContactRole: "",
    helpWith: "",
    prompts: [],
    promptOther: "",
    promptNote: "",
    keep: "",
    change: "",
    goals: [],
    visitorActions: [],
    visitorActionOther: "",
    audiences: [],
    priorities: [],
    customerNote: "",
    similarBusinesses: [],
    feelings: [],
    branding: "",
    likedSitesChoice: "",
    likedSites: [],
    avoid: "",
    contentHave: [],
    wording: "",
    pagesKnown: "",
    pages: [],
    pagesOther: "",
    systems: [],
    systemNames: { booking: "", shop: "", "email-marketing": "", crm: "" },
    productCount: "",
    productType: "",
    assetFolder: "",
    budget: "",
    budgetCovers: [],
    launch: "",
    launchDate: "",
    launchEvent: "",
    launchDateFlexibility: "",
    involvement: "",
    anythingElse: ""
  };
}

function fieldList() {
  return FORM.flatMap((step, index) => step.fields.map((field) => ({ ...field, step: index + 1, stepId: step.id, stepTitle: step.title })));
}

export function fieldByName(name) {
  return fieldList().find((field) => field.name === name) || null;
}

export function isActive(field, answers) {
  if (!field) return false;
  if (typeof field.when === "function" && !field.when(answers)) return false;
  return true;
}

function line(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function block(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, max);
}

export function cleanUrl(value) {
  const raw = line(value, LIMIT.url);
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname || !url.hostname.includes(".")) return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch (error) {
    return null;
  }
}

function cleanPhone(value) {
  const raw = line(value, LIMIT.phone);
  if (!raw) return "";
  if (!/^[0-9+().\-\s]{6,40}$/.test(raw)) return null;
  return raw;
}

function allowedValues(options) {
  return new Set((options || []).map((option) => option.value));
}

function cleanChoice(value, options) {
  const raw = line(value, 80);
  return allowedValues(options).has(raw) ? raw : "";
}

function cleanChecks(value, field) {
  const allowed = allowedValues(field.options);
  const source = Array.isArray(value) ? value : [];
  const next = [];
  source.forEach((item) => {
    const raw = line(item, 80);
    if (allowed.has(raw) && !next.includes(raw)) next.push(raw);
  });
  const exclusive = field.exclusive || [];
  const lastExclusive = [...next].reverse().find((item) => exclusive.includes(item));
  const chosen = lastExclusive ? [lastExclusive] : next;
  return chosen.slice(0, Math.max(field.max || 12, 1) + 4);
}

export function applyCheckToggle(current, value, checked, field) {
  const options = field.options || [];
  const exclusive = field.exclusive || [];
  const max = field.max || Infinity;
  let next = Array.isArray(current) ? current.filter((item) => options.some((option) => option.value === item)) : [];
  if (!checked) return { values: next.filter((item) => item !== value), blocked: false };
  if (!options.some((option) => option.value === value)) return { values: next, blocked: false };
  if (exclusive.includes(value)) return { values: [value], blocked: false };
  next = next.filter((item) => !exclusive.includes(item));
  if (next.includes(value)) return { values: next, blocked: false };
  if (next.length >= max) return { values: next, blocked: true };
  next.push(value);
  return { values: next, blocked: false };
}

function cleanUrlList(value, maxItems) {
  const source = Array.isArray(value) ? value : [];
  return source.slice(0, maxItems).map((item) => line(item, LIMIT.url));
}

function cleanLiked(value) {
  const source = Array.isArray(value) ? value : [];
  const allowed = allowedValues(LIKES);
  return source.slice(0, LIMIT.liked).map((item) => {
    const likes = Array.isArray(item && item.likes) ? item.likes : [];
    return {
      url: line(item && item.url, LIMIT.url),
      likes: likes.map((like) => line(like, 40)).filter((like) => allowed.has(like)).slice(0, LIKES.length)
    };
  });
}

function cleanSystemNames(value) {
  const source = value && typeof value === "object" ? value : {};
  const next = { booking: "", shop: "", "email-marketing": "", crm: "" };
  Object.keys(next).forEach((key) => {
    next[key] = line(source[key], LIMIT.short);
  });
  return next;
}

export function sanitizeAnswers(input) {
  const source = input && typeof input === "object" ? input : {};
  const answers = emptyAnswers();
  fieldList().forEach((field) => {
    const key = field.name;
    if (field.type === "checks") answers[key] = cleanChecks(source[key], field);
    else if (field.type === "radio") {
      const options = field.dynamicOptions === "budget" ? budgetChoices() : field.options;
      answers[key] = cleanChoice(source[key], options);
    } else if (field.type === "urls") answers[key] = cleanUrlList(source[key], field.maxItems);
    else if (field.type === "liked") answers[key] = cleanLiked(source[key]);
    else if (field.type === "system-names") answers[key] = cleanSystemNames(source[key]);
    else if (field.type === "textarea") answers[key] = block(source[key], field.max || LIMIT.text);
    else if (field.type === "email") answers[key] = line(source[key], field.max || LIMIT.email).toLowerCase();
    else if (field.type === "date") answers[key] = line(source[key], 10);
    else answers[key] = line(source[key], field.max || LIMIT.short);
  });
  return answers;
}

function filledUrlList(list) {
  return (list || []).map((item) => String(item || "").trim()).filter(Boolean);
}

export function relevantAnswers(input) {
  const answers = sanitizeAnswers(input);
  const next = sanitizeAnswers(answers);
  fieldList().forEach((field) => {
    const key = field.name;
    if (!isActive(field, answers)) {
      if (field.type === "checks" || field.type === "urls" || field.type === "liked") next[key] = [];
      else if (field.type === "system-names") next[key] = cleanSystemNames({});
      else next[key] = "";
      return;
    }
    if (field.type === "urls") next[key] = filledUrlList(next[key]);
    if (field.type === "liked") {
      next[key] = next[key].filter((item) => item.url).map((item) => ({ url: item.url, likes: item.likes }));
    }
  });
  if (!includes(next.systems, "booking")) next.systemNames.booking = "";
  if (!includes(next.systems, "shop")) next.systemNames.shop = "";
  if (!includes(next.systems, "email-marketing")) next.systemNames["email-marketing"] = "";
  if (!includes(next.systems, "crm")) next.systemNames.crm = "";
  return next;
}

function todayInPerth(now) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Perth" }).format(now || new Date());
}

function validDate(value, now) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) return false;
  const today = todayInPerth(now);
  if (value < today) return false;
  const max = new Date(now || new Date());
  max.setUTCFullYear(max.getUTCFullYear() + 5);
  const maxDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Perth" }).format(max);
  return value <= maxDay;
}

function pushError(errors, field, message) {
  if (!errors.some((error) => error.field === field.name && error.step === field.step)) {
    errors.push({ step: field.step, field: field.name, message: message });
  }
}

export function validateStep(step, input, now) {
  const answers = sanitizeAnswers(input);
  const errors = [];
  fieldList().filter((field) => field.step === step && isActive(field, answers)).forEach((field) => {
    const key = field.name;
    const value = answers[key];
    const must = field.required && (typeof field.requireWhen !== "function" || field.requireWhen(answers));
    if (field.type === "radio") {
      if (must && !value) pushError(errors, field, field.message || "Choose one option.");
      return;
    }
    if (field.type === "checks") {
      const list = value || [];
      if (field.max && list.length > field.max) pushError(errors, field, `Choose up to ${field.max}.`);
      else if (must && list.length < (field.min || 1)) pushError(errors, field, field.message || "Choose at least one.");
      return;
    }
    if (field.type === "email") {
      if (must && !value) pushError(errors, field, field.message || "Add an email address.");
      else if (value && !EMAIL_RE.test(value)) pushError(errors, field, field.message || "Add a valid email address.");
      return;
    }
    if (field.type === "tel") {
      if (value && cleanPhone(value) === null) pushError(errors, field, field.message || "Check the phone number.");
      return;
    }
    if (field.type === "url") {
      if (value && cleanUrl(value) === null) pushError(errors, field, "Check that link. Use a full web address, like https://example.com.au.");
      return;
    }
    if (field.type === "urls") {
      const bad = (value || []).some((item) => item.trim() && cleanUrl(item) === null);
      if (bad) pushError(errors, field, "Check the links. Each one should be a full web address.");
      return;
    }
    if (field.type === "liked") {
      const bad = (value || []).some((item) => item.url.trim() && cleanUrl(item.url) === null);
      if (bad) pushError(errors, field, "Check those website links.");
      return;
    }
    if (field.type === "date") {
      if (must && !value) pushError(errors, field, field.message || "Choose a date.");
      else if (value && !validDate(value, now)) pushError(errors, field, "Choose a future date within the next five years.");
      return;
    }
    if (field.type === "system-names") return;
    if (must && !String(value || "").trim()) pushError(errors, field, field.message || "Add an answer to continue.");
  });
  return errors;
}

export function validateSubmission(input, now) {
  const errors = FORM.flatMap((step, index) => validateStep(index + 1, input, now));
  return { ok: errors.length === 0, errors: errors };
}

function optionLabel(options, value) {
  const found = (options || []).find((option) => option.value === value);
  return found ? found.label.replace(/\.$/, "") : "";
}

function formatField(field, answers) {
  if (!isActive(field, answers)) return "";
  const key = field.name;
  if (field.type === "radio") {
    const options = field.dynamicOptions === "budget" ? budgetChoices() : field.options;
    return optionLabel(options, answers[key]);
  }
  if (field.type === "checks") {
    return (field.options || [])
      .filter((option) => includes(answers[key], option.value))
      .map((option) => option.label.replace(/\.$/, ""))
      .join("\n");
  }
  if (field.type === "urls") return filledUrlList(answers[key]).join("\n");
  if (field.type === "liked") {
    return (answers.likedSites || []).filter((item) => item.url).map((item) => {
      const likes = (item.likes || []).map((like) => optionLabel(LIKES, like)).filter(Boolean);
      return likes.length ? `${item.url} — ${likes.join(", ")}` : item.url;
    }).join("\n");
  }
  if (field.type === "system-names") {
    const names = {
      booking: "Booking or reservation system",
      shop: "Online shop or payment system",
      "email-marketing": "Email marketing",
      crm: "Customer management system"
    };
    return NAMED_SYSTEMS
      .filter((item) => includes(answers.systems, item.value) && answers.systemNames[item.value])
      .map((item) => `${names[item.value]}: ${answers.systemNames[item.value]}`)
      .join("\n");
  }
  if (field.type === "url" && answers[key]) return cleanUrl(answers[key]) || "";
  return String(answers[key] || "").trim();
}

export function summarySections(input) {
  const answers = relevantAnswers(input);
  return FORM.map((step) => {
    const rows = [];
    step.fields.forEach((field) => {
      const value = formatField(field, answers);
      if (!value) return;
      rows.push({ label: field.label, value: value });
    });
    return { id: step.id, title: step.title, rows: rows };
  }).filter((section) => section.rows.length);
}

export function summaryText(input) {
  return summarySections(input).map((section) => {
    const rows = section.rows.map((row) => `${row.label}\n${row.value}`).join("\n\n");
    return `${section.title}\n${rows}`;
  }).join("\n\n");
}

export function approachNotes(input) {
  const answers = relevantAnswers(input);
  const notes = [];
  if (answers.helpWith === "first-site") notes.push("A first website that explains the business clearly.");
  if (answers.helpWith === "refresh") notes.push("A refresh that keeps what’s already working.");
  if (answers.helpWith === "redesign") notes.push("A complete redesign.");
  if (answers.helpWith === "new-features") notes.push("New pages or features on the site you already have.");
  if (isSellingOnline(answers)) notes.push("A way for people to buy from you.");
  const goals = new Set(answers.goals || []);
  const actions = new Set(answers.visitorActions || []);
  if (goals.has("bookings") || actions.has("book") || actions.has("reserve")) notes.push("A way to book, reserve or make an appointment.");
  if (goals.has("enquiries") || actions.has("enquiry-form") || actions.has("call-email")) notes.push("A clear way for people to get in touch.");
  if (goals.has("find-us") || actions.has("hours-directions")) notes.push("Hours, location and how to visit.");
  if (goals.has("less-admin")) notes.push("Answers on the site for questions you hear all the time.");
  if ((answers.feelings || []).includes("recommend") || answers.branding === "advice" || answers.helpWith === "not-sure" || answers.pagesKnown === "recommend") {
    notes.push("Recommendations from us, where you’d rather not decide up front.");
  }
  return notes.filter((note, index) => notes.indexOf(note) === index).slice(0, 5);
}

export function hasMeaningfulAnswers(input) {
  const answers = sanitizeAnswers(input);
  const blank = emptyAnswers();
  return JSON.stringify(answers) !== JSON.stringify(blank);
}

export function normaliseUrls(input) {
  const answers = sanitizeAnswers(input);
  ["website", "assetFolder"].forEach((key) => {
    if (answers[key]) {
      const cleaned = cleanUrl(answers[key]);
      if (cleaned) answers[key] = cleaned;
    }
  });
  answers.socials = answers.socials.map((item) => (item && cleanUrl(item)) || item);
  answers.similarBusinesses = answers.similarBusinesses.map((item) => (item && cleanUrl(item)) || item);
  answers.likedSites = answers.likedSites.map((item) => ({
    url: (item.url && cleanUrl(item.url)) || item.url,
    likes: item.likes
  }));
  if (answers.phone) {
    const phone = cleanPhone(answers.phone);
    if (phone) answers.phone = phone;
  }
  return answers;
}
