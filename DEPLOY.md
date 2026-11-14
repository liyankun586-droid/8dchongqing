# 部署说明

构建产物已经全部准备好。本目录可以直接作为静态站点根目录。

## 站点信息

- 域名：https://8dchongqing.cn
- 页面数：1522
- 语言：en / ja / ko / es / zh

## 三种部署方式（任选其一）

### 1. Cloudflare Pages（推荐）

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Upload assets
2. 项目名填 `8dchongqing`
3. 直接拖入本目录（dist）的内容
4. 绑定自定义域名 8dchongqing.cn

命令行（已装 wrangler 时）：
```bash
npx wrangler pages deploy . --project-name 8dchongqing
```

### 2. Netlify

```bash
npx netlify deploy --prod --dir=. --site=<你的 site id>
```

或拖拽本目录到 https://app.netlify.com/drop

### 3. GitHub Pages

```bash
git init
git add .
git commit -m "deploy"
git branch -M main
git remote add origin git@github.com:<你的账号>/<仓库名>.git
git push -u origin main
```

仓库设置 → Pages → Source 选 `main` 分支、`/root` 目录。
保存的 .nojekyll 文件让 Pages 不跑 Jekyll。

## 部署后必须检查

1. `https://<域名>/` 能打开，落地页正常
2. `https://<域名>/life/yuzhong-L6.html` 打开且有正文
3. `https://<域名>/sitemap.xml` 返回 200
4. `https://<域名>/robots.txt` 返回 200 且指向正确 sitemap
5. 用 Facebook / Twitter 的调试器贴 URL，确认 OG 图抓到了
   - https://developers.facebook.com/tools/debug/
   - https://cards-dev.twitter.com/validator
6. `https://<域名>/?lang=ja` 等 5 个语言版本正常
7. 分享链接能回放：`?s=<seed>&y=<year>&f=<floor>&c=<choices>`

## 环境变量

构建时可用 `SITE_URL` 覆盖域名：

```bash
SITE_URL=https://your-domain.com node tools/build_static.js
```
