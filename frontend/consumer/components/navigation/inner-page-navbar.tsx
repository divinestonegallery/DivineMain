"use client";

import { NavbarBar, type NavbarProps } from "./navbar-bar";

export function InnerPageNavbar(props: NavbarProps) {
  return <NavbarBar {...props} showSearchIcon />;
}
