#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import { Command } from "commander";
import chalk from "chalk";
import { traverseDirectory } from "./path";
import { renderTemplate, setupHandlebars } from "./template";
import { getGitDiff } from "./git";
import { countTokens } from "./token";

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
    .version("1.0.0")
    .argument("<path>", "代码库路径")
    .option("-i, --include <patterns>", "包含的文件模式", "")
    .option("-e, --exclude <patterns>", "排除的文件模式", "")
    .option("--include-priority", "当包含和排除模式冲突时,优先包含", false)
    .option("-t, --tokens", "显示生成的提示的token数量", false)
    .option("-o, --output <file>", "输出文件路径")
    .option("-d, --diff", "包含git diff", false)
    .option("-l, --line-number", "添加行号到源代码", false);
}

/**
 * 处理文件模式
 * @param patterns 文件模式字符串
 * @returns 文件模式数组
 */
function processPatterns(patterns: string): string[] {
  return patterns ? patterns.split(",").filter(Boolean) : [];
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
): Promise<TemplateData> {
  const rootPath = path.resolve(codePath);
  const { tree, files } = await traverseDirectory(rootPath, {
    include: processPatterns(options.include),
    exclude: processPatterns(options.exclude),
    includePriority: options.includePriority,
    lineNumber: options.lineNumber,
  });

  const data: TemplateData = {
    absoluteCodePath: path.resolve(codePath),
    sourceTree: tree,
    files: files,
  };

  if (options.diff) {
    data.gitDiff = await getGitDiff(codePath);
  }

  return data;
}

/**
 * 主函数
 */
async function main() {
  try {
    const program = setupCommandLine();
    program.parse(process.argv);

    const options = program.opts() as CommandOptions;
    const codePath = program.args[0];

    // 读取默认模板
    const templatePath = path.join(process.cwd(), "templates", "default.hbs");
    const templateContent = await fs.readFile(templatePath, "utf-8");

    // 设置Handlebars
    const handlebars = setupHandlebars(templateContent);

    // 准备模板数据
    const data = await prepareTemplateData(codePath, options);

    // 渲染模板
    const rendered = renderTemplate(handlebars, data);

    // 输出结果
    if (options.output) {
      await fs.writeFile(options.output, rendered);
      console.log(chalk.green(`提示已写入文件: ${options.output}`));
    } else {
      console.log(rendered);
    }

    // 如果需要,计算token数量
    if (options.tokens) {
      const tokenCount = await countTokens(rendered);
      console.log(chalk.blue(`Token数量: ${tokenCount}`));
    }
  } catch (error) {
    console.error(chalk.red(`错误: ${error.message}`));
    process.exit(1);
  }
}

main();
