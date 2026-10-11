import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    // Each tab keeps its own scroll position (TabHost), so the router doesn't restore scroll.
    scrollRestoration: false,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
