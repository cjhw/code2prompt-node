# code2prompt-node

code2prompt-node 是一个用于从代码库生成 LLM (大型语言模型) 提示的命令行工具。它使用 TypeScript 编写,运行在 Node.js 环境中。

## 功能

- 遍历指定的代码目录
- 根据包含和排除规则过滤文件
- 生成目录树结构
- 读取文件内容
- 可选地获取 Git diff
- 使用 Handlebars 模板渲染输出
- 计算生成提示的 token 数量

## 安装

确保您的系统中已安装 Node.js (版本 18 或更高)。然后,克隆此仓库并安装依赖:

```bash
git clone https://github.com/your-username/code2prompt-node.git
cd code2prompt-node
npm install
```

## 使用

```bash
npm run start
```

## 命令行选项

```bash
npm run start -- --help

- `<path>`: 代码库路径 (必需)
- `-i, --include <patterns>`: 包含的文件模式 (用逗号分隔)
- `-e, --exclude <patterns>`: 排除的文件模式 (用逗号分隔)
- `--include-priority`: 当包含和排除模式冲突时,优先包含
- `-t, --tokens`: 显示生成的提示的 token 数量
- `-o, --output <file>`: 输出文件路径
- `-d, --diff`: 包含 git diff
- `-l, --line-number`: 添加行号到源代码
```

## 示例

```bash
npm run start -- ./my-project -i "*.ts" -e "node_modules/**" --include-priority -t -o output.md
```
