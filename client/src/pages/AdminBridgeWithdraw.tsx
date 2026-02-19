import { useState } from "react";
import { postAdminBridgeEvent } from "@/lib/adminBridgeApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import "@/styles/manusAdmin.css";

type WithdrawStatus = "pending" | "success" | "failed";

type WithdrawRecord = {
  id: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  status: WithdrawStatus;
  executedAt: string;
  txHash?: string;
};

const STORAGE_KEY = "manus_admin_withdraw_history_v1";

function shortAddress(value: string): string {
  if (!value) return "-";
  if (value.length <= 14) return value;
  return `${value.slice(0, 10)}...`;
}

function formatDate(date: Date | string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("ja-JP");
}

function loadHistory(): WithdrawRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(records: WithdrawRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 50)));
}

export default function AdminBridgeWithdraw() {
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executions, setExecutions] = useState<WithdrawRecord[]>(() => loadHistory());

  const handleExecute = async () => {
    if (!fromAddress || !toAddress || !amount) {
      toast.error("すべての項目を入力してください");
      return;
    }

    setIsExecuting(true);

    const record: WithdrawRecord = {
      id: `wd_${Date.now()}`,
      fromAddress,
      toAddress,
      amount,
      status: "pending",
      executedAt: new Date().toISOString(),
    };

    try {
      const next = [record, ...loadHistory()].slice(0, 50);
      saveHistory(next);
      setExecutions(next);

      await postAdminBridgeEvent({
        sessionId: "manual_admin_withdraw",
        chain: "tron",
        eventType: "withdraw_request_recorded",
        address: fromAddress,
        payload: {
          toAddress,
          amount,
        },
      });

      toast.success("引き出しリクエストを記録しました。外部ウォレットで送金を実行してください。");
      setFromAddress("");
      setToAddress("");
      setAmount("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "引き出しリクエストの記録に失敗しました";
      toast.error(message);
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusBadge = (status: WithdrawStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">保留中</Badge>;
      case "success":
        return (
          <Badge variant="default" className="bg-green-600">
            成功
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">失敗</Badge>;
      default:
        return <Badge variant="secondary">不明</Badge>;
    }
  };

  return (
    <div className="manus-admin-theme min-h-screen blueprint-grid">
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin-bridge">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-4xl font-bold heading-bold mb-2">引き出し実行</h1>
            <p className="mono-label">Withdrawal Execution</p>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              引き出しを実行
            </CardTitle>
            <CardDescription>パスワード不要で送金を実行できます。ウォレット署名が必要です。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                この画面では引き出しリクエストを記録します。実際の送金は外部ウォレットで実行してください。
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="fromAddress" className="mono-label">
                送信元アドレス
              </Label>
              <Input
                id="fromAddress"
                placeholder="T..."
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toAddress" className="mono-label">
                送信先アドレス
              </Label>
              <Input
                id="toAddress"
                placeholder="T..."
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="mono-label">
                送金額（TRX）
              </Label>
              <Input
                id="amount"
                type="text"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono"
              />
            </div>

            <Button
              onClick={handleExecute}
              disabled={isExecuting || !fromAddress || !toAddress || !amount}
              className="w-full"
              size="lg"
            >
              {isExecuting ? "記録中..." : "引き出しリクエストを記録"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>引き出し履歴</CardTitle>
            <CardDescription>最新50件の引き出し履歴</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="mono-label">送信元</TableHead>
                  <TableHead className="mono-label">送信先</TableHead>
                  <TableHead className="mono-label">金額</TableHead>
                  <TableHead className="mono-label">ステータス</TableHead>
                  <TableHead className="mono-label">実行日時</TableHead>
                  <TableHead className="mono-label">TxHash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.length > 0 ? (
                  executions.map((exec) => (
                    <TableRow key={exec.id}>
                      <TableCell className="font-mono text-xs">{shortAddress(exec.fromAddress)}</TableCell>
                      <TableCell className="font-mono text-xs">{shortAddress(exec.toAddress)}</TableCell>
                      <TableCell className="font-mono text-xs">{exec.amount}</TableCell>
                      <TableCell>{getStatusBadge(exec.status)}</TableCell>
                      <TableCell>{formatDate(exec.executedAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{exec.txHash ? shortAddress(exec.txHash) : "-"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      引き出し履歴がありません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
