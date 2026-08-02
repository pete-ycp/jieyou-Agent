import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      navigate(params.get("from") || "/", { replace: true });
    },
    onError: (e) => setError(e.message),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    login.mutate({ username, password });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>解忧杂货店 · 登录</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={login.isPending}
            >
              {login.isPending ? "登录中…" : "登录"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            还没有账号？
            <Link to="/register" className="underline">
              去注册
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}