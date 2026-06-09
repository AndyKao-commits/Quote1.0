import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyMembership } from "@/lib/membership.functions";

export function useMembership() {
  const fn = useServerFn(getMyMembership);
  return useQuery({
    queryKey: ["my-membership"],
    queryFn: () => fn({}),
    staleTime: 60 * 1000,
  });
}
