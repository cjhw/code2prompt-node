import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

/**
 * 获取Git diff
 * @param repoPath - 仓库路径
 * @returns Git diff内容
 */
export async function getGitDiff(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execAsync("git diff", { cwd: repoPath });
    return stdout;
  } catch (error) {
    console.error("获取Git diff失败:", error.message);
    return "";
  }
}
