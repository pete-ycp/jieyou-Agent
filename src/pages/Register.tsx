import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const register = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      navigate(params.get("from") || "/", { replace: true });
    },
    onError: (e) => setError(e.message),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    register.mutate({ username, password, name: name || undefined });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>解忧杂货店 · 注册</CardTitle>
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
                placeholder="3-32 位，字母数字下划线短横线"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">昵称（选填）</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="写信时显示的笔名"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="至少 6 位"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={register.isPending}
            >
              {register.isPending ? "注册中…" : "注册并登录"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            已有账号？
            <Link to="/login" className="underline">
              去登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}