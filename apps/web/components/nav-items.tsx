"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

interface NavItemsProps {
  items: NavItem[];
  guildId: string;
}

export function NavItems({ items, guildId }: NavItemsProps) {
  const pathname = usePathname();

  return (
    <div className="ml-8 hidden items-center gap-1 md:flex">
      {items.map((item) => {
        const href = `/g/${guildId}${item.href}`;
        const isActive = pathname === href || pathname?.startsWith(href + "/");
        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}