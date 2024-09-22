import { promises as fs } from "fs";
import path from "path";
import { shouldIncludeDirectory, shouldIncludeFile } from "./filter";

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
): Promise<TraverseResult> {
  const rootNode: TreeNode = { name: path.basename(rootPath), children: [] };
  const files: { path: string; code: string }[] = [];

  await traverse(rootPath, "", rootNode, options, files);

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
): Promise<void> {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    const relPath = path.join(relativePath, entry.name);

    if (entry.isDirectory() && shouldIncludeDirectory(relPath, options)) {
      // 处理目录
      const subNode: TreeNode = { name: entry.name, children: [] };
      currentNode.children.push(subNode);
      await traverse(fullPath, relPath, subNode, options, files);
    } else if (entry.isFile() && shouldIncludeFile(fullPath, options)) {
      // 处理文件
      currentNode.children.push({ name: entry.name, children: [] });
      const content = await fs.readFile(fullPath, "utf-8");
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
function formatTree(tree: TreeNode[], prefix = ""): string {
  return tree
    .map((node, index, array) => {
      const isLast = index === array.length - 1;
      const line = `${prefix}${isLast ? "└── " : "├── "}${node.name}\n`;
      const childPrefix = `${prefix}${isLast ? "    " : "│   "}`;
      const childrenStr = formatTree(node.children, childPrefix);
      return line + childrenStr;
    })
    .join("");
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
        .split("\n")
        .map((line, index) => `${index + 1} | ${line}`)
        .join("\n")
    : code;
}
