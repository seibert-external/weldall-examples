// Shared browser kit of the Brakenstedt views. Loaded as an ES module by a view
// after the Weldall bridge is confirmed. No network access: data arrives in tool
// results, clicks go back through the host (tool calls, chat, downloads).
const version = new URL(import.meta.url).search;
export const sdk = await import(new URL(`./sdk.js${version}`, import.meta.url).href);

const SVG = "http://www.w3.org/2000/svg";

/** Create an element. Text is always set as text, never parsed as HTML. */
export function h(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = Array.isArray(value) ? value.filter(Boolean).join(" ") : value;
    else if (key === "style" && typeof value === "object") Object.assign(node.style, value);
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

// Lucide-style 24px stroke icons.
const ICONS = {
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  clock: "M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z",
  alert: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01",
  check: "M20 6 9 17l-5-5",
  checkCircle: "M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3",
  more: "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  sparkles: "M9.9 15.5A2 2 0 0 0 8.5 14l-6.1-1.6a.5.5 0 0 1 0-1L8.5 9.9A2 2 0 0 0 9.9 8.5l1.6-6.1a.5.5 0 0 1 1 0l1.6 6.1a2 2 0 0 0 1.4 1.4l6.1 1.6a.5.5 0 0 1 0 1l-6.1 1.6a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0zM20 3v4M22 5h-4",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  file: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  euro: "M4 10h12M4 14h9M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2",
  user: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  building: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18zM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4",
  refresh: "M3 12a9 9 0 0 1 9-9 9.8 9.8 0 0 1 6.7 2.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.8 9.8 0 0 1-6.7-2.7L3 16M8 16H3v5",
  arrowLeft: "M12 19l-7-7 7-7M19 12H5",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  expand: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
  shrink: "M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7",
  flag: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
  shield: "M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.7 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z",
  scale: "M16 16l3-8 3 8c-.9.7-1.9 1-3 1s-2.1-.3-3-1zM2 16l3-8 3 8c-.9.7-1.9 1-3 1s-2.1-.3-3-1zM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",
  percent: "M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  repeat: "m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3",
  target: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  trend: "M22 7l-8.5 8.5-5-5L2 17M16 7h6v6",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
  note: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  wrench: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z",
  bug: "M8 2l1.9 1.9M14.1 3.9 16 2M9 7.1V6a3 3 0 1 1 6 0v1.1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.5 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4",
  zap: "M13 2 3 14h9l-1 8 10-12h-9z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
  minus: "M5 12h14",
  chevronRight: "m9 18 6-6-6-6",
  chevrons: "m7 15 5 5 5-5M7 9l5-5 5 5",
  pin: "M20 10c0 4.9-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 14.9 4 10a8 8 0 0 1 16 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  quote: "M3 21c3 0 7-1 7-8V5c0-1.3-.8-2-2-2H4c-1.3 0-2 .7-2 2v6c0 1.3.7 2 2 2h2c0 4-2 6-3 8zM15 21c3 0 7-1 7-8V5c0-1.3-.8-2-2-2h-4c-1.3 0-2 .7-2 2v6c0 1.3.7 2 2 2h2c0 4-2 6-3 8z",
  hourglass: "M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4A2 2 0 0 0 17 6.2V2",
};

export function icon(name, size = 16) {
  const svg = document.createElementNS(SVG, "svg");
  for (const [key, value] of Object.entries({
    viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor",
    "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true",
  })) svg.setAttribute(key, String(value));
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", ICONS[name] ?? ICONS.minus);
  svg.append(path);
  return svg;
}

export const pill = (label, tone, iconName, title) =>
  h("span", { class: ["pill", tone], title }, iconName && icon(iconName, 13), label);
export const stat = (value, label, tone) =>
  h("div", { class: "stat" }, h("div", { class: ["value", tone && `t-${tone}`] }, value), h("div", { class: "label" }, label));
export const props = (rows) =>
  h("dl", { class: "props" }, rows.filter(Boolean).map(([label, value]) => [h("dt", {}, label), h("dd", {}, value)]));

/** Circular gauge; `fraction` 0..1 of the ring is drawn. */
export function ring(fraction, { size = 96, stroke = 8, tone, children } = {}) {
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const svg = (tag, attrs) => {
    const node = document.createElementNS(SVG, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    return node;
  };
  const root = svg("svg", { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: `ring ${tone ?? ""}`, "aria-hidden": "true" });
  const common = { cx: size / 2, cy: size / 2, r, fill: "none", "stroke-width": stroke };
  root.append(svg("circle", { ...common, class: "track" }));
  const value = svg("circle", {
    ...common, class: "value", "stroke-dasharray": `${length} ${length}`,
    "stroke-dashoffset": length * (1 - Math.min(1, Math.max(0, fraction))), transform: `rotate(-90 ${size / 2} ${size / 2})`,
  });
  value.style.setProperty("--len", String(length));
  root.append(value);
  return h("div", { class: "ring-box", style: { position: "relative", width: `${size}px`, height: `${size}px` } }, root,
    h("div", { class: "ring-center" }, children));
}

/** Stagger the entrance of a container's children. */
export function reveal(node) {
  node.classList.add("reveal");
  [...node.children].forEach((child, i) => child.style.setProperty("--i", String(Math.min(i, 12))));
  return node;
}

// --- Formatting ---------------------------------------------------------------
const day = (iso) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);
export const fmtDate = (iso, opts = {}) =>
  iso ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC", ...opts }).format(day(iso)) : "–";
export const fmtMonth = (iso) => new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "UTC" }).format(day(iso));
export const fmtDateTime = (iso) =>
  new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(iso));
