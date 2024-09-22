Project Path: /Users/cjhw/github/code2prompt-node

Source Tree:
```
├── .git
│   ├── hooks
│   ├── info
│   ├── objects
│   │   ├── info
│   │   └── pack
│   └── refs
│       ├── heads
│       └── tags
├── node_modules
├── src
│   ├── filter.ts
│   ├── git.ts
│   ├── index.ts
│   ├── path.ts
│   ├── template.ts
│   └── token.ts
└── templates

```

`src/filter.ts`:
```
import { minimatch } from &quot;minimatch&quot;;
import path from &quot;path&quot;;

interface FilterOptions {
  include: string[];
  exclude: string[];
  includePriority: boolean;
}

/**
 * 检查路径是否匹配给定的模式
 * @param filePath - 文件路径
 * @param patterns - 模式数组
 * @returns 是否匹配
 */
function matchesPattern(filePath: string, patterns: string[]): boolean {
  const normalizedPath &#x3D; path.normalize(filePath);
  const relativePath &#x3D; path.relative(process.cwd(), normalizedPath);

  return patterns.some((pattern) &#x3D;&gt; {
    const matchFull &#x3D; minimatch(relativePath, pattern, { dot: true });
    const matchBase &#x3D; minimatch(path.basename(filePath), pattern, {
      matchBase: true,
    });
    return matchFull || matchBase;
  });
}

/**
 * 判断文件是否应该被包含
 * @param filePath - 文件路径
 * @param options - 选项
 * @returns 是否包含文件
 */
export function shouldIncludeFile(
  filePath: string,
  options: FilterOptions
): boolean {
  // 如果包含优先级高
  if (options.includePriority) {
    // 如果匹配包含模式，直接返回 true
    if (matchesPattern(filePath, options.include)) return true;
    // 如果匹配排除模式，返回 false
    if (matchesPattern(filePath, options.exclude)) return false;
  } else {
    // 如果匹配排除模式，直接返回 false
    if (matchesPattern(filePath, options.exclude)) return false;
    // 如果匹配包含模式，返回 true
    if (matchesPattern(filePath, options.include)) return true;
  }

  // 如果没有匹配任何规则，默认包含（当没有指定包含模式时）
  return options.include.length &#x3D;&#x3D;&#x3D; 0;
}

/**
 * 判断目录是否应该被包含
 * @param dirPath - 目录路径
 * @param options - 选项
 * @returns 是否包含目录
 */
export function shouldIncludeDirectory(
  dirPath: string,
  options: FilterOptions
): boolean {
  // 如果包含优先级高，先检查包含规则
  if (options.includePriority) {
    if (matchesPattern(dirPath, options.include)) return true;
  }

  // 检查排除规则
  if (matchesPattern(dirPath, options.exclude)) return false;

  // 如果包含优先级低，最后检查包含规则
  if (!options.includePriority) {
    if (matchesPattern(dirPath, options.include)) return true;
  }

  // 如果没有匹配任何规则，默认包含
  return true;
}

```
`src/git.ts`:
```
import { exec } from &quot;child_process&quot;;
import util from &quot;util&quot;;

const execAsync &#x3D; util.promisify(exec);

/**
 * 获取Git diff
 * @param repoPath - 仓库路径
 * @returns Git diff内容
 */
export async function getGitDiff(repoPath: string): Promise&lt;string&gt; {
  try {
    const { stdout } &#x3D; await execAsync(&quot;git diff&quot;, { cwd: repoPath });
    return stdout;
  } catch (error) {
    console.error(&quot;获取Git diff失败:&quot;, error.message);
    return &quot;&quot;;
  }
}

```
`src/index.ts`:
```
#!/usr/bin/env node

import { promises as fs } from &quot;fs&quot;;
import path from &quot;path&quot;;
import { Command } from &quot;commander&quot;;
import chalk from &quot;chalk&quot;;
import { traverseDirectory } from &quot;./path&quot;;
import { renderTemplate, setupHandlebars } from &quot;./template&quot;;
import { getGitDiff } from &quot;./git&quot;;
import { countTokens } from &quot;./token&quot;;

/** 模板数据接口 */
interface TemplateData {
  absoluteCodePath: string;
  sourceTree: string;
  files: { path: string; code: string }[];
  gitDiff?: string;
}

/** 命令行选项接口 */
interface CommandOptions {
  include: string;
  exclude: string;
  includePriority: boolean;
  tokens: boolean;
  output?: string;
  diff: boolean;
  lineNumber: boolean;
}

/**
 * 设置命令行参数
 * @returns Command 对象
 */
function setupCommandLine(): Command {
  return new Command()
    .version(&quot;1.0.0&quot;)
    .argument(&quot;&lt;path&gt;&quot;, &quot;代码库路径&quot;)
    .option(&quot;-i, --include &lt;patterns&gt;&quot;, &quot;包含的文件模式&quot;, &quot;&quot;)
    .option(&quot;-e, --exclude &lt;patterns&gt;&quot;, &quot;排除的文件模式&quot;, &quot;&quot;)
    .option(&quot;--include-priority&quot;, &quot;当包含和排除模式冲突时,优先包含&quot;, false)
    .option(&quot;-t, --tokens&quot;, &quot;显示生成的提示的token数量&quot;, false)
    .option(&quot;-o, --output &lt;file&gt;&quot;, &quot;输出文件路径&quot;)
    .option(&quot;-d, --diff&quot;, &quot;包含git diff&quot;, false)
    .option(&quot;-l, --line-number&quot;, &quot;添加行号到源代码&quot;, false);
}

/**
 * 处理文件模式
 * @param patterns 文件模式字符串
 * @returns 文件模式数组
 */
function processPatterns(patterns: string): string[] {
  return patterns ? patterns.split(&quot;,&quot;).filter(Boolean) : [];
}

/**
 * 准备模板数据
 * @param codePath 代码路径
 * @param options 命令行选项
 * @returns 模板数据
 */
async function prepareTemplateData(
  codePath: string,
  options: CommandOptions
): Promise&lt;TemplateData&gt; {
  const rootPath &#x3D; path.resolve(codePath);
  const { tree, files } &#x3D; await traverseDirectory(rootPath, {
    include: processPatterns(options.include),
    exclude: processPatterns(options.exclude),
    includePriority: options.includePriority,
    lineNumber: options.lineNumber,
  });

  const data: TemplateData &#x3D; {
    absoluteCodePath: path.resolve(codePath),
    sourceTree: tree,
    files: files,
  };

  if (options.diff) {
    data.gitDiff &#x3D; await getGitDiff(codePath);
  }

  return data;
}

/**
 * 主函数
 */
async function main() {
  try {
    const program &#x3D; setupCommandLine();
    program.parse(process.argv);

    const options &#x3D; program.opts() as CommandOptions;
    const codePath &#x3D; program.args[0];

    // 读取默认模板
    const templatePath &#x3D; path.join(process.cwd(), &quot;templates&quot;, &quot;default.hbs&quot;);
    const templateContent &#x3D; await fs.readFile(templatePath, &quot;utf-8&quot;);

    // 设置Handlebars
    const handlebars &#x3D; setupHandlebars(templateContent);

    // 准备模板数据
    const data &#x3D; await prepareTemplateData(codePath, options);

    // 渲染模板
    const rendered &#x3D; renderTemplate(handlebars, data);

    // 输出结果
    if (options.output) {
      await fs.writeFile(options.output, rendered);
      console.log(chalk.green(&#x60;提示已写入文件: ${options.output}&#x60;));
    } else {
      console.log(rendered);
    }

    // 如果需要,计算token数量
    if (options.tokens) {
      const tokenCount &#x3D; await countTokens(rendered);
      console.log(chalk.blue(&#x60;Token数量: ${tokenCount}&#x60;));
    }
  } catch (error) {
    console.error(chalk.red(&#x60;错误: ${error.message}&#x60;));
    process.exit(1);
  }
}

main();

```
`src/path.ts`:
```
import { promises as fs } from &quot;fs&quot;;
import path from &quot;path&quot;;
import { shouldIncludeDirectory, shouldIncludeFile } from &quot;./filter&quot;;

/** 遍历选项接口 */
interface TraverseOptions {
  /** 包含的文件或目录模式 */
  include: string[];
  /** 排除的文件或目录模式 */
  exclude: string[];
  /** 包含优先级是否高于排除 */
  includePriority: boolean;
  /** 是否添加行号 */
  lineNumber: boolean;
}

/** 树节点接口 */
interface TreeNode {
  /** 节点名称 */
  name: string;
  /** 子节点 */
  children: TreeNode[];
}

/** 遍历结果接口 */
interface TraverseResult {
  /** 格式化的目录树字符串 */
  tree: string;
  /** 文件内容数组 */
  files: { path: string; code: string }[];
}

/**
 * 遍历目录并生成目录树和文件内容
 * @param rootPath - 根目录路径
 * @param options - 遍历选项
 * @returns 包含目录树和文件内容的结果对象
 */
export async function traverseDirectory(
  rootPath: string,
  options: TraverseOptions
): Promise&lt;TraverseResult&gt; {
  const rootNode: TreeNode &#x3D; { name: path.basename(rootPath), children: [] };
  const files: { path: string; code: string }[] &#x3D; [];

  await traverse(rootPath, &quot;&quot;, rootNode, options, files);

  return {
    tree: formatTree(rootNode.children),
    files,
  };
}

/**
 * 递归遍历目录
 * @param currentPath - 当前路径
 * @param relativePath - 相对路径
 * @param currentNode - 当前节点
 * @param options - 遍历选项
 * @param files - 文件内容数组
 */
async function traverse(
  currentPath: string,
  relativePath: string,
  currentNode: TreeNode,
  options: TraverseOptions,
  files: { path: string; code: string }[]
): Promise&lt;void&gt; {
  const entries &#x3D; await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath &#x3D; path.join(currentPath, entry.name);
    const relPath &#x3D; path.join(relativePath, entry.name);

    if (entry.isDirectory() &amp;&amp; shouldIncludeDirectory(relPath, options)) {
      // 处理目录
      const subNode: TreeNode &#x3D; { name: entry.name, children: [] };
      currentNode.children.push(subNode);
      await traverse(fullPath, relPath, subNode, options, files);
    } else if (entry.isFile() &amp;&amp; shouldIncludeFile(fullPath, options)) {
      // 处理文件
      currentNode.children.push({ name: entry.name, children: [] });
      const content &#x3D; await fs.readFile(fullPath, &quot;utf-8&quot;);
      files.push({
        path: relPath,
        code: addLineNumbers(content, options.lineNumber),
      });
    }
  }
}

/**
 * 格式化目录树为字符串
 * @param tree - 树节点数组
 * @param prefix - 前缀字符串
 * @returns 格式化后的目录树字符串
 */
function formatTree(tree: TreeNode[], prefix &#x3D; &quot;&quot;): string {
  return tree
    .map((node, index, array) &#x3D;&gt; {
      const isLast &#x3D; index &#x3D;&#x3D;&#x3D; array.length - 1;
      const line &#x3D; &#x60;${prefix}${isLast ? &quot;└── &quot; : &quot;├── &quot;}${node.name}\n&#x60;;
      const childPrefix &#x3D; &#x60;${prefix}${isLast ? &quot;    &quot; : &quot;│   &quot;}&#x60;;
      const childrenStr &#x3D; formatTree(node.children, childPrefix);
      return line + childrenStr;
    })
    .join(&quot;&quot;);
}

/**
 * 为代码添加行号
 * @param code - 原始代码字符串
 * @param addLineNumbers - 是否添加行号
 * @returns 添加行号后的代码字符串
 */
function addLineNumbers(code: string, addLineNumbers: boolean): string {
  return addLineNumbers
    ? code
        .split(&quot;\n&quot;)
        .map((line, index) &#x3D;&gt; &#x60;${index + 1} | ${line}&#x60;)
        .join(&quot;\n&quot;)
    : code;
}

```
`src/template.ts`:
```
import Handlebars from &quot;handlebars&quot;;

/**
 * 设置Handlebars模板引擎
 * @param templateContent - 模板内容
 * @returns Handlebars实例
 */
export function setupHandlebars(templateContent: string): typeof Handlebars {
  const handlebars &#x3D; Handlebars.create();
  handlebars.registerPartial(&quot;default&quot;, templateContent);
  return handlebars;
}

/**
 * 渲染模板
 * @param handlebars - Handlebars实例
 * @param data - 模板数据
 * @returns 渲染后的内容
 */
export function renderTemplate(
  handlebars: typeof Handlebars,
  data: any
): string {
  const template &#x3D; handlebars.compile(&quot;{{&gt; default}}&quot;);
  return template(data);
}

```
`src/token.ts`:
```
import GPT3Tokenizer from &quot;gpt3-tokenizer&quot;;

/**
 * 计算文本的token数量
 * @param text - 要计算的文本
 * @returns token数量
 */
export async function countTokens(text: string): Promise&lt;number&gt; {
  const tokenizer &#x3D; new GPT3Tokenizer({ type: &quot;gpt3&quot; });
  const encoded &#x3D; tokenizer.encode(text);
  return encoded.bpe.length;
}

```

