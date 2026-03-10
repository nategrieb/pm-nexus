import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import EngineersPage from "./pages/EngineersPage";
import EngineerDetailPage from "./pages/EngineerDetailPage";
import TicketsPage from "./pages/TicketsPage";
import SettingsPage from "./pages/SettingsPage";
import SprintPlanningPage from "./pages/SprintPlanningPage";
import RoadmapPage from "./pages/RoadmapPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/roadmap" element={<RoadmapPage />} />
              <Route path="/engineers" element={<EngineersPage />} />
              <Route path="/engineers/:id" element={<EngineerDetailPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/sprint-planning" element={<SprintPlanningPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
  );
}
