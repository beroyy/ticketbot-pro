"use client";

import { useState } from "react";
import { Search, ArrowUpDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TicketsControlsProps = {
  filters: {
    status: string;
    search: string;
    sort: string;
  };
  onFiltersChange: (filters: Partial<TicketsControlsProps["filters"]>) => void;
  isCompact?: boolean;
};

const sortOptions = [
  { value: "createdAt", label: "Date Created" },
  { value: "updatedAt", label: "Last Updated" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
];

export function TicketsControls({
  filters,
  onFiltersChange,
  isCompact = false,
}: TicketsControlsProps) {
  const [searchValue, setSearchValue] = useState(filters.search);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ search: searchValue });
  };

  const handleSortChange = (sort: string) => {
    onFiltersChange({ sort });
  };

  const hasActiveFilters = filters.search || filters.sort !== "createdAt";

  const clearFilters = () => {
    setSearchValue("");
    onFiltersChange({ search: "", sort: "createdAt" });
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Search tickets..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className={`pl-9 ${isCompact ? "h-8 text-sm" : ""}`}
        />
      </form>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size={isCompact ? "sm" : "default"} className="gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={filters.sort === option.value ? "bg-gray-100" : ""}
              >
                {option.label}
                {filters.sort === option.value && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size={isCompact ? "sm" : "default"}
            onClick={clearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <button
                onClick={() => {
                  setSearchValue("");
                  onFiltersChange({ search: "" });
                }}
                className="ml-1 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.sort !== "createdAt" && (
            <Badge variant="secondary" className="gap-1">
              Sort: {sortOptions.find((o) => o.value === filters.sort)?.label}
              <button
                onClick={() => onFiltersChange({ sort: "createdAt" })}
                className="ml-1 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
