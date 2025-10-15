import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Polittalk Watcher",
    short_name: "Polittalk",
    description: "An application for monitoring political discussions",
    start_url: "/",
    display: "standalone",
    background_color: "#fff",
    theme_color: "#fff",
    icons: [
      {
        src: "/transparent_logo.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
