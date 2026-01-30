# 🦎 Chameleon Chat

一个私密聊天信息加密工具，使用 React + TypeScript + Vite 构建。

## 功能特性

- 🔐 **端到端加密** - 使用 AES-GCM 加密算法保护消息
- 🎭 **动态转义表** - 将加密数据转换为 emoji 和中文字符，隐藏加密特征
- 🔑 **BIP39 助记词** - 使用标准助记词系统生成加密密钥
- ⏰ **时间槽机制** - 基于时间的密钥派生，增强安全性
- ✨ 现代化的 UI 设计
- 📱 响应式设计，支持移动端
- 🚀 快速构建和部署

## 加密原理

1. **密钥派生**: 使用 BIP39 助记词和 PBKDF2 生成种子
2. **会话密钥**: 基于时间槽和消息索引派生 AES-256-GCM 密钥
3. **加密**: 使用 AES-GCM 加密消息，包含认证标签
4. **转义**: 将加密字节映射为 emoji 和中文字符，隐藏加密特征

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 使用方法

1. 打开应用后，首先设置 **助记词**（必填）
2. 可选设置 **密码短语** 增强安全性
3. 输入消息并发送，消息会自动加密
4. 加密后的消息会显示为 emoji 和中文字符的组合
5. 点击"解密"按钮可以验证解密功能

## 部署

项目已配置 GitHub Actions，自动部署到 GitHub Pages。

### 自动部署

每次推送到 `master` 分支时，GitHub Actions 会自动构建并部署到 GitHub Pages。

### 手动部署

**一键部署（推荐）**:
```bash
npm run deploy
```

这个命令会：
1. 自动构建项目
2. 检查 Git 状态和分支
3. 如果有未提交的更改，自动提交
4. 自动推送到 GitHub
5. 触发 GitHub Actions 自动部署

**手动部署步骤**:
1. **构建项目**:
   ```bash
   npm run build
   ```

2. **推送到 GitHub**:
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin master
   ```

### 访问地址

部署完成后，访问: https://xoxott.github.io/ChameleonChat/

> **注意**: 首次部署需要在 GitHub 仓库设置中启用 GitHub Pages：
> 1. 进入仓库 Settings → Pages
> 2. Source 选择 "GitHub Actions"
> 3. 保存设置

## 技术栈

- React 18 + TypeScript
- Vite 5
- Web Crypto API
- CSS3

## 安全说明

⚠️ **重要**: 这是一个演示项目。在生产环境中使用前，请进行充分的安全审计。

## License

MIT
