"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useAuth } from "./auth-context";

type ModuleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  basePath: string;
};

/** Standalone apps already apply basePath; platform has no global basePath. */
export function ModuleLink({ href, basePath, ...props }: ModuleLinkProps) {
  const { internalNavigation } = useAuth();
  const suffix = href === "/" ? "" : href.startsWith("/?") ? href.slice(1) : href;
  const destination = internalNavigation ? `${basePath}${suffix}` : href;
  return <Link {...props} href={destination} />;
}
