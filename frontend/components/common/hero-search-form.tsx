"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import styles from "@/app/page.module.css";

const VALIDATION_MESSAGE = "Please enter at least 2 characters.";

export function HeroSearchForm() {
  const [message, setMessage] = useState("");
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function showValidationPopup() {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
    }

    setMessage(VALIDATION_MESSAGE);
    timerRef.current = window.setTimeout(() => {
      setMessage("");
      timerRef.current = undefined;
    }, 2000);
  }

  function validateAndStopIfInvalid(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const input = form.elements.namedItem("q");
    const rawValue = input instanceof HTMLInputElement ? input.value : "";
    const trimmedValue = rawValue.trim();

    if (trimmedValue.length < 2) {
      event.preventDefault();
      showValidationPopup();
      return;
    }

    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    setMessage("");
  }

  return (
    <div className={styles.heroSearchWrap}>
      <div className={styles.heroSearchPopupAnchor}>
        {message ? (
          <div className={styles.heroSearchValidationPopup} role="alert" aria-live="polite">
            {message}
          </div>
        ) : null}
      </div>
      <form
        className={styles.heroSearch}
        action="/shop"
        data-hero-search
        method="get"
        noValidate
        onSubmit={validateAndStopIfInvalid}
      >
        <Search aria-hidden="true" size={24} strokeWidth={1.6} />
        <input
          name="q"
          type="search"
          placeholder="Search for Ganesh, marble temple or home decor"
          aria-label="Search the Divine Stone catalogue"
          autoComplete="off"
        />
        <button type="submit" aria-label="Search catalogue">
          <Search aria-hidden="true" size={22} strokeWidth={1.8} />
        </button>
      </form>
    </div>
  );
}
