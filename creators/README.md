# 创作者包 / Creator Pack

**A Date with Chongqing — THE 8D CITY**

一句话卖点：
> 一个网页人生模拟器。你选住几层，楼层决定你的一生。一次人生，不可重掷。

---

## 目录

| 文件 | 尺寸 | 用途 |
|---|---|---|
| `cq-logo-512.png` | 512×512 | 频道头像、水印、封面角标 |
| `cq-logo.svg` | 矢量 | 任意缩放、改色 |
| `cq-titlecard-1920x1080.png` | 1920×1080 | 片头卡、片尾卡、封面底图 |
| `cq-titlecard.svg` | 矢量 | 同上，可编辑 |
| `CREATOR-LICENSE.md` | — | **直播/录屏/变现授权条款（英文）** |
| `screenshots/` | — | 游戏截图（V1.1 场景层） |

## 怎么用

1. 读完 `CREATOR-LICENSE.md`（很短，核心是「随便用，可以变现，不用申请」）。
2. 下载 logo 和标题卡。
3. 录视频。
4. 描述里放游戏链接，标题里提一句「life simulator」。

## 授权条款要点

> **You are free to stream, record, and publish gameplay of A Date with Chongqing.
> Including on monetized channels. No permission needed. No revenue share.**

只要两件事：
1. 描述里放一个游戏链接
2. 叫它「a life simulator」

不需要申请、不需要等待、不分成。

## 视频建议（来自调研，不是我们自说自话）

1in8b 用同样的授权结构，在 19 天里拿到 **218 个视频、1450 万播放**。这是免费流量里最便宜的一条路。

录之前值得知道的三件事：
- **楼层是整个游戏的钩子。** 如果视频里没提楼层，多数观众会当成普通的数值堆人生模拟。一定要讲：你选了一个垂直层（L0 地下到 L7 塔楼），它改写你的通勤、健康、房租、关系和结局。住 24 楼，这辈子天天爬楼。
- **这是「不可重掷」的游戏。** 观众会想看第二局。可以直接告诉他们：每局是不同的人生，同一个 seed 完全可复现。
- **分享卡是可传播的产物。** 终局会生成一张「生命剖面图」——重庆的竖向剖面加一条人生轨迹折线。这张图本身就是封面素材。

## 面向尼日利亚 / 西非创作者的额外说明

调研确认（见 `docs/_research/海外发布渠道_尼日利亚.md`）：

- **X 和 YouTube 是主阵地。** 尼日利亚的 YouTube 创作者分成是**开放**的。
- **TikTok 创作者分成在尼日利亚不可用**（只有美英德日韩法墨巴 8 国），但 TikTok 仍是最大的触达面，适合种草不适合当主场。
- **游戏门户（Poki / CrazyGames / itch.io）不适合尼日利亚**——这些站的国别流量前五里没有尼日利亚。
- **西非特有的入口**：`indiegames.ng`（Naija Indie）和 `start.ng`。Lagos Life 就挂在 indiegames.ng 上，提交门槛只是一个表单。
- **1in8b 至今没有做非洲语言**（18 个语种里零个非洲语种）。这块是空的。

## 重新生成

```bash
cd p0 && node tools/build_creators.js
```

需要本机装 Chrome（用来把 SVG 转 PNG）。
