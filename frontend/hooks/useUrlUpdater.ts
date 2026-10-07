import { useCallback, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { updateSearchParams } from "@/utils/updateSearchParams";

export function useUrlUpdater() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Alte Daten bleiben sichtbar, bis die neuen geladen sind – der Cursor zeigt den Ladevorgang.
  useEffect(() => {
    document.body.classList.toggle("cursor-progress", isPending);
    return () => document.body.classList.remove("cursor-progress");
  }, [isPending]);

  const updateUrl = useCallback(
    (updates: { [key: string]: string | boolean | string[] | undefined }) => {
      const queryString = updateSearchParams(searchParams, updates);

      if (
        searchParams.toString().includes("tv_channel") &&
        updates["show"] !== undefined
      ) {
        const paramsWithoutChannel = new URLSearchParams(
          searchParams.toString()
        );
        paramsWithoutChannel.delete("tv_channel");
        const updatedQueryString = updateSearchParams(
          paramsWithoutChannel,
          updates
        );
        const newUrlWithChannelRemoved = updatedQueryString
          ? `${pathname}${updatedQueryString}`
          : pathname;
        startTransition(() => {
          router.push(newUrlWithChannelRemoved, { scroll: false });
        });
        return;
      }
      const newUrl = queryString ? `${pathname}${queryString}` : pathname;

      startTransition(() => {
        router.push(newUrl, { scroll: false });
      });
    },
    [searchParams, router, pathname]
  );

  return updateUrl;
}
