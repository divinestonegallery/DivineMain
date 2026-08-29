// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./site-shell.module.css";

const consentKey = "dsg-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setVisible(window.localStorage.getItem(consentKey) === null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  function savePreference() {
    window.localStorage.setItem(consentKey, "acknowledged");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section className={styles.cookieConsent} aria-label="Cookie preferences">
      <div>
        <strong>Your privacy matters</strong>
        <p>This site currently uses local preference storage to remember this notice. It does not use advertising trackers.</p>
        <Link href="/privacy">Privacy details</Link>
      </div>
      <div className={styles.cookieActions}>
        <button type="button" onClick={savePreference}>Understood</button>
      </div>
    </section>
  );
}
