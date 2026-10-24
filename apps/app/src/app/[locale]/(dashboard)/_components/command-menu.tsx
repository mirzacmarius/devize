"use client";

import { api } from "@devize/backend/convex/_generated/api";
import type { Doc } from "@devize/backend/convex/_generated/dataModel";
import { normalizeText } from "@devize/backend/convex/lib/text";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@devize/ui/dialog";
import { Icons } from "@devize/ui/icons";
import { cn } from "@devize/ui/utils";
import { useQuery } from "convex/react";
import {
  CornerDownLeft,
  type LucideIcon,
  Monitor,
  Moon,
  Plus,
  Search,
  Sun,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { EstimateStatusPill } from "@/components/estimate-status";
import { useFirm } from "@/components/firm-provider";
import { InvoiceStatusPill } from "@/components/invoice-status";
import { estimateCode, formatMoney } from "@/lib/format";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { ClientSheet } from "../clients/_components/client-sheet";
import { NewEstimateDialog } from "../estimates/_components/new-estimate-dialog";

/** What the menu opens in place: a new Deviz, or a client's sheet. */
type Panel =
  | { kind: "estimate" }
  | { kind: "client"; client: Doc<"clients"> | null };

const OpenContext = createContext<() => void>(() => {});

/** Opens the search menu, as Ctrl+K does. */
export function useOpenCommandMenu() {
  return useContext(OpenContext);
}

/**
 * The search menu: Ctrl+K (⌘K on a Mac) from any page of the app jumps to a
 * Deviz, a client, an invoice, a norm or a page, or starts something new.
 */
export function CommandMenuProvider({
  isSuperAdmin = false,
  children,
}: {
  isSuperAdmin?: boolean;
  children: ReactNode;
}) {
  const t = useScopedI18n("commandMenu");
  const tc = useScopedI18n("common");
  const [open, setOpen] = useState(false);
  // The panel stays set while it closes, so it doesn't change as it slides out.
  const [panel, setPanel] = useState<Panel>({ kind: "estimate" });
  const [panelOpen, setPanelOpen] = useState(false);
  const openMenu = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const openPanel = useCallback((next: Panel) => {
    setOpen(false);
    setPanel(next);
    setPanelOpen(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLowerCase() !== "k"
      ) {
        return;
      }
      event.preventDefault();
      // Not over another dialog or sheet, whose form would lose its focus.
      const other = document.querySelector(
        '[role="dialog"][data-state="open"]:not([data-command-menu]), [role="alertdialog"][data-state="open"]',
      );
      if (!other) {
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <OpenContext.Provider value={openMenu}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          data-command-menu
          closeLabel={tc("close")}
          className="top-[12vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
        >
          <DialogTitle className="sr-only">{t("title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("description")}
          </DialogDescription>
          {open && (
            <CommandSearch
              isSuperAdmin={isSuperAdmin}
              onDone={close}
              onPanel={openPanel}
            />
          )}
        </DialogContent>
      </Dialog>
      <NewEstimateDialog
        open={panelOpen && panel.kind === "estimate"}
        onOpenChange={setPanelOpen}
      />
      <ClientSheet
        client={panel.kind === "client" ? panel.client : null}
        open={panelOpen && panel.kind === "client"}
        onOpenChange={setPanelOpen}
      />
    </OpenContext.Provider>
  );
}

const noSubscription = () => () => {};

/** "⌘K" on a Mac, "Ctrl K" elsewhere; "Ctrl K" while rendering on the server. */
export function useShortcutLabel() {
  const mac = useSyncExternalStore(
    noSubscription,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );
  return mac ? "⌘K" : "Ctrl K";
}

/** The sidebar's search button, which looks like a field and opens the menu. */
export function CommandMenuButton({ onOpen }: { onOpen?: () => void }) {
  const t = useScopedI18n("commandMenu");
  const open = useOpenCommandMenu();
  const shortcut = useShortcutLabel();
  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        open();
      }}
      aria-keyshortcuts="Control+K Meta+K"
      className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 text-left text-meta text-ink-3 transition-colors hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Search aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{t("button")}</span>
      <kbd className="rounded border border-border bg-sunken px-1.5 font-sans text-[11px] leading-5 text-ink-3">
        {shortcut}
      </kbd>
    </button>
  );
}

type Group =
  | "recent"
  | "estimates"
  | "clients"
  | "invoices"
  | "norms"
  | "actions"
  | "pages";

type Entry = {
  id: string;
  group: Group;
  icon: LucideIcon;
  label: string;
  meta?: string;
  pill?: ReactNode;
  /** A page to open; prefetched while the entry is chosen. */
  href?: string;
  run: () => void;
};

/** Every word typed starts a word of the label or of its other names. */
function matches(query: string, ...texts: string[]) {
  const words = normalizeText(texts.join(" ")).split(" ");
  return normalizeText(query)
    .split(" ")
    .every((part) => words.some((word) => word.startsWith(part)));
}

function CommandSearch({
  isSuperAdmin,
  onDone,
  onPanel,
}: {
  isSuperAdmin: boolean;
  onDone: () => void;
  onPanel: (panel: Panel) => void;
}) {
  const t = useScopedI18n("commandMenu");
  const tn = useScopedI18n("navigation");
  const ts = useScopedI18n("settings");
  const tt = useScopedI18n("theme");
  const tClients = useScopedI18n("clients");
  const locale = useCurrentLocale();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { firm } = useFirm();
  const listId = useId();
  const [text, setText] = useState("");
  const query = useDeferredValue(text.trim());
  const live = useQuery(api.search.everywhere.find, {
    organizationId: firm._id,
    text: query,
  });
  // The last results stay while the next ones load, so the list doesn't jump.
  const [found, setFound] = useState(live);
  if (live !== undefined && live !== found) {
    setFound(live);
  }
  const [activeId, setActiveId] = useState<string>();

  const entries = useMemo((): Entry[] => {
    const go = (href: string) => () => {
      onDone();
      router.push(href);
    };
    const page = (
      id: string,
      href: string,
      icon: LucideIcon,
      label: string,
    ): Entry => ({ id, group: "pages", icon, label, href, run: go(href) });
    const actions: (Entry & { keywords: string })[] = [
      {
        id: "action:estimate",
        group: "actions",
        icon: Plus,
        label: t("actions.newEstimate"),
        keywords: t("keywords.newEstimate"),
        run: () => onPanel({ kind: "estimate" }),
      },
      {
        id: "action:client",
        group: "actions",
        icon: Plus,
        label: t("actions.newClient"),
        keywords: t("keywords.newClient"),
        run: () => onPanel({ kind: "client", client: null }),
      },
      {
        id: "action:norm",
        group: "actions",
        icon: Plus,
        label: t("actions.newNorm"),
        keywords: t("keywords.newNorm"),
        href: "/catalog/new",
        run: go("/catalog/new"),
      },
    ];
    const pages = [
      page("page:home", "/", Icons.Home, tn("home")),
      page("page:estimates", "/estimates", Icons.Deviz, tn("estimates")),
      page("page:catalog", "/catalog", Icons.Catalog, tn("catalog")),
      page("page:clients", "/clients", Icons.Clients, tn("clients")),
      page("page:invoices", "/invoices", Icons.Invoice, tn("invoices")),
      page("page:rates", "/rates", Icons.Rates, tn("rates")),
      page("page:prices", "/prices", Icons.Prices, tn("prices")),
      ...(firm.manufacturerId
        ? [
            page(
              "page:producer",
              `/producers/${firm.manufacturerId}`,
              Icons.Producers,
              tn("producerProfile"),
            ),
          ]
        : []),
      page("page:settings", "/settings", Icons.Settings, tn("settings")),
      ...(isSuperAdmin
        ? [page("page:admin", "/admin", Icons.Admin, tn("admin"))]
        : []),
    ];
    // Found when asked for; the empty menu is for getting around.
    const themes = (["light", "dark", "system"] as const).map(
      (theme): Entry & { keywords: string } => ({
        id: `theme:${theme}`,
        group: "actions",
        icon: { light: Sun, dark: Moon, system: Monitor }[theme],
        label: t("actions.theme", { theme: tt(theme) }),
        keywords: t("keywords.theme"),
        run: () => {
          setTheme(theme);
          onDone();
        },
      }),
    );
    const settingsTabs = (
      [
        ["firm", "/settings/firm"],
        ["members", "/settings/members"],
        ["billing", "/settings/billing"],
      ] as const
    ).map(([tab, href]) =>
      page(
        `page:settings-${tab}`,
        href,
        Icons.Settings,
        t("settingsPage", { tab: ts(`tabs.${tab}`) }),
      ),
    );

    const money = (value: number) => `${formatMoney(value, locale)} lei`;
    const estimates: Entry[] = (found?.estimates ?? []).map((estimate) => {
      const href = `/estimates/${estimate._id}`;
      return {
        id: `estimate:${estimate._id}`,
        group: query ? "estimates" : "recent",
        icon: Icons.Deviz,
        label: estimate.title,
        meta: [
          estimateCode(estimate.number, estimate.revision),
          estimate.clientName,
          money(estimate.total),
        ]
          .filter(Boolean)
          .join(" · "),
        pill: <EstimateStatusPill status={estimate.status} />,
        href,
        run: go(href),
      };
    });
    if (!query) {
      return [...estimates, ...actions, ...pages];
    }
    const clients: Entry[] = (found?.clients ?? []).map((client) => ({
      id: `client:${client._id}`,
      group: "clients",
      icon: Icons.Clients,
      label: client.name,
      meta: [tClients(`kinds.${client.kind}`), client.cui, client.email]
        .filter(Boolean)
        .join(" · "),
      run: () => onPanel({ kind: "client", client }),
    }));
    const invoices: Entry[] = (found?.invoices ?? []).map((invoice) => {
      const href = `/invoices/${invoice._id}`;
      return {
        id: `invoice:${invoice._id}`,
        group: "invoices",
        icon: Icons.Invoice,
        label: t("invoice", { code: invoice.code }),
        meta: [invoice.buyerName, money(invoice.total)].join(" · "),
        pill: <InvoiceStatusPill status={invoice.status} />,
        href,
        run: go(href),
      };
    });
    const norms: Entry[] = (found?.norms ?? []).map((norm) => {
      const href = `/catalog/${norm._id}`;
      return {
        id: `norm:${norm._id}`,
        group: "norms",
        icon: Icons.Catalog,
        label: norm.title,
        meta: [norm.code, norm.unit, norm.own ? t("ownNorm") : undefined]
          .filter(Boolean)
          .join(" · "),
        href,
        run: go(href),
      };
    });
    return [
      ...estimates,
      ...clients,
      ...invoices,
      ...norms,
      ...[...actions, ...themes].filter((entry) =>
        matches(query, entry.label, entry.keywords),
      ),
      ...[...pages, ...settingsTabs].filter((entry) =>
        matches(query, entry.label),
      ),
    ];
  }, [
    found,
    query,
    firm.manufacturerId,
    isSuperAdmin,
    locale,
    onDone,
    onPanel,
    router,
    setTheme,
    t,
    tn,
    ts,
    tt,
    tClients,
  ]);

  const active = entries.find((entry) => entry.id === activeId) ?? entries[0];
  const optionId = (entry: Entry) => `${listId}-${entry.id}`;

  // The chosen entry stays in sight, and its page is ready to open at once.
  const activeOption = active ? optionId(active) : undefined;
  const activeHref = active?.href;
  useEffect(() => {
    if (activeOption) {
      document
        .getElementById(activeOption)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [activeOption]);
  useEffect(() => {
    if (activeHref) {
      router.prefetch(activeHref);
    }
  }, [activeHref, router]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (entries.length === 0) {
      return;
    }
    const index = active ? entries.indexOf(active) : 0;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = entries[(index + step + entries.length) % entries.length];
      setActiveId(next?.id);
    } else if (event.key === "Enter" && active) {
      event.preventDefault();
      active.run();
    }
  };

  const groups = entries.reduce<{ group: Group; entries: Entry[] }[]>(
    (list, entry) => {
      const last = list.at(-1);
      if (last?.group === entry.group) {
        last.entries.push(entry);
      } else {
        list.push({ group: entry.group, entries: [entry] });
      }
      return list;
    },
    [],
  );

  return (
    <div className="grid">
      <div className="flex items-center gap-2 border-b border-border px-4">
        <Search aria-hidden className="size-4 shrink-0 text-ink-3" />
        <input
          // biome-ignore lint/a11y/noAutofocus: the menu exists to be typed in
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption}
          aria-label={t("title")}
          placeholder={t("placeholder")}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setActiveId(undefined);
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          className="h-12 min-w-0 flex-1 bg-transparent pr-8 text-body text-ink outline-none placeholder:text-ink-3"
        />
      </div>
      <div
        id={listId}
        role="listbox"
        aria-label={t("results")}
        className="max-h-[min(60vh,28rem)] overflow-y-auto p-2"
      >
        {groups.map(({ group, entries: inGroup }) => (
          // biome-ignore lint/a11y/useSemanticElements: a listbox groups its options with role="group"; a fieldset groups form fields
          <div
            key={group}
            role="group"
            aria-labelledby={`${listId}-${group}`}
            className="pb-1"
          >
            <div
              id={`${listId}-${group}`}
              className="px-2 pb-1 pt-2 text-label uppercase text-ink-3"
            >
              {t(`groups.${group}`)}
            </div>
            {inGroup.map((entry) => {
              const selected = entry === active;
              const Icon = entry.icon;
              return (
                // biome-ignore lint/a11y/useKeyWithClickEvents: the input above handles the keys, as a combobox does
                <div
                  key={entry.id}
                  id={optionId(entry)}
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onClick={entry.run}
                  onMouseMove={() => !selected && setActiveId(entry.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2",
                    selected ? "bg-sunken text-ink" : "text-ink-2",
                  )}
                >
                  <Icon aria-hidden className="size-4 shrink-0 text-ink-3" />
                  <div className="grid min-w-0 flex-1">
                    <span className="truncate text-body">{entry.label}</span>
                    {entry.meta && (
                      <span className="truncate text-meta text-ink-3">
                        {entry.meta}
                      </span>
                    )}
                  </div>
                  {entry.pill}
                  {selected && (
                    <CornerDownLeft
                      aria-hidden
                      className="size-4 shrink-0 text-ink-3"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {entries.length === 0 && (
          <p className="m-0 px-2 py-6 text-center text-meta text-ink-3">
            {live === undefined ? t("searching") : t("nothing", { text })}
          </p>
        )}
      </div>
      <p className="m-0 hidden border-t border-border px-4 py-2 text-meta text-ink-3 sm:block">
        {t("hints")}
      </p>
    </div>
  );
}
