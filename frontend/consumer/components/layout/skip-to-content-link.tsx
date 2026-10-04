"use client";

import type { MouseEvent } from "react";

export function SkipToContentLink() {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    const target = document.getElementById("main-content");
    if (!target) return;

    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: "auto", block: "start" });
  }

  return (
    <a className="skip-link" href="#main-content" onClick={handleClick}>
      Skip to main content
    </a>
  );
}
