"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "./Button";

// Supervisor feedback: an inline error under the form was too easy to miss. On a
// failed submit we now (1) flash the offending fields in place and (2) open a
// centred dialog listing what is missing. Closing the dialog scrolls to, focuses
// and re-flashes the first field so the user lands exactly where they need to be.

export interface ValidationIssue {
  /** DOM id of the element to flash — an input, or a wrapper around a group of buttons. */
  fieldId: string;
  message: string;
  /** Where the field lives, e.g. a wizard step name, shown before the message. */
  section?: string;
}

export interface ValidationPromptOptions {
  title?: string;
  /** Button text; defaults to "Show me". */
  actionLabel?: string;
  /**
   * Runs as the dialog closes, before scrolling to the first field — e.g. to switch
   * wizard step so that field is on screen. Rendered synchronously so it is there to reveal.
   */
  beforeReveal?: () => void;
}

/**
 * Pulse and shake the given elements. Uses a data attribute rather than a class
 * so a React re-render (e.g. the field's error border appearing) can't strip it
 * mid-animation. Removing and re-adding it restarts the animation on repeat submits.
 */
export function flashFields(fieldIds: string[]) {
  for (const id of fieldIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.removeAttribute("data-flash");
    void el.offsetWidth; // force reflow so the animation restarts
    el.setAttribute("data-flash", "");
    const clear = (e: AnimationEvent) => {
      if (e.target !== el || e.animationName !== "field-flash") return;
      el.removeAttribute("data-flash");
      el.removeEventListener("animationend", clear);
    };
    el.addEventListener("animationend", clear);
  }
}

function revealField(fieldId: string | undefined) {
  if (!fieldId) return;
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.scrollIntoView?.({ behavior: "smooth", block: "center" });
  const focusable = el.matches("input, select, textarea, button")
    ? el
    : el.querySelector<HTMLElement>("input, select, textarea, button");
  focusable?.focus({ preventScroll: true });
}

/**
 * `report(issues)` returns true when there is nothing to fix; otherwise it flashes
 * the fields and opens the dialog. Render `<ValidationDialog {...prompt} />` once.
 */
export function useValidationPrompt() {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [options, setOptions] = useState<ValidationPromptOptions>({});

  const report = useCallback((next: ValidationIssue[], nextOptions: ValidationPromptOptions = {}) => {
    setIssues(next);
    setOptions(nextOptions);
    if (next.length > 0) flashFields(next.map((i) => i.fieldId));
    return next.length === 0;
  }, []);

  const dismiss = useCallback(() => {
    const ids = issues.map((i) => i.fieldId);
    flushSync(() => {
      setIssues([]);
      options.beforeReveal?.();
    });
    revealField(ids[0]);
    flashFields(ids);
  }, [issues, options]);

  return { issues, options, report, dismiss };
}

export function ValidationDialog({
  issues,
  options = {},
  dismiss,
}: {
  issues: ValidationIssue[];
  options?: ValidationPromptOptions;
  dismiss: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const listId = useId();
  const open = issues.length > 0;

  useEffect(() => {
    if (!open) return;
    buttonRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, dismiss]);

  if (!open) return null;

  const heading =
    options.title ??
    (issues.length === 1 ? "Please complete this field" : `Please complete ${issues.length} fields`);

  // Portalled to <body> so a transformed or overflow-hidden ancestor (e.g. a Card)
  // can't clip it or break its fixed positioning.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={dismiss}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={listId}
        className="validation-pop w-full max-w-sm rounded-xl border-t-4 border-red-500 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="shrink-0 rounded-full bg-red-100 p-2 text-red-600">
            <AlertCircle size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              {heading}
            </h2>
            <ul id={listId} className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
              {issues.map((issue) => (
                <li key={issue.fieldId}>
                  {issue.section && <span className="font-semibold text-slate-900">{issue.section}: </span>}
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button ref={buttonRef} type="button" onClick={dismiss}>
            {options.actionLabel ?? "Show me"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
