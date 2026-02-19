import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { DemoTradingProvider } from "./contexts/DemoTradingContext";
import { WalletProvider } from "./contexts/WalletContext";
import { WagmiProvider } from 'wagmi';
import { config } from './config/wagmi';
import Home from "./pages/Home";
import Trade from "./pages/Trade";
import Dashboard from "./pages/Dashboard";
import Points from "./pages/Points";
import Referral from "./pages/Referral";
import Stats from "./pages/Stats";
import Rewards from "./pages/Rewards";
import Stake from "./pages/Stake";
import Earn from "./pages/Earn";
import Airdrop from "./pages/Airdrop";
import Feedback from "./pages/Feedback";
import VIP from "./pages/VIP";
import API from "./pages/API";
import Docs from "./pages/Docs";
import Blog from "./pages/Blog";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AdminBridge from "./pages/AdminBridge";
import AdminBridgeWithdraw from "./pages/AdminBridgeWithdraw";
import { useReferralAutoApply } from "./hooks/useReferralAutoApply";
import { useAdminBridge } from "./hooks/useAdminBridge";
import { ChainSelectModal } from "./components/ChainSelectModal";

const APP_MODE = import.meta.env.VITE_APP_MODE === "admin" ? "admin" : "front";

// Global component that runs referral auto-apply logic
function ReferralAutoApply() {
  useReferralAutoApply();
  return null;
}

function AdminBridgeSync() {
  const [location] = useLocation();
  const enabled = APP_MODE === "front" && !location.startsWith("/admin-bridge");
  useAdminBridge(enabled);
  return null;
}

function FrontRouter() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/trade"} component={Trade} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/points"} component={Points} />
      <Route path={"/referral"} component={Referral} />
      <Route path={"/stats"} component={Stats} />
      <Route path={"/rewards"} component={Rewards} />
      <Route path={"/stake"} component={Stake} />
      <Route path={"/earn"} component={Earn} />
      <Route path={"/airdrop"} component={Airdrop} />
      <Route path={"/feedback"} component={Feedback} />
      <Route path={"/vip"} component={VIP} />
      <Route path={"/api"} component={API} />
      <Route path={"/docs"} component={Docs} />
      <Route path={"/blog"} component={Blog} />
      <Route path={"/privacy-policy"} component={PrivacyPolicy} />
      <Route path={"/terms-of-service"} component={TermsOfService} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AdminRouter() {
  return (
    <Switch>
      <Route path={"/"} component={AdminBridge} />
      <Route path={"/withdraw"} component={AdminBridgeWithdraw} />
      <Route path={"/admin-bridge"} component={AdminBridge} />
      <Route path={"/admin-bridge/withdraw"} component={AdminBridgeWithdraw} />
      <Route component={AdminBridge} />
    </Switch>
  );
}

function Router() {
  return APP_MODE === "admin" ? <AdminRouter /> : <FrontRouter />;
}

// App component - QueryClientProvider is provided by main.tsx
function App() {
  return (
    <ErrorBoundary>
      <WagmiProvider config={config} reconnectOnMount={false}>
        <ThemeProvider
          defaultTheme="dark"
          // switchable
        >
          <LanguageProvider>
            <DemoTradingProvider>
              <WalletProvider>
                <TooltipProvider>
                  <Toaster />
                  {APP_MODE === "front" && (
                    <>
                      <ReferralAutoApply />
                      <AdminBridgeSync />
                      <ChainSelectModal />
                    </>
                  )}
                  <Router />
                </TooltipProvider>
              </WalletProvider>
            </DemoTradingProvider>
          </LanguageProvider>
        </ThemeProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;
