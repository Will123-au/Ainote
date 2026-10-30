# Ainote 后端：Docker 部署（局域网 + Tailscale）

这个文件夹让 Ainote（Note Companion）的后端在你的笔记本上用 Docker 运行。
Obsidian 插件可以从局域网或 Tailscale 连接它。

> 后端是 `packages/web`（Next.js）。自托管模式**不需要数据库，也不需要 Clerk 登录**。

## 1. 准备

- 笔记本装好 **Docker Desktop**（Windows/Mac）或 **Docker Engine**（Linux）
- 至少 **4 GB 空闲内存**（第一次构建时 Next.js 需要）
- 一个 AI key（OpenAI 等），或者本机的 Ollama

## 2. 配置

```bash
git clone https://github.com/Will123-au/Ainote.git
cd Ainote/deploy
cp .env.example .env        # Windows: copy .env.example .env
```

打开 `.env`，至少改这两行：

| 变量 | 说明 |
|---|---|
| `SOLO_API_KEY` | API 密码。局域网/Tailscale 上的人都能访问端口，**一定要设**。 |
| `OPENAI_API_KEY` | 你的 AI key（用 Ollama 就写 `ollama`） |

生成随机密码：

```bash
openssl rand -hex 24
```

## 3. 启动

```bash
docker compose up -d --build
```

第一次构建要 10–20 分钟。之后检查：

```bash
docker compose ps                 # STATUS 应该是 healthy
curl -H "Authorization: Bearer 你的SOLO_API_KEY" http://localhost:3000/api/health
# 返回 {"status":"ok"}
```

## 4. 访问方式

### A. 局域网

用笔记本的局域网 IP：`http://192.168.x.x:3000`

- Windows 查 IP：`ipconfig`；Mac/Linux：`ip a` 或 `ifconfig`
- 建议在路由器里给笔记本**固定 IP**（DHCP 保留）
- Windows 如果连不上：允许 Docker Desktop 通过防火墙（专用网络），或放行 TCP 3000

### B. Tailscale —— 方法 1（推荐，最简单）

笔记本本身已经装了 Tailscale，就**不用改任何东西**。Docker 端口在所有网卡上监听，包括 Tailscale：

- `http://<笔记本名字>:3000`（开了 MagicDNS）
- 或 `http://100.x.x.x:3000`（`tailscale ip -4` 查看）

流量在 Tailscale 隧道里已经加密，用 http 没问题。

### C. Tailscale —— 方法 2（独立节点 + HTTPS）

想要一个独立的名字和真正的 HTTPS 证书，比如 `https://ainote.xxxx.ts.net`：

1. Tailscale 后台 → **DNS** → 打开 **MagicDNS** 和 **HTTPS Certificates**
2. **Settings → Keys** → 生成 auth key，填到 `.env` 的 `TS_AUTHKEY`
3. 启动：
   ```bash
   docker compose --profile tailscale up -d --build
   ```
4. 地址：`https://ainote.<你的tailnet>.ts.net`（第一次访问申请证书，要等几秒）

> 第一次登录后状态保存在 volume 里，auth key 过期也不影响。

## 5. 设置 Obsidian 插件

Settings → Note Companion：

1. **License key / API key** 填 `SOLO_API_KEY` 的值
2. Advanced → 打开 **Self-hosting mode**
3. **Server URL** 填上面任一地址（结尾不要 `/`）
4. 点 **Test Connection**

## 6. 用本机 Ollama（可选）

`.env` 里：

```env
OPENAI_API_KEY=ollama
OPENAI_API_BASE=http://host.docker.internal:11434/v1
```

Linux 上 Ollama 要监听所有网卡：`OLLAMA_HOST=0.0.0.0`。

## 7. 日常命令

| 做什么 | 命令 |
|---|---|
| 看日志 | `docker compose logs -f ainote` |
| 停止 | `docker compose down` |
| 改了 `.env` 后重启 | `docker compose up -d` |
| 更新代码 | `git pull && docker compose up -d --build` |
| 清理旧镜像 | `docker image prune` |

`restart: unless-stopped` 已设置：Docker 启动后服务会自动运行。Windows 上记得打开 Docker Desktop 的 "Start when you sign in"。

## 8. 常见问题

- **401 Unauthorized**：插件里的 key 和 `SOLO_API_KEY` 不一样。
- **构建时内存不足**：Docker Desktop → Settings → Resources，内存调到 6 GB 以上。
- **笔记本睡眠后连不上**：服务器用途的笔记本请关闭自动睡眠（接电源时）。
- **不要**把 3000 端口在路由器上转发到公网。外部访问只用 Tailscale。
