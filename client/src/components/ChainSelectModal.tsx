import React, { useEffect, useState } from "react";
import { Zap, Loader2, X, Copy, Check, LogOut } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { getWalletConnectionErrorMessage } from "@/lib/walletConnectionError";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  WalletWalletConnect,
  WalletTrust,
  WalletOkx,
  WalletSafe,
  ExchangeBitget,
  NetworkTron,
} from "@web3icons/react";

type ModalView = "chains" | "tron_wallets" | "tron_wc_qr";

const TRON_WALLET_OPTIONS_BASE = [
  {
    id: "walletconnect",
    name: "WalletConnect",
    subLabel: "Default (scan QR with Tron wallet app)",
    icon: <WalletWalletConnect className="w-6 h-6" variant="branded" />,
  },
  {
    id: "trust",
    name: "Trust Wallet",
    subLabel: "Mobile wallet",
    icon: <WalletTrust className="w-6 h-6" variant="branded" />,
  },
  {
    id: "safepal",
    name: "SafePal",
    subLabel: "Mobile wallet",
    icon: <WalletSafe className="w-6 h-6" variant="branded" />,
  },
  {
    id: "okx",
    name: "OKX Wallet",
    subLabel: "Mobile wallet",
    icon: <WalletOkx className="w-6 h-6" variant="branded" />,
  },
  {
    id: "bitget",
    name: "Bitget Wallet",
    subLabel: "Mobile wallet",
    icon: <ExchangeBitget className="w-6 h-6" variant="branded" />,
  },
];