export const fmtMoney = (value, currency = "EUR", compact = false) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency, maximumFractionDigits: compact && value >= 1000000 ? 1 : compact || value >= 1000 ? 0 : 2, notation: compact && value >= 100000 ? "compact" : "standard" }).format(value);
export const daysBetween = (from, to) => Math.round((day(to) - day(from)) / 86400000);

export function relDays(days) {
  if (days === 0) return "heute";
  if (days === 1) return "morgen";
  if (days === -1) return "gestern";
  const abs = Math.abs(days);
  const span = abs >= 540 ? `${Math.round(abs / 365)} Jahren` : abs >= 60 ? `${Math.round(abs / 30)} Monaten` : abs >= 21 ? `${Math.round(abs / 7)} Wochen` : `${abs} Tagen`;
  return days > 0 ? `in ${span}` : `vor ${span}`;
}

export function relTime(iso, now = new Date()) {
  const minutes = Math.round((now - new Date(iso)) / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return relDays(-Math.round(hours / 24));
}

// --- Menus and feedback -----------------------------------------------------------
let openMenu = null;
document.addEventListener("click", (event) => {
  if (openMenu && !openMenu.contains(event.target)) openMenu.classList.remove("open");
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && openMenu) openMenu.classList.remove("open");
});

/** Three-dot action menu. Items: { label, icon, run, disabled, hint } or "-". */
export function menu(items, label = "Weitere Aktionen") {
  const root = h("div", { class: "menu" });
  const pop = h("div", { class: "menu-pop", role: "menu" }, items.map((item) =>
    item === "-" ? h("div", { class: "menu-sep" }) :
      h("button", {
        class: "menu-item", role: "menuitem", type: "button", disabled: item.disabled,
        title: item.disabled ? "Dieser Client unterstützt die Aktion nicht" : undefined,
        onclick: async (event) => {
          event.stopPropagation();
          root.classList.remove("open");
          await item.run();
        },
      }, icon(item.icon ?? "arrowRight"), item.label, item.hint && h("span", { class: "hint" }, item.hint))));
  const button = h("button", {
    class: "btn ghost icon-btn", type: "button", "aria-label": label, "aria-haspopup": "menu", title: label,
    onclick: (event) => {
      event.stopPropagation();
      if (openMenu && openMenu !== root) openMenu.classList.remove("open");
      root.classList.toggle("open");
      openMenu = root;
    },
  }, icon("more", 18));
  root.append(button, pop);
  return root;
}

export const empty = (iconName, text) => h("div", { class: "empty" }, icon(iconName, 28), h("div", {}, text));
const skeleton = () => h("div", { class: "skeleton", "aria-label": "Wird geladen" }, h("div"), h("div"), h("div"), h("div"));

