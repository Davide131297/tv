"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { TV_CHANNEL } from "@/lib/utils";

export default function ChannelOptionsButtons() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selected = searchParams?.get("tv_channel") ?? "";

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.currentTarget.value;
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (value) {
      params.delete("show");
      params.set("tv_channel", value);
    } else {
      params.delete("tv_channel");
    }

    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.push(url);
  };

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">Sender:</label>
      <NativeSelect
        aria-label="Kanal auswählen"
        value={selected}
        onChange={onChange}
      >
        <NativeSelectOption value="">Alle Sender</NativeSelectOption>
        {TV_CHANNEL.map((channel) => (
          <NativeSelectOption key={channel} value={channel}>
            {channel}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
