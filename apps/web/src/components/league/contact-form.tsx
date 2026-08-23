"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@azhl/ui";
import { LEAGUE_CONTACT } from "@/lib/league-contact";
import { useTranslation } from "@/lib/i18n/use-translation";

const FIELD_CLASS =
  "w-full rounded-md border border-border-subtle bg-surface-raised px-4 py-3 text-sm text-foreground-primary placeholder:text-foreground-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * No backend inbox/API exists yet to receive submissions, and adding one (email delivery
 * service, storage, spam handling) is a real backend decision, not something to fake here. On
 * submit this opens the visitor's own email client with the message prefilled — a genuinely
 * working outcome without inventing a server we don't have.
 */
export function ContactForm() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const subject = String(form.get("subject") ?? "");
    const message = String(form.get("message") ?? "");

    const body = `${message}\n\n— ${name} (${email})`;
    const mailto = `mailto:${LEAGUE_CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-name" className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          {t("contacts.name")}
        </label>
        <input id="contact-name" name="name" type="text" required className={FIELD_CLASS} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-email" className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          {t("contacts.email")}
        </label>
        <input id="contact-email" name="email" type="email" required className={FIELD_CLASS} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-subject" className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          {t("contacts.subject")}
        </label>
        <input id="contact-subject" name="subject" type="text" required className={FIELD_CLASS} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          {t("contacts.message")}
        </label>
        <textarea id="contact-message" name="message" rows={5} required className={FIELD_CLASS} />
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <Button type="submit" size="lg" className="rounded-sm px-12">
          {t("contacts.sendButton")}
        </Button>

        {sent && (
          <p className="text-sm text-foreground-secondary" role="status">
            {t("contacts.sentConfirmation")}
          </p>
        )}
      </div>
    </form>
  );
}
