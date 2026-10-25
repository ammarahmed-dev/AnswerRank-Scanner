"use client";

import { CheckCircle2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SERVICE_ENGAGEMENTS, SERVICE_PLATFORMS, serviceSource, type ServiceEnquiry, type ServiceErrors } from "@/lib/service-enquiry";

type SubjectOption =
  | "General question"
  | "Report issue"
  | "Billing / payment"
  | "Feature request"
  | "Optimization services"
  | "Other";

type ContactFormValues = {
  name: string;
  email: string;
  subject: SubjectOption;
  message: string;
};

type ContactErrors = Partial<Record<keyof ContactFormValues, string>> & ServiceErrors & { form?: string };

const SUBJECT_OPTIONS: SubjectOption[] = [
  "General question",
  "Report issue",
  "Billing / payment",
  "Feature request",
  "Optimization services",
  "Other",
];

const INITIAL_VALUES: ContactFormValues = {
  name: "",
  email: "",
  subject: "General question",
  message: "",
};

export default function ContactForm({ services = false }: { services?: boolean }) {
  const searchParams = useSearchParams();
  const [values, setValues] = useState<ContactFormValues>(() => ({ ...INITIAL_VALUES, subject: services ? "Optimization services" : "General question" }));
  const [service, setService] = useState<Omit<ServiceEnquiry, "source">>({ website: "", platform: "unsure", engagement: "unsure" });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const isUpgradeRequest = searchParams.get("subject") === "upgrade";
  const isServicesRequest = searchParams.get("subject") === "services";
  const isServiceForm = services || values.subject === "Optimization services";

  const isDisabled = status === "loading";

  useEffect(() => {
    if (!isUpgradeRequest) return;
    setValues((prev) => ({
      ...prev,
      subject: "Billing / payment",
    }));
  }, [isUpgradeRequest]);

  useEffect(() => {
    if (!isServicesRequest) return;
    setValues((prev) => ({ ...prev, subject: "Optimization services" }));
  }, [isServicesRequest]);

  const setField = <K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDisabled) return;
    setErrors({});
    setStatus("loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, ...(isServiceForm ? {
          subject: "Optimization services",
          service: { ...service, source: serviceSource(searchParams.get("source")) },
        } : {}) }),
      });

      const data = (await res.json()) as { success?: boolean; errors?: ContactErrors; error?: string };

      if (!res.ok) {
        if (data?.errors) {
          setErrors(data.errors);
          const ids: Record<string, string> = { name: "contact-name", email: "contact-email", subject: "contact-subject", message: "contact-message", website: "service-website", platform: "service-platform", engagement: "service-engagement" };
          const first = Object.keys(data.errors).find(key => ids[key]);
          if (first) window.requestAnimationFrame(() => document.getElementById(ids[first])?.focus());
        } else {
          setErrors({
            form: data?.error || "Something went wrong. Please try again or email us at hello@aeocheck.co",
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
        <p>{isServiceForm ? "Your implementation request has been saved. We will review your site and contact you to discuss scope. This is an enquiry, not a booking or purchase." : "Message sent! We'll get back to you within 24 hours."}</p>
      </div>
    );
  }

  return (
    <form className={`contact-form${isServiceForm ? " service-enquiry-form" : ""}`} onSubmit={handleSubmit} noValidate>
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
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "contact-name-error" : undefined}
          autoComplete="name"
        />
        {errors.name && <p id="contact-name-error" className="contact-error">{errors.name}</p>}
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
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
          autoComplete="email"
        />
        {errors.email && <p id="contact-email-error" className="contact-error">{errors.email}</p>}
      </div>

      {!services && <div className="contact-field">
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
      </div>}

      {isServiceForm && <>
        <div className="contact-field">
          <label htmlFor="service-website">Website URL</label>
          <input id="service-website" type="url" required maxLength={2048}
            placeholder="https://example.com" autoComplete="url" className="contact-control"
            value={service.website} disabled={isDisabled} aria-invalid={!!errors.website}
            aria-describedby="service-website-help service-website-error"
            onChange={event => { setService(previous => ({ ...previous, website: event.target.value })); setErrors(previous => ({ ...previous, website: undefined })); }} />
          <p id="service-website-help" className="service-form-note">Use a page we can review. Do not include passwords, private links or URL query strings.</p>
          <span id="service-website-error" className="contact-error">{errors.website}</span>
        </div>
        <div className="contact-field">
          <label htmlFor="service-platform">Platform (optional)</label>
          <select id="service-platform" className="contact-control" value={service.platform} disabled={isDisabled}
            aria-invalid={!!errors.platform} aria-describedby="service-platform-error"
            onChange={event => setService(previous => ({ ...previous, platform: event.target.value as ServiceEnquiry["platform"] }))}>
            {SERVICE_PLATFORMS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <span id="service-platform-error" className="contact-error">{errors.platform}</span>
        </div>
        <div className="contact-field">
          <label htmlFor="service-engagement">Help needed (optional)</label>
          <select id="service-engagement" className="contact-control" value={service.engagement} disabled={isDisabled}
            aria-invalid={!!errors.engagement} aria-describedby="service-engagement-error"
            onChange={event => setService(previous => ({ ...previous, engagement: event.target.value as ServiceEnquiry["engagement"] }))}>
            {SERVICE_ENGAGEMENTS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <span id="service-engagement-error" className="contact-error">{errors.engagement}</span>
        </div>
        {errors.source && <p className="contact-error" role="alert">{errors.source}</p>}
      </>}

      <div className="contact-field">
        <label htmlFor="contact-message">{isServiceForm ? "What would you like help with?" : "Message"}</label>
        <textarea
          id="contact-message"
          value={values.message}
          onChange={(e) => setField("message", e.target.value)}
          required
          minLength={20}
          maxLength={isServiceForm ? 10000 : undefined}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          disabled={isDisabled}
          className="contact-control contact-textarea"
        />
        {errors.message && <p id="contact-message-error" className="contact-error">{errors.message}</p>}
      </div>

      {errors.form && <p className="contact-error contact-error-form" role="alert">{errors.form}</p>}

      {isServiceForm && <p className="service-form-note">We will use these details to respond to your request. No payment or site access is requested here. <a href="/privacy-policy">Privacy policy</a>.</p>}
      <button type="submit" disabled={isDisabled} className="btn btn-primary contact-submit">
        {isDisabled ? "Sending..." : isServiceForm ? "Request an implementation proposal" : "Send message"}
      </button>
    </form>
  );
}
