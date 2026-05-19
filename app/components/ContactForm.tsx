"use client";

import { CheckCircle2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type SubjectOption =
  | "General question"
  | "Report issue"
  | "Billing / payment"
  | "Feature request"
  | "Other";

type ContactFormValues = {
  name: string;
  email: string;
  subject: SubjectOption;
  message: string;
};

type ContactErrors = Partial<Record<keyof ContactFormValues, string>> & { form?: string };

const SUBJECT_OPTIONS: SubjectOption[] = [
  "General question",
  "Report issue",
  "Billing / payment",
  "Feature request",
  "Other",
];

const INITIAL_VALUES: ContactFormValues = {
  name: "",
  email: "",
  subject: "General question",
  message: "",
};

export default function ContactForm() {
  const searchParams = useSearchParams();
  const [values, setValues] = useState<ContactFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const isUpgradeRequest = searchParams.get("subject") === "upgrade";

  const isDisabled = status === "loading";

  useEffect(() => {
    if (!isUpgradeRequest) return;
    setValues((prev) => ({
      ...prev,
      subject: "Billing / payment",
    }));
  }, [isUpgradeRequest]);

  const setField = <K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setStatus("loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await res.json()) as { success?: boolean; errors?: ContactErrors; error?: string };

      if (!res.ok) {
        if (data?.errors) {
          setErrors(data.errors);
        } else {
          setErrors({
            form: "Something went wrong. Please try again or email us at hello@aeocheck.co",
          });
        }
        setStatus("idle");
        return;
      }

      if (data?.success) {
        setStatus("success");
        return;
      }

      setErrors({
        form: "Something went wrong. Please try again or email us at hello@aeocheck.co",
      });
      setStatus("idle");
    } catch {
      setErrors({
        form: "Something went wrong. Please try again or email us at hello@aeocheck.co",
      });
      setStatus("idle");
    }
  };

  if (status === "success") {
    return (
      <div className="contact-success" role="status" aria-live="polite">
        <CheckCircle2 className="h-7 w-7" />
        <p>Message sent! We&apos;ll get back to you within 24 hours.</p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      {isUpgradeRequest && (
        <div className="contact-upgrade-note">
          Tell us which plan you want and we&apos;ll help activate access manually.
        </div>
      )}

      <div className="contact-field">
        <label htmlFor="contact-name">Name</label>
        <input
          id="contact-name"
          type="text"
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          required
          disabled={isDisabled}
          className="contact-control"
          autoComplete="name"
        />
        {errors.name && <p className="contact-error">{errors.name}</p>}
      </div>

      <div className="contact-field">
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          type="email"
          value={values.email}
          onChange={(e) => setField("email", e.target.value)}
          required
          disabled={isDisabled}
          className="contact-control"
          autoComplete="email"
        />
        {errors.email && <p className="contact-error">{errors.email}</p>}
      </div>

      <div className="contact-field">
        <label htmlFor="contact-subject">Subject</label>
        <select
          id="contact-subject"
          value={values.subject}
          onChange={(e) => setField("subject", e.target.value as SubjectOption)}
          required
          disabled={isDisabled}
          className="contact-control"
        >
          {SUBJECT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.subject && <p className="contact-error">{errors.subject}</p>}
      </div>

      <div className="contact-field">
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          value={values.message}
          onChange={(e) => setField("message", e.target.value)}
          required
          minLength={20}
          disabled={isDisabled}
          className="contact-control contact-textarea"
        />
        {errors.message && <p className="contact-error">{errors.message}</p>}
      </div>

      {errors.form && <p className="contact-error contact-error-form">{errors.form}</p>}

      <button type="submit" disabled={isDisabled} className="btn btn-primary contact-submit">
        {isDisabled ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
