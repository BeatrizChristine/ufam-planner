"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string;
  searchText?: string;
};

type SearchableSelectProps = {
  ariaLabel?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  searchable?: boolean;
};

type MenuGeometry = {
  left: number;
  top: number;
  width: number;
  listHeight: number;
  placement: "top" | "bottom";
};

const MENU_GAP = 8;
const VIEWPORT_MARGIN = 12;
const SEARCH_AREA_HEIGHT = 96;
const EMPTY_LIST_HEIGHT = 92;
const OPTION_HEIGHT = 56;
const LIST_PADDING = 16;
const MAX_LIST_HEIGHT = 256;

function measureMenu(element: HTMLDivElement | null, searchable: boolean, optionCount: number): MenuGeometry | null {
  if (!element || typeof window === "undefined") return null;

  const rect = element.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN - MENU_GAP;
  const spaceAbove = rect.top - VIEWPORT_MARGIN - MENU_GAP;
  const desiredListHeight = optionCount === 0
    ? EMPTY_LIST_HEIGHT
    : Math.min(MAX_LIST_HEIGHT, optionCount * OPTION_HEIGHT + LIST_PADDING);
  const chromeHeight = searchable ? SEARCH_AREA_HEIGHT : 0;
  const requiredHeight = desiredListHeight + chromeHeight;
  const placement = spaceBelow >= Math.min(requiredHeight, 260) || spaceBelow >= spaceAbove ? "bottom" : "top";
  const available = placement === "bottom" ? spaceBelow : spaceAbove;
  const listHeight = Math.max(48, Math.min(desiredListHeight, available - chromeHeight));
  const menuHeight = listHeight + chromeHeight;

  return {
    left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - rect.width - VIEWPORT_MARGIN)),
    top: placement === "bottom" ? rect.bottom + MENU_GAP : rect.top - MENU_GAP - menuHeight,
    width: Math.min(rect.width, window.innerWidth - VIEWPORT_MARGIN * 2),
    listHeight,
    placement,
  };
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function optionMatches(option: SelectOption, query: string) {
  const term = normalize(query.trim());
  if (!term) return true;
  return normalize(
    option.searchText ?? `${option.label} ${option.description ?? ""} ${option.keywords ?? ""}`,
  ).includes(term);
}

export function SearchableSelect({
  ariaLabel,
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder = "Buscar por nome ou código...",
  emptyMessage = "Nenhuma opção encontrada.",
  disabled = false,
  searchable = true,
}: SearchableSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [menuGeometry, setMenuGeometry] = useState<MenuGeometry | null>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    return options.filter((option) => optionMatches(option, query));
  }, [options, query]);

  useEffect(() => {
    function closeWhenClickingOutside(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", closeWhenClickingOutside);
    return () => document.removeEventListener("pointerdown", closeWhenClickingOutside);
  }, []);

  useEffect(() => {
    if (open && searchable && menuGeometry) searchRef.current?.focus();
  }, [open, searchable, menuGeometry]);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      setMenuGeometry(measureMenu(rootRef.current, searchable, filteredOptions.length));
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [filteredOptions.length, open, searchable]);

  function showMenu() {
    if (disabled) return;
    setPortalTarget(rootRef.current?.closest('[role="dialog"]') ?? document.body);
    setMenuGeometry(measureMenu(rootRef.current, searchable, filteredOptions.length));
    setActiveIndex(0);
    setOpen(true);
  }

  function hideMenu() {
    setOpen(false);
    setQuery("");
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setActiveIndex(0);
    const nextCount = options.filter((option) => optionMatches(option, nextQuery)).length;
    setMenuGeometry(measureMenu(rootRef.current, searchable, nextCount));
  }

  function choose(option: SelectOption) {
    onChange(option.value);
    hideMenu();
    setActiveIndex(0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      hideMenu();
      rootRef.current?.querySelector("button")?.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) showMenu();
      else setActiveIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter" && open && filteredOptions[activeIndex]) {
      event.preventDefault();
      choose(filteredOptions[activeIndex]);
    }
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        onClick={() => {
          if (open) hideMenu();
          else showMenu();
        }}
        className={`flex min-h-12 w-full items-center gap-3 rounded-xl border bg-white px-4 py-2.5 text-left text-sm outline-none transition ${
          open ? "border-emerald-600 ring-4 ring-emerald-50" : "border-slate-200 hover:border-emerald-300"
        } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate font-semibold text-slate-800">{selected.label}</span>
              {selected.description && <span className="mt-0.5 block truncate text-[11px] text-slate-400">{selected.description}</span>}
            </>
          ) : <span className="text-slate-400">{placeholder}</span>}
        </span>
        <ChevronDown size={17} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180 text-emerald-700" : ""}`} />
      </button>

      {open && !disabled && menuGeometry && portalTarget && createPortal(
        <div
          ref={menuRef}
          data-placement={menuGeometry.placement}
          className="fixed z-[100] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_55px_-18px_rgba(15,23,42,0.28)]"
          style={{ left: menuGeometry.left, top: menuGeometry.top, width: menuGeometry.width }}
        >
          {searchable && (
            <div className="border-b border-slate-100 p-3">
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-100 focus-within:ring-emerald-200">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
                {query && <button type="button" onClick={() => updateQuery("")} className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Limpar busca"><X size={14} /></button>}
              </div>
              <p className="mt-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{filteredOptions.length} {filteredOptions.length === 1 ? "resultado" : "resultados"}</p>
            </div>
          )}

          <div id={listboxId} role="listbox" style={{ maxHeight: menuGeometry.listHeight }} className="overflow-y-auto overscroll-contain p-2 [scrollbar-color:#94a3b8_transparent] [scrollbar-width:thin]">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center"><Search className="mx-auto text-slate-300" size={23} /><p className="mt-2 text-xs font-semibold text-slate-500">{emptyMessage}</p></div>
            ) : filteredOptions.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    isSelected ? "bg-emerald-700 text-white" : isActive ? "bg-emerald-50 text-emerald-950" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{option.label}</span>
                    {option.description && <span className={`mt-0.5 block truncate text-[11px] ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>{option.description}</span>}
                  </span>
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full ${isSelected ? "bg-white/15" : "text-transparent"}`}><Check size={14} /></span>
                </button>
              );
            })}
          </div>
        </div>,
          portalTarget,
      )}
    </div>
  );
}