/** A calendar file for a deadline (all-day) or an appointment (`at`, two hours). */
export function ics({ uid, title, date, at, description }) {
  const utc = (d) => d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const text = (value) => value.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const when = at
    ? [`DTSTART:${utc(new Date(at))}`, `DTEND:${utc(new Date(Date.parse(at) + 7200000))}`]
    : [`DTSTART;VALUE=DATE:${date.slice(0, 10).replace(/-/g, "")}`,
       `DTEND;VALUE=DATE:${new Date(day(date).getTime() + 86400000).toISOString().slice(0, 10).replace(/-/g, "")}`];
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Brakenstedt//Termine//DE", "BEGIN:VEVENT",
    `UID:${uid}@brakenstedt.example`, `DTSTAMP:${utc(new Date())}`, ...when,
    `SUMMARY:${text(title)}`, `DESCRIPTION:${text(description)}`,
    "BEGIN:VALARM", `TRIGGER:${at ? "-PT1H" : "-P7D"}`, "ACTION:DISPLAY", `DESCRIPTION:${text(title)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}

// --- Host wiring -------------------------------------------------------------------
function applyTheme(context) {
  const root = document.documentElement;
  if (context?.theme) root.dataset.theme = context.theme;
  for (const [key, value] of Object.entries(context?.styles?.variables ?? {}))
    if (key.startsWith("--") && typeof value === "string") root.style.setProperty(key, value);
}

/**
 * Mount a view. `render(data, app)` returns a Node for each successful tool
 * result. `app` offers host actions; each is a no-op with a notice when the host
 * does not advertise it.
 */
export async function start({ render, loading = "Daten werden geladen …", tag = "Beispieldaten" }) {
  const main = document.getElementById("app") ?? document.body.appendChild(h("main", { id: "app" }));
  const bar = main.querySelector(".bar");
  main.querySelector(".shell-note")?.remove();
  const body = h("div", { class: "view-body" }, skeleton());
  const toastSlot = h("div");
  main.append(toastSlot, body);

  const host = await sdk.getMcpAppHost();
  const caps = host.capabilities ?? {};
  // The SDK forwards tool calls only when the host speaks the Weldall extension.
  const toolCalls = caps.experimental?.["weldall/resource-tool-calls"]?.version === 1;
  applyTheme(host.context);

  let toastTimer;
  const toast = (text, error = false) => {
    clearTimeout(toastTimer);
    toastSlot.replaceChildren(h("div", { class: ["toast", error && "error"], role: error ? "alert" : "status" }, icon(error ? "alert" : "checkCircle"), text));
    toastTimer = setTimeout(() => toastSlot.replaceChildren(), 3500);
  };
  const guard = (supported, run) => async (...args) => {
    if (!supported) return toast("Dieser Client unterstützt die Aktion nicht.", true);
    try { return await run(...args); }
    catch { toast("Das hat nicht geklappt. Bitte erneut versuchen.", true); }
  };

  let mode = host.context?.displayMode ?? "inline";
  const modes = host.context?.availableDisplayModes ?? [];
  const expand = modes.includes("fullscreen") ? h("button", {
    class: "bar-btn", type: "button", title: "Vollbild", "aria-label": "Vollbild umschalten",
    onclick: guard(true, async () => {
      const result = await sdk.requestMcpAppDisplayMode({ mode: mode === "fullscreen" ? "inline" : "fullscreen" });
      mode = result.mode;
      expand.replaceChildren(icon(mode === "fullscreen" ? "shrink" : "expand"));
    }),
  }, icon(mode === "fullscreen" ? "shrink" : "expand")) : null;
  bar?.append(h("span", { class: "bar-spacer" }), tag && h("span", { class: "bar-tag" }, tag), expand);

  const app = {
    toast,
    can: {
      call: toolCalls,
      chat: Boolean(caps.message),
      context: Boolean(caps.updateModelContext),
      download: Boolean(caps.downloadFile),
    },
    /** Call one of this view's allowed tools; returns structuredContent or null. */
    call: guard(toolCalls, async (name, args) => {
      const result = await sdk.callMcpAppTool(name, args);
      if (result.isError) {
        toast(result.content?.map((block) => block.text).join(" ") || "Abfrage abgelehnt.", true);
        return null;
      }
      return result.structuredContent ?? null;
    }),
    /** Put a prompt into the chat; the assistant answers with its own tools. */
    ask: guard(Boolean(caps.message), async (text) => {
      const result = await sdk.sendMcpAppMessage({ role: "user", content: [{ type: "text", text }] });
      if (result?.isError) toast("Der Client hat die Nachricht nicht angenommen.", true);
    }),
    /** Tell the model what the user is looking at, without a chat turn. */
    context: guard(Boolean(caps.updateModelContext), async (structuredContent, note) => {
      await sdk.updateMcpAppContext({ structuredContent });
      if (note) toast(note);
    }),
    download: guard(Boolean(caps.downloadFile), async (filename, mimeType, text) => {
      const result = await sdk.downloadMcpAppFile({ contents: [{ type: "resource", resource: { uri: `file:///${filename}`, mimeType, text } }] });
      if (!result?.isError) toast(`${filename} gespeichert.`);
    }),
    /** Replace the view with a new render. */
    show(data) {
      try {
        body.replaceChildren(render(data, app));
      } catch (error) {
        console.error("View render failed", error);
        body.replaceChildren(empty("alert", `Die Ansicht konnte nicht dargestellt werden. ${error?.message ?? ""}`));
      }
    },
  };

  sdk.subscribeMcpAppEvents((event) => {
    if (event.method === "ui/notifications/tool-input") body.replaceChildren(skeleton());
    else if (event.method === "ui/notifications/tool-result") {
      const result = event.params ?? {};
      if (result.isError || !result.structuredContent)
        body.replaceChildren(empty("alert", (result.content ?? []).map((block) => block.text).join(" ") || "Keine Daten erhalten."));
      else app.show(result.structuredContent);
    } else if (event.method === "ui/notifications/tool-cancelled") body.replaceChildren(empty("minus", "Abgebrochen."));
    else if (event.method === "ui/notifications/host-context-changed") {
      applyTheme(event.params);
      if (event.params?.displayMode) mode = event.params.displayMode;
    }
  });
  body.firstChild?.setAttribute?.("aria-label", loading);
  return app;
}
