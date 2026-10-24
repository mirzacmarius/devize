"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// The address the page's server saw the client come from, kept for the
// accept dialog as evidence of the signature. The server reads it under
// Suspense (page.tsx), so the page itself still opens at once (ADR 0029).

type AddressContext = {
  address: string | undefined;
  setAddress: (address: string | undefined) => void;
};

const Context = createContext<AddressContext>({
  address: undefined,
  setAddress: () => undefined,
});

export function AddressProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string>();
  const value = useMemo(() => ({ address, setAddress }), [address]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Rendered by the server with the request's address; shows nothing. */
export function AddressValue({ address }: { address?: string }) {
  const { setAddress } = useContext(Context);
  useEffect(() => {
    setAddress(address);
  }, [address, setAddress]);
  return null;
}

/** The address the client came from, once the server has said. */
export function useAddress() {
  return useContext(Context).address;
}
