import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pauta",
    short_name: "Pauta",
    description: "Gestão de demandas, aprovação e agendamento para agências.",
    start_url: "/app",
    display: "standalone",
    background_color: "#EBEADF",
    theme_color: "#0A1AFF",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
