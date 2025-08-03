"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StableAvatar } from "@/components/stable-avatar";

interface NavItem {
  href: string;
  label: string;
}

interface MobileMenuProps {
  items: NavItem[];
  guildId: string;
  guildName: string;
  guildIcon?: string | null;
}

export function MobileMenu({ items, guildId, guildName, guildIcon }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const getIconUrl = () => {
    if (!guildIcon) return null;
    return `https://cdn.discordapp.com/icons/${guildId}/${guildIcon}.png`;
  };

  return (
    <div className="md:hidden">
      {/* Menu Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-25"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl">
            {/* Guild Header */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <StableAvatar
                  src={getIconUrl()}
                  alt={guildName}
                  size={32}
                  fallbackClassName="bg-gray-600"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{guildName}</p>
                  <Link
                    href="/guilds"
                    className="text-xs text-blue-600 hover:text-blue-700"
                    onClick={() => setIsOpen(false)}
                  >
                    Switch Server
                  </Link>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="p-4">
              <div className="space-y-1">
                {items.map((item) => {
                  const href = `/g/${guildId}${item.href}`;
                  const isActive = pathname === href || pathname?.startsWith(href + "/");
                  
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}