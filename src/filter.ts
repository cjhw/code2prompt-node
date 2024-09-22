import { minimatch } from "minimatch";
import path from "path";

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
  const normalizedPath = path.normalize(filePath);
  const relativePath = path.relative(process.cwd(), normalizedPath);

  return patterns.some((pattern) => {
    const matchFull = minimatch(relativePath, pattern, { dot: true });
    const matchBase = minimatch(path.basename(filePath), pattern, {
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
  return options.include.length === 0;
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
