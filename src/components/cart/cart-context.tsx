"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import type { ProductArt } from "@/db/schema";
import { MAX_QUANTITY, totals } from "@/lib/pricing";

export type CartOption = { optionId: number; valueId: number; name: string; value: string };

export type CartLine = {
  /** Identity of the configuration: product + variant + personalization. */
  id: string;
  productId: number;
  slug: string;
  name: string;
  art: ProductArt;
  variantKey: string;
  options: CartOption[];
  personalization: string | null;
  unitPriceCents: number;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  /** Sent with checkout so a resubmission can never create a second order. */
  checkoutToken: string;
  hydrated: boolean;
};

type Action =
  | { type: "hydrate"; state: Omit<CartState, "hydrated"> }
  | { type: "add"; line: Omit<CartLine, "id" | "quantity">; quantity: number }
  | { type: "setQuantity"; id: string; quantity: number }
  | { type: "remove"; id: string }
  | { type: "clear" }
  | { type: "updatePrices"; prices: Record<string, number> };

const STORAGE_KEY = "fernhollow.cart.v1";

export function lineIdFor(productId: number, variantKey: string, personalization: string | null) {
  return `${productId}:${variantKey}:${personalization ?? ""}`;
}

function newToken() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clampQuantity(q: number) {
  return Math.max(1, Math.min(MAX_QUANTITY, Math.floor(q)));
}

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "hydrate":
      return { ...action.state, hydrated: true };
    case "add": {
      const id = lineIdFor(action.line.productId, action.line.variantKey, action.line.personalization);
      const existing = state.lines.find((l) => l.id === id);
      // Identical configurations combine into one line; different ones stay separate.
      const lines = existing
        ? state.lines.map((l) =>
            l.id === id ? { ...l, unitPriceCents: action.line.unitPriceCents, quantity: clampQuantity(l.quantity + action.quantity) } : l,
          )
        : [...state.lines, { ...action.line, id, quantity: clampQuantity(action.quantity) }];
      return { ...state, lines };
    }
    case "setQuantity":
      return {
        ...state,
        lines: state.lines.map((l) => (l.id === action.id ? { ...l, quantity: clampQuantity(action.quantity) } : l)),
      };
    case "remove":
      return { ...state, lines: state.lines.filter((l) => l.id !== action.id) };
    case "clear":
      return { lines: [], checkoutToken: newToken(), hydrated: true };
    case "updatePrices":
      return {
        ...state,
        lines: state.lines.map((l) => (action.prices[l.id] !== undefined ? { ...l, unitPriceCents: action.prices[l.id] } : l)),
      };
  }
}

type CartContextValue = {
  lines: CartLine[];
  hydrated: boolean;
  checkoutToken: string;
  itemCount: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  addLine: (line: Omit<CartLine, "id" | "quantity">, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeLine: (id: string) => void;
  clear: () => void;
  updatePrices: (prices: Record<string, number>) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): Omit<CartState, "hydrated"> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.lines) || typeof parsed?.checkoutToken !== "string") return null;
    return { lines: parsed.lines, checkoutToken: parsed.checkoutToken };
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { lines: [], checkoutToken: "", hydrated: false });

  // Load the saved cart once on the client.
  useEffect(() => {
    dispatch({ type: "hydrate", state: readStorage() ?? { lines: [], checkoutToken: newToken() } });
  }, []);

  // Persist after every change.
  useEffect(() => {
    if (!state.hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines: state.lines, checkoutToken: state.checkoutToken }));
    } catch {
      // Storage can be unavailable (private mode); the cart still works for this visit.
    }
  }, [state]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const next = readStorage();
      if (next) dispatch({ type: "hydrate", state: next });
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addLine = useCallback((line: Omit<CartLine, "id" | "quantity">, quantity = 1) => dispatch({ type: "add", line, quantity }), []);
  const setQuantity = useCallback((id: string, quantity: number) => dispatch({ type: "setQuantity", id, quantity }), []);
  const removeLine = useCallback((id: string) => dispatch({ type: "remove", id }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);
  const updatePrices = useCallback((prices: Record<string, number>) => dispatch({ type: "updatePrices", prices }), []);

  const value = useMemo<CartContextValue>(() => {
    const t = totals(state.lines);
    return {
      lines: state.lines,
      hydrated: state.hydrated,
      checkoutToken: state.checkoutToken,
      itemCount: state.lines.reduce((n, l) => n + l.quantity, 0),
      ...t,
      addLine,
      setQuantity,
      removeLine,
      clear,
      updatePrices,
    };
  }, [state, addLine, setQuantity, removeLine, clear, updatePrices]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
