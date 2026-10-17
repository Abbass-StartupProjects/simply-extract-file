import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const App = lazy(() => import("@/App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Launchrocket — Find Customers Worldwide" },
      { name: "description", content: "Discover the best growth channels and showcase your startup to early adopters worldwide." },
      { property: "og:title", content: "Launchrocket — Find Customers Worldwide" },
      { property: "og:description", content: "Discover the best growth channels and showcase your startup to early adopters worldwide." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  );
}
