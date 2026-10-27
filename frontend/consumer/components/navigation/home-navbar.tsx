"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { NavbarBar, type NavbarProps } from "./navbar-bar";

type HomeHeaderState = { scrolled: boolean; compact: boolean; dockedSearch: boolean };

export function HomeNavbar(props: NavbarProps) {
  const headerRef = useRef<HTMLElement>(null);
  const [state, setState] = useState<HomeHeaderState>({ scrolled: false, compact: false, dockedSearch: false });

  useLayoutEffect(() => {
    let frame = 0;
    let heroSearch: HTMLElement | null = null;
    const desktop = window.matchMedia("(min-width: 1025px)");
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleUpdate);

    function update() {
      const hero = document.querySelector<HTMLElement>("[data-hero-search]");
      if (hero !== heroSearch) {
        if (heroSearch) resizeObserver?.unobserve(heroSearch);
        heroSearch = hero;
        if (heroSearch) resizeObserver?.observe(heroSearch);
      }
      const scrolled = window.scrollY > 16;
      const rect = heroSearch?.getBoundingClientRect();
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0;
      const dockedSearch = rect ? rect.bottom <= headerBottom || rect.top >= window.innerHeight : false;
      const compact = scrolled && desktop.matches;
      setState((current) => current.scrolled === scrolled && current.compact === compact && current.dockedSearch === dockedSearch
        ? current : { scrolled, compact, dockedSearch });
    }

    function scheduleUpdate() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    }

    // The home hero can arrive after the header when the page streams.
    const mutationObserver = new MutationObserver(() => {
      if (document.querySelector("[data-hero-search]")) {
        scheduleUpdate();
        mutationObserver.disconnect();
      }
    });
    update();
    if (!heroSearch) mutationObserver.observe(document.body, { childList: true, subtree: true });
    if (headerRef.current) resizeObserver?.observe(headerRef.current);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return (
    <NavbarBar
      {...props}
      home
      headerRef={headerRef}
      transparent={!state.scrolled}
      compact={state.compact}
      showSearchPill={state.dockedSearch && !state.compact}
      showSearchIcon={state.compact}
    />
  );
}
