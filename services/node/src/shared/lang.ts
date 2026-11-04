// The demo data exists in German and English. A tool call picks one with its
// `language` argument, an HTTP request with `?lang=en`; German is the default.
// The server cannot see the client's language setting (requests carry no
// locale), so the model passes the language the user writes in.
export type Lang = "de" | "en";

export const langOf = (value: unknown): Lang => (value === "en" ? "en" : "de");

/** The language of an HTTP request: `?lang=en`, otherwise German. */
export const langQuery = (c: { req: { query(name: string): string | undefined } }) => langOf(c.req.query("lang"));

/** The German or the English text. */
export const tr = (lang: Lang, de: string, en: string) => (lang === "en" ? en : de);

/** Input schema property every tool takes. */
export const LANGUAGE = {
  enum: ["de", "en"],
  description: 'Language of the records, the text and the view: "en" when the user writes English, otherwise "de" (default).',
} as const;

export const money = (value: number, lang: Lang = "de") =>
  new Intl.NumberFormat(lang === "en" ? "en-GB" : "de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
