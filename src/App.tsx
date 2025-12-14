import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Groups from "./pages/Groups";
import Contacts from "./pages/Contacts";
import SmartLinks from "./pages/SmartLinks";
import SmartLinkAnalytics from "./pages/SmartLinkAnalytics";
import Messages from "./pages/Messages";
import Schedules from "./pages/Schedules";
import Campaigns from "./pages/Campaigns";
import CampaignDetails from "./pages/CampaignDetails";
import Settings from "./pages/Settings";
import LinkRedirect from "./pages/LinkRedirect";
import Onboarding from "./pages/Onboarding";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="gestor-grupos-theme" disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/smart-links" element={<SmartLinks />} />
            <Route path="/smart-links/analytics" element={<SmartLinkAnalytics />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/schedules" element={<Schedules />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignDetails />} />
            {/* Redirect old routes */}
            <Route path="/broadcast" element={<Navigate to="/messages" replace />} />
            <Route path="/schedule" element={<Navigate to="/schedules" replace />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/help" element={<Help />} />
            <Route path="/link/:slug" element={<LinkRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
