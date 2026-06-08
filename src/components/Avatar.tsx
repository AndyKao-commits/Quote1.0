import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PALETTE = [
  "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
  "bg-teal-500", "bg-sky-500", "bg-indigo-500", "bg-violet-500", "bg-pink-500",
];

function hashIdx(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % PALETTE.length;
}

export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar-url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function Avatar({
  name,
  path,
  size = 40,
  className,
}: {
  name?: string | null;
  path?: string | null;
  size?: number;
  className?: string;
}) {
  const { data: url } = useAvatarUrl(path);
  const letter = (name?.trim()?.[0] ?? "?").toUpperCase();
  const color = PALETTE[hashIdx(name ?? "?")];
  const style = { width: size, height: size, fontSize: Math.round(size * 0.45) };
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? "頭像"}
        style={style}
        className={`shrink-0 rounded-full object-cover ${className ?? ""}`}
      />
    );
  }
  return (
    <div
      style={style}
      className={`shrink-0 select-none rounded-full ${color} grid place-items-center font-bold text-white ${className ?? ""}`}
    >
      {letter}
    </div>
  );
}