export function ChainSelectModal() {
  const {
    isChainSelectOpen,
    setChainSelectOpen,
    isConnected,
    activeChain,
    address,
    connectTron,
    disconnect,
    tronWcUri,
  } = useWallet();

  const hasTronExtension =
    typeof window !== "undefined" && (!!(window as any).tronLink || !!(window as any).tronWeb);

  const tronWalletOptions = React.useMemo(() => {
    const options = [...TRON_WALLET_OPTIONS_BASE];
    if (hasTronExtension) {
      options.push({
        id: "extension",
        name: "Browser Extension (Optional)",
        subLabel: "Use TronLink extension on desktop",
        icon: <NetworkTron className="w-6 h-6" variant="branded" />,
      });
    }
    return options;
  }, [hasTronExtension]);

  const [view, setView] = useState<ModalView>("chains");
  const [connecting, setConnecting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeUri = view === "tron_wc_qr" ? tronWcUri : null;

  useEffect(() => {
    if (activeUri && view === "tron_wc_qr") {
      QRCode.toDataURL(activeUri, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
  }, [activeUri, view]);

  useEffect(() => {
    if (isChainSelectOpen) {
      setView("chains");
      setConnecting(false);
      setQrDataUrl(null);
      setCopied(false);
    }
  }, [isChainSelectOpen]);

  if (!isChainSelectOpen) return null;

  const handleClose = () => {
    setChainSelectOpen(false);
    setView("chains");
    setConnecting(false);
    setQrDataUrl(null);
    setCopied(false);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleTronExtensionConnect = async () => {
    setConnecting(true);
    try {
      await connectTron("tronlink");
      handleClose();
    } catch (err: any) {
      toast.error(getWalletConnectionErrorMessage(err));
      setConnecting(false);
    }
  };

  const handleTronWalletConnect = async () => {
    setConnecting(true);
    setView("tron_wc_qr");
    try {
      await connectTron("walletconnect");
      handleClose();
    } catch (err: any) {
      if (tronWcUri) {
        setConnecting(false);
      } else {
        toast.error(getWalletConnectionErrorMessage(err));
        setView("tron_wallets");
        setConnecting(false);
      }
    }
  };

  const handleTronWalletClick = (walletId: string) => {
    if (walletId === "extension") {
      handleTronExtensionConnect();
      return;
    }
    handleTronWalletConnect();
  };

  const handleCopyUri = async () => {
    const uri = activeUri;
    if (!uri) return;
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      toast.success("URI copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/80" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {view !== "chains" && (
              <button
                className="rounded-full p-1.5 hover:bg-white/10 transition text-white/60 hover:text-white"
                onClick={() => {
                  setView("chains");
                  setConnecting(false);
                  setQrDataUrl(null);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            )}
            <h2 className="text-xl font-bold text-white">
              {view === "chains" && (isConnected ? "Wallet" : "Connect Wallet")}
              {view === "tron_wallets" && "Tron Network"}
              {view === "tron_wc_qr" && "Scan QR Code"}
            </h2>
          </div>
          <button
            className="rounded-full p-2 hover:bg-white/10 transition text-white/60 hover:text-white"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {view === "chains" && (
          <div className="space-y-3">
            {isConnected && address && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${activeChain === "tron" ? "bg-red-500" : "bg-green-500"}`} />
                    <div>
                      <div className="text-sm font-medium text-white">
                        Connected to {activeChain === "tron" ? "TRON" : activeChain?.toUpperCase()}
                      </div>
                      <div className="text-xs text-white/50 font-mono">{formatAddress(address)}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    Disconnect
                  </button>
                </div>
              </div>
            )}

            <ChainButton
              label="Tron Network"
              subLabel="WalletConnect (default), Browser Extension (optional)"
              icon={<Zap className="w-6 h-6 text-red-500" />}
              onClick={() => setView("tron_wallets")}
              active={activeChain === "tron"}
            />
          </div>
        )}

        {view === "tron_wallets" && (
          <div className="space-y-3">
            <p className="text-xs text-white/40 uppercase tracking-wider font-medium px-1">
              Select a wallet to connect
            </p>

            {tronWalletOptions.map((wallet) => (
              <ChainButton
                key={wallet.id}
                label={wallet.name}
                subLabel={wallet.subLabel}
                icon={wallet.icon}
                onClick={() => handleTronWalletClick(wallet.id)}
              />
            ))}

            <p className="text-xs text-white/30 text-center mt-2">
              Choose browser extension or scan the QR code with your Tron-compatible wallet app.
            </p>
          </div>
        )}

        {view === "tron_wc_qr" && (
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-sm text-white/60 text-center">Scan with your Tron-compatible wallet</p>
            {tronWcUri && qrDataUrl ? (
              <div className="p-3 bg-white rounded-xl">
                <img src={qrDataUrl} alt="WalletConnect QR" className="w-56 h-56" />
              </div>
            ) : (
              <div className="w-56 h-56 flex items-center justify-center bg-white/5 rounded-xl">
                <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
              </div>
            )}
            {activeUri && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyUri}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-sm text-white/70"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy URI"}
                </button>
              </div>
            )}
            <p className="text-xs text-white/30 text-center">
              Supported: Trust Wallet, SafePal, OKX, Bitget and other Tron wallets
            </p>
          </div>
        )}

        {connecting && view !== "tron_wc_qr" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-white/70">Connecting...</p>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-white/40">
            By connecting your wallet, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChainButton(props: {
  label: string;
  subLabel: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
  active?: boolean;
}) {
  return (
    <button
      className={`w-full group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ${
        props.active
          ? "bg-primary/10 border-primary/50"
          : props.disabled
          ? "bg-white/[0.02] opacity-50 cursor-not-allowed border-white/10"
          : "bg-white/5 hover:bg-white/10 hover:border-primary/50 border-white/10"
      }`}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors flex items-center justify-center w-12 h-12">
          {props.icon}
        </div>
        <div className="flex-1">
          <div className="font-bold text-white group-hover:text-primary transition-colors">{props.label}</div>
          <div className="text-sm text-white/40">{props.subLabel}</div>
        </div>
        {props.active && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
            Connected
          </span>
        )}
        {props.badge && !props.active && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
            {props.badge}
          </span>
        )}
      </div>
    </button>
  );
}
