import { useEffect, useState } from "react";

export function useStoreVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const h = () => setV((x) => x + 1);
    window.addEventListener("swd:change", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("swd:change", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return v;
}
