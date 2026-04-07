#!/usr/bin/env npx tsx
/**
 * q-sec-courses Auto-Grading CLI
 * ================================
 * Clones student repos, extracts metrics, and generates grading reports.
 *
 * Usage:
 *   npx tsx scripts/grade.ts                          # Grade all pending submissions (local)
 *   npx tsx scripts/grade.ts --course reverse-engineering
 *   npx tsx scripts/grade.ts --student-id 210000123
 *   npx tsx scripts/grade.ts --repo https://github.com/user/repo  # Grade a single repo directly
 *   npx tsx scripts/grade.ts --dry-run                # Extract metrics only, no evaluation
 *   npx tsx scripts/grade.ts --api-base https://qline.tech/istinye/api  # Fetch submissions from API & push results
 *   npx tsx scripts/grade.ts --api-base https://example.com/api --admin-pin 
 */

import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { DynamicRepositoryCheckupService } from "./devops/checkup";
import { default_checkup_rules } from "./devops/rules";
import { DangerousAnalysisService } from "./devops/dangerous";
import { fileURLToPath } from "url";
import * as crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ────────────────────────── Types ──────────────────────────

interface Submission {
  id: string;
  timestamp: string;
  student_name: string;
  student_id: string;
  course_id: string;
  project_title: string;
  github_repo: string;
  description: string;
  status?: string;
  markdown_files?: { name: string; content: string }[];
}

interface GitMetrics {
  totalCommits: number;
  firstCommitDate: string;
  lastCommitDate: string;
  timeSpanDays: number;
  workingSessions: number; // clusters of commits within 2h
  avgCommitsPerDay: number;
  commitMessages: string[];
  commitDates: string[];
  authors: string[];
  branchCount: number;
}

interface CodeMetrics {
  totalFiles: number;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  commentRatio: number; // commentLines / codeLines
  languages: Record<string, { files: number; lines: number }>;
  avgFunctionLength: number;
  todoFixmeCount: number;
  largestFile: { path: string; lines: number };
  technicalDepthScore: number;
  technicalDepthDetails: string[];
}

interface DocMetrics {
  hasReadme: boolean;
  readmeLines: number;
  readmeWordCount: number;
  markdownFileCount: number;
  totalDocLines: number;
  hasLicense: boolean;
  hasChangelog: boolean;
  hasContributing: boolean;
  hasBadges: boolean;
  hasTOC: boolean;
  hasIstinyeLogo: boolean;
  hasInstructorInfo: boolean;
  hasDocsFolder: boolean;
}

interface RepoMetrics {
  hasGitignore: boolean;
  hasCICD: boolean;
  cicdType: string;
  hasDockerfile: boolean;
  hasMakefile: boolean;
  hasPackageJson: boolean;
  hasCargotoml: boolean;
  hasGitAttributes: boolean;
  hasEnv: boolean;
  hasEnvExample: boolean;
  directoryDepth: number;
  topLevelDirs: string[];
  topLevelFiles: string[];
}

interface VideoMetrics {
  hasVideoDemo: boolean;
  videoFiles: string[];
  hasDemoDir: boolean;
  hasReadmeEmbed: boolean;
  hasExternalVideoLink: boolean;
  videoLinkUrl: string;
}

interface GradingReport {
  submission: Submission;
  clonedAt: string;
  repoPath: string;
  git: GitMetrics;
  code: CodeMetrics;
  docs: DocMetrics;
  repo: RepoMetrics;
  scores: {
    commitActivity: number;
    timeInvestment: number;
    codeVolume: number;
    codeQuality: number;
    documentation: number;
    repoProfessionalism: number;
    totalWeighted: number;
    videoDemoBonus: number;
  };
  video: VideoMetrics;
}

// ────────────────────────── CLI Args ──────────────────────────

const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const filterCourse = getArg("course");
const filterStudentIds = getArg("student-id")?.split(",").map(id => id.trim()).filter(Boolean) || [];
const directRepo = getArg("repo");
const dryRun = hasFlag("dry-run");
const verbose = hasFlag("verbose");
const apiBase = getArg("api-base"); // e.g. https://qline.tech/istinye/api
const adminPin = getArg("admin-pin") || process.env.ADMIN_PIN || "753159";

const API_DIR = path.join(process.cwd(), "api");
const DATA_DIR = path.join(API_DIR, "data");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions/submissions.json");
const CLONE_DIR = path.join(process.cwd(), "archives");
const GRADING_HISTORY_DIR = path.join(DATA_DIR, "grading-history");
const GRADING_LATEST_DIR = path.join(DATA_DIR, "grading-latest");

// ────────────────────────── API Helpers ──────────────────────────

function getAdminToken(pin: string): string {
  return crypto.createHmac('sha256', pin).update('isu_admin_session').digest('hex');
}

async function fetchSubmissionsFromApi(base: string): Promise<Submission[]> {
  const token = getAdminToken(adminPin);
  const url = `${base.replace(/\/$/, '')}/submissions_list.php`;
  log(`Fetching submissions from API: ${url}`);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API fetch failed (${res.status}): ${errText}`);
  }

  const data = await res.json() as Submission[];
  return Array.isArray(data) ? data : [];
}

async function pushGradeToApi(base: string, report: GradingReport): Promise<boolean> {
  const token = getAdminToken(adminPin);
  const url = `${base.replace(/\/$/, '')}/grade_push.php`;
  const cId = report.submission.course_id === 'web-security' ? 'secure-web' : report.submission.course_id;

  const payload = {
    student_id: report.submission.student_id,
    course_id: cId,
    report: {
      timestamp: Date.now(),
      student_name: report.submission.student_name,
      student_id: report.submission.student_id,
      course_id: cId,
      git: report.git,
      code: report.code,
      video: report.video,
      scores: report.scores,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      error(`API push failed for ${report.submission.student_id} (${res.status}): ${errText}`);
      return false;
    }

    const result = await res.json() as Record<string, unknown>;
    if (result.success) {
      log(`✅ API push OK: ${report.submission.student_id}`);
    } else {
      warn(`API push returned non-success for ${report.submission.student_id}: ${JSON.stringify(result)}`);
    }
    return !!result.success;
  } catch (e: unknown) {
    error(`API push error for ${report.submission.student_id}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

async function pushBatchToApi(base: string, reports: GradingReport[]): Promise<void> {
  const token = getAdminToken(adminPin);
  const url = `${base.replace(/\/$/, '')}/grade_push.php`;

  const batch = reports.map(r => {
    const cId = r.submission.course_id === 'web-security' ? 'secure-web' : r.submission.course_id;
    return {
      student_id: r.submission.student_id,
      course_id: cId,
      report: {
        timestamp: Date.now(),
        student_name: r.submission.student_name,
        student_id: r.submission.student_id,
        course_id: cId,
        git: r.git,
        code: r.code,
        video: r.video,
        scores: r.scores,
      },
    };
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batch }),
    });

    if (!res.ok) {
      error(`Batch push failed (${res.status}): ${await res.text()}`);
      return;
    }

    const result = await res.json() as Record<string, unknown>;
    log(`📤 Batch push: ${result.pushed} pushed, ${result.failed} failed`);
  } catch (e: unknown) {
    error(`Batch push error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ────────────────────────── Helpers ──────────────────────────

function log(msg: string) {
  console.log(`\x1b[36m[GRADE]\x1b[0m ${msg}`);
}

function warn(msg: string) {
  console.warn(`\x1b[33m[WARN]\x1b[0m ${msg}`);
}

function error(msg: string) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
}

function exec(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout: 30000 }).trim();
  } catch {
    return "";
  }
}

function fileExists(p: string): boolean {
  return fs.existsSync(p);
}

/** Sanitize GitHub URLs: strip /tree/main, /blob/main, trailing .git, etc. */
function sanitizeRepoUrl(url: string): string {
  let cleaned = url.trim();
  // Remove /tree/branch or /blob/branch suffixes
  cleaned = cleaned.replace(/\/(tree|blob)\/[^/]+\/?$/, '');
  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  // Ensure .git suffix for cloning
  if (!cleaned.endsWith('.git')) {
    cleaned = cleaned + '.git';
  }
  return cleaned;
}

/** Create a safe directory name from submission */
function makeCloneDir(sub: Submission): string {
  const safeName = (sub.project_title || sub.id)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
  const courseId = sub.course_id === 'web-security' ? 'secure-web' : sub.course_id;
  return path.join(CLONE_DIR, courseId, `${sub.student_id}_${safeName}`);
}

// ────────────────────────── Git Metrics ──────────────────────────

function extractGitMetrics(repoPath: string): GitMetrics {
  const totalCommits = parseInt(exec("git rev-list --count HEAD", repoPath)) || 0;

  const logOutput = exec(
    'git log --format="%ai|||%s|||%an" --no-merges',
    repoPath
  );
  const logLines = logOutput ? logOutput.split("\n").filter(Boolean) : [];

  const commitDates: string[] = [];
  const commitMessages: string[] = [];
  const authorsSet = new Set<string>();

  for (const line of logLines) {
    const [date, msg, author] = line.split("|||");
    if (date) commitDates.push(date.trim());
    if (msg) commitMessages.push(msg.trim());
    if (author) authorsSet.add(author.trim());
  }

  const firstCommitDate = commitDates.length > 0 ? commitDates[commitDates.length - 1] : "N/A";
  const lastCommitDate = commitDates.length > 0 ? commitDates[0] : "N/A";

  let timeSpanDays = 0;
  if (commitDates.length >= 2) {
    const first = new Date(commitDates[commitDates.length - 1]);
    const last = new Date(commitDates[0]);
    timeSpanDays = Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Working sessions: clusters of commits within 2 hours of each other
  let workingSessions = 0;
  if (commitDates.length > 0) {
    workingSessions = 1;
    for (let i = 1; i < commitDates.length; i++) {
      const diff = Math.abs(
        new Date(commitDates[i - 1]).getTime() - new Date(commitDates[i]).getTime()
      );
      if (diff > 2 * 60 * 60 * 1000) workingSessions++;
    }
  }

  const branchCount = parseInt(exec("git branch -r | wc -l", repoPath)) || 1;

  return {
    totalCommits,
    firstCommitDate,
    lastCommitDate,
    timeSpanDays,
    workingSessions,
    avgCommitsPerDay: timeSpanDays > 0 ? Math.round((totalCommits / timeSpanDays) * 10) / 10 : totalCommits,
    commitMessages: commitMessages.slice(0, 50), // cap for report
    commitDates: commitDates.slice(0, 50),
    authors: Array.from(authorsSet),
    branchCount,
  };
}

// ────────────────────────── Code Metrics ──────────────────────────

const LANG_EXTENSIONS: Record<string, string> = {
  ".rs": "Rust", ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript",
  ".tsx": "TypeScript/React", ".jsx": "JavaScript/React", ".go": "Go",
  ".c": "C", ".cpp": "C++", ".h": "C/C++ Header", ".cs": "C#",
  ".java": "Java", ".rb": "Ruby", ".php": "PHP", ".sh": "Shell",
  ".yml": "YAML", ".yaml": "YAML", ".toml": "TOML", ".json": "JSON",
  ".html": "HTML", ".css": "CSS", ".scss": "SCSS", ".sql": "SQL",
  ".swift": "Swift", ".kt": "Kotlin", ".dart": "Dart",
};

const EXCLUDE_DIRS = [
  "node_modules", ".git", "target", "dist", "build", "__pycache__",
  ".next", "vendor", ".cargo", "venv", "env", ".venv",
  "coverage", ".cache", "pkg", "out",
];

function getAllSourceFiles(dir: string): string[] {
  const files: string[] = [];
  const excludeSet = new Set(EXCLUDE_DIRS);

  function walk(currentDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".gitignore") continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!excludeSet.has(entry.name)) walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (LANG_EXTENSIONS[ext]) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

async function extractCodeMetrics(repoPath: string): Promise<CodeMetrics> {
  const files = getAllSourceFiles(repoPath);
  const languages: Record<string, { files: number; lines: number }> = {};
  let totalLines = 0;
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;
  let todoFixmeCount = 0;
  let largestFile = { path: "", lines: 0 };
  const functionLengths: number[] = [];

  for (const filePath of files) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    const lines = content.split("\n");
    const ext = path.extname(filePath).toLowerCase();
    const lang = LANG_EXTENSIONS[ext] || "Other";

    if (!languages[lang]) languages[lang] = { files: 0, lines: 0 };
    languages[lang].files++;
    languages[lang].lines += lines.length;

    totalLines += lines.length;

    if (lines.length > largestFile.lines) {
      largestFile = { path: path.relative(repoPath, filePath), lines: lines.length };
    }

    let inBlockComment = false;
    let currentFuncLen = 0;
    let braceDepth = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        blankLines++;
        continue;
      }

      // Comment detection (simplified multi-language)
      if (inBlockComment) {
        commentLines++;
        if (trimmed.includes("*/")) inBlockComment = false;
        continue;
      }
      if (trimmed.startsWith("/*")) {
        commentLines++;
        if (!trimmed.includes("*/")) inBlockComment = true;
        continue;
      }
      if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("--")) {
        commentLines++;
      } else {
        codeLines++;
      }

      // TODO/FIXME count
      if (/\b(TODO|FIXME|HACK|XXX)\b/i.test(trimmed)) {
        todoFixmeCount++;
      }

      // Simple function length tracking (brace-based languages)
      if (/\bfn\b|\bfunction\b|\bdef\b|\bfunc\b/.test(trimmed)) {
        if (currentFuncLen > 0) functionLengths.push(currentFuncLen);
        currentFuncLen = 0;
      }
      if (trimmed.includes("{")) braceDepth++;
      if (trimmed.includes("}")) braceDepth--;
      if (braceDepth > 0) currentFuncLen++;
    }

    if (currentFuncLen > 0) functionLengths.push(currentFuncLen);
  }

  const avgFunctionLength =
    functionLengths.length > 0
      ? Math.round(functionLengths.reduce((a, b) => a + b, 0) / functionLengths.length)
      : 0;

  // Technical Depth Calculation based on QDebugger heuristics
  let technicalDepthScore = 30; // base score
  const technicalDepthDetails: string[] = [];

  try {
    const allCode = files.map(f => {
      try { return fs.readFileSync(f, 'utf8'); } catch { return ''; }
    }).join('\n');

    // Overall architectural and general checks
    if (codeLines > 500) { technicalDepthScore += 10; technicalDepthDetails.push("High code volume indicative of depth"); }
    if (files.length > 5 && avgFunctionLength > 5 && avgFunctionLength < 50) { technicalDepthScore += 15; technicalDepthDetails.push("Good modularity (multi-file with manageable functions)"); }
    
    // QDebugger Deep Static Analysis
    const openSourceCheckup = await DynamicRepositoryCheckupService.analyze(repoPath, default_checkup_rules);
    if (openSourceCheckup.score_percentage > 50) { technicalDepthScore += 10; technicalDepthDetails.push(`Good Open Source health (${openSourceCheckup.score_percentage}%)`); }
    else if (openSourceCheckup.score_percentage > 80) { technicalDepthScore += 20; technicalDepthDetails.push(`Excellent software engineering architecture (${openSourceCheckup.score_percentage}%)`); }
    
    if (openSourceCheckup.total_failed > 0) { technicalDepthScore -= Math.min(10, openSourceCheckup.total_failed); }

    // Aggregate Danger & Pattern Evasion Rules (Indicating complexity & low-level interactions)
    const promises = [
      DangerousAnalysisService.analyzeNodeExecution(repoPath),
      DangerousAnalysisService.analyzeNodeNetwork(repoPath),
      DangerousAnalysisService.analyzeNodeEvasion(repoPath),
      DangerousAnalysisService.analyzePythonInjection(repoPath),
      DangerousAnalysisService.analyzePythonPersistence(repoPath),
      DangerousAnalysisService.analyzePythonConfig(repoPath),
      DangerousAnalysisService.analyzeLolbins(repoPath),
      DangerousAnalysisService.analyzeNativeInjection(repoPath),
      DangerousAnalysisService.analyzeNativeScripting(repoPath),
      DangerousAnalysisService.analyzeRustUnsafe(repoPath),
      DangerousAnalysisService.analyzeRustEvasion(repoPath),
      DangerousAnalysisService.analyzeRustSupplyChain(repoPath),
      DangerousAnalysisService.analyzeLinuxPersistence(repoPath),
      DangerousAnalysisService.analyzeMacPersistence(repoPath),
      DangerousAnalysisService.analyzePrivilegeEscalation(repoPath)
    ];
    
    const threatReports = await Promise.all(promises);
    for (const report of threatReports) {
      if (report.total_issues > 0) {
        technicalDepthScore += 5; // Acknowledging advanced API usage
        report.findings.forEach((finding: any) => {
           technicalDepthDetails.push(`Deep concept [${finding.category}]: ${finding.title}`);
           technicalDepthScore += 2;
        });
      }
    }
  } catch (e) {
    // Ignore read errors
  }

  technicalDepthScore = Math.min(100, Math.max(0, technicalDepthScore));
  if (technicalDepthDetails.length === 0) technicalDepthDetails.push("Basic simple structure (no advanced patterns detected)");

  return {
    totalFiles: files.length,
    totalLines,
    codeLines,
    commentLines,
    blankLines,
    commentRatio: codeLines > 0 ? Math.round((commentLines / codeLines) * 100) / 100 : 0,
    languages,
    avgFunctionLength,
    todoFixmeCount,
    largestFile,
    technicalDepthScore,
    technicalDepthDetails
  };
}

function extractDocMetrics(repoPath: string): DocMetrics {
  let readmePath: string | undefined = undefined;
  if (fs.existsSync(repoPath)) {
    const files = fs.readdirSync(repoPath);
    const found = files.find(f => /^readme(\.(md|txt|rst))?$/i.test(f));
    if (found) readmePath = path.join(repoPath, found);
  }

  let readmeLines = 0;
  let readmeWordCount = 0;
  let hasBadges = false;
  let hasTOC = false;
  let hasIstinyeLogo = false;
  let hasInstructorInfo = false;

  if (readmePath) {
    const content = fs.readFileSync(readmePath, "utf-8");
    readmeLines = content.split("\n").length;
    readmeWordCount = content.split(/\s+/).filter(Boolean).length;

    hasBadges = /!\[.*\]\(.*(shields\.io|badge).*\)/i.test(content);
    hasTOC = /Table of Contents|İçindekiler|içindekiler/i.test(content) || (content.match(/- \[.*\]\(#.*\)/g) || []).length >= 3;
    hasIstinyeLogo = /istinye.*logo|isu.*logo/i.test(content) || /!\[.*\]\(.*istinye.*\)/i.test(content) || /!\[.*\]\(.*isu.*\)/i.test(content);
    hasInstructorInfo = /Keyvan|Arasteh|danışman/i.test(content);
  }

  // Count all markdown files
  const mdFiles = exec(
    `find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/target/*" | wc -l`,
    repoPath
  );
  const markdownFileCount = parseInt(mdFiles) || 0;

  const totalDocLines = parseInt(
    exec(
      `find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/target/*" -exec cat {} + | wc -l`,
      repoPath
    )
  ) || 0;

  const hasDocsFolder = fs.existsSync(path.join(repoPath, 'docs'));

  return {
    hasReadme: !!readmePath,
    readmeLines,
    readmeWordCount,
    markdownFileCount,
    totalDocLines,
    hasLicense: fileExists(path.join(repoPath, "LICENSE")) || fileExists(path.join(repoPath, "LICENSE.md")),
    hasChangelog: fileExists(path.join(repoPath, "CHANGELOG.md")) || fileExists(path.join(repoPath, "CHANGELOG")),
    hasContributing: fileExists(path.join(repoPath, "CONTRIBUTING.md")),
    hasBadges,
    hasTOC,
    hasIstinyeLogo,
    hasInstructorInfo,
    hasDocsFolder
  };
}

// ────────────────────────── Repo Structure Metrics ──────────────────────────

function extractRepoMetrics(repoPath: string): RepoMetrics {
  const hasGitignore = fileExists(path.join(repoPath, ".gitignore"));

  const githubDir = path.join(repoPath, ".github/workflows");
  const hasCICD = fs.existsSync(githubDir) || fileExists(path.join(repoPath, ".gitlab-ci.yml")) || fileExists(path.join(repoPath, "Jenkinsfile"));
  let cicdType = "none";
  if (fs.existsSync(githubDir)) cicdType = "GitHub Actions";
  else if (fileExists(path.join(repoPath, ".gitlab-ci.yml"))) cicdType = "GitLab CI";
  else if (fileExists(path.join(repoPath, "Jenkinsfile"))) cicdType = "Jenkins";

  let hasDockerfile = false;
  try {
    const list = exec(`find . -type f \\( -name "Dockerfile" -o -name "docker-compose.yml" -o -name "docker-compose.yaml" -o -name "docker-compose.dev.yml" \\) | head -n 1`, repoPath);
    if (list.trim().length > 0) hasDockerfile = true;
  } catch (e) {
    hasDockerfile = false;
  }
  const hasMakefile = fileExists(path.join(repoPath, "Makefile"));
  const hasPackageJson = fileExists(path.join(repoPath, "package.json"));
  const hasCargotoml = fileExists(path.join(repoPath, "Cargo.toml"));
  const hasGitAttributes = fileExists(path.join(repoPath, ".gitattributes"));
  const hasEnv = fileExists(path.join(repoPath, ".env"));
  const hasEnvExample = fileExists(path.join(repoPath, ".env.example")) || fileExists(path.join(repoPath, ".env.template"));

  let topLevelDirs: string[] = [];
  let topLevelFiles: string[] = [];
  try {
    const entries = fs.readdirSync(repoPath, { withFileTypes: true });
    topLevelDirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith("."))
      .map(e => e.name);
    topLevelFiles = entries
      .filter(e => e.isFile())
      .map(e => e.name);
  } catch { /* ignore */ }

  const maxDepth = parseInt(exec(
    `find . -type d -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/target/*" | awk -F/ '{print NF-1}' | sort -rn | head -1`,
    repoPath
  )) || 0;

  return {
    hasGitignore,
    hasCICD,
    cicdType,
    hasDockerfile,
    hasMakefile,
    hasPackageJson,
    hasCargotoml,
    hasGitAttributes,
    hasEnv,
    hasEnvExample,
    directoryDepth: maxDepth,
    topLevelDirs,
    topLevelFiles,
  };
}

// ────────────────────────── Video Demo Metrics ──────────────────────────

const VIDEO_PATTERN = /\.(mp4|webm|mov|avi|mkv|gif)$/i;
const DEMO_DIRS = ['demo', 'demos', 'recordings', 'videos', 'screencasts'];

function extractVideoMetrics(repoPath: string): VideoMetrics {
  // 1. Search for video files in repo
  const videoFilesRaw = exec(
    `find . -type f \\( -iname "*.mp4" -o -iname "*.webm" -o -iname "*.mov" -o -iname "*.avi" -o -iname "*.mkv" \\) -not -path "*/.git/*" -not -path "*/node_modules/*" 2>/dev/null`,
    repoPath
  );
  const videoFiles = videoFilesRaw ? videoFilesRaw.split('\n').filter(Boolean) : [];

  // 2. Check for demo/recordings directories
  const hasDemoDir = DEMO_DIRS.some(d => fs.existsSync(path.join(repoPath, d)));

  let readmePath: string | undefined = undefined;
  if (fs.existsSync(repoPath)) {
    const files = fs.readdirSync(repoPath);
    const found = files.find(f => /^readme(\.(md|txt|rst))?$/i.test(f));
    if (found) readmePath = path.join(repoPath, found);
  }

  let hasReadmeEmbed = false;
  let hasExternalVideoLink = false;
  let videoLinkUrl = '';

  if (readmePath) {
    const content = fs.readFileSync(readmePath, 'utf-8');
    // Check for embedded video files (markdown image/video syntax)
    hasReadmeEmbed = VIDEO_PATTERN.test(content) ||
      /!\[.*\]\(.*\.(mp4|webm|mov|gif)/i.test(content) ||
      /<video/i.test(content) ||
      /🎬\s*Demo/i.test(content);

    // Check for external video links (YouTube, Loom, Vimeo)
    const ytMatch = content.match(/https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be|loom\.com\/share|vimeo\.com\/)[^\s)]+/);
    if (ytMatch) {
      hasExternalVideoLink = true;
      videoLinkUrl = ytMatch[0];
    }
  }

  const hasVideoDemo = videoFiles.length > 0 || hasReadmeEmbed || hasExternalVideoLink;

  return {
    hasVideoDemo,
    videoFiles,
    hasDemoDir,
    hasReadmeEmbed,
    hasExternalVideoLink,
    videoLinkUrl,
  };
}

// ────────────────────────── Scoring Engine ──────────────────────────

function calculateScores(git: GitMetrics, code: CodeMetrics, docs: DocMetrics, repo: RepoMetrics, sub: Submission) {
  // Commit Activity (15%) — based on commit count & consistency
  let commitActivity = 0;
  if (git.totalCommits >= 30) commitActivity = 100;
  else if (git.totalCommits >= 20) commitActivity = 85;
  else if (git.totalCommits >= 10) commitActivity = 70;
  else if (git.totalCommits >= 5) commitActivity = 50;
  else commitActivity = Math.max(10, git.totalCommits * 8);

  // Bonus for consistency (working sessions spread out)
  if (git.workingSessions >= 10) commitActivity = Math.min(100, commitActivity + 10);

  // Penalize single-day dumps
  if (git.timeSpanDays <= 1 && git.totalCommits > 3) commitActivity = Math.max(20, commitActivity - 30);

  // Time Investment (10%) — based on working time span
  let timeInvestment = 0;
  if (git.timeSpanDays >= 21) timeInvestment = 100;
  else if (git.timeSpanDays >= 14) timeInvestment = 85;
  else if (git.timeSpanDays >= 7) timeInvestment = 70;
  else if (git.timeSpanDays >= 3) timeInvestment = 50;
  else if (git.timeSpanDays >= 1) timeInvestment = 30;
  else timeInvestment = 10; // all commits on same day

  // Working sessions bonus
  if (git.workingSessions >= 5) timeInvestment = Math.min(100, timeInvestment + 10);

  // Code Volume (10%) — LOC
  let codeVolume = 0;
  if (code.codeLines >= 1000) codeVolume = 100;
  else if (code.codeLines >= 500) codeVolume = 85;
  else if (code.codeLines >= 200) codeVolume = 70;
  else if (code.codeLines >= 100) codeVolume = 55;
  else if (code.codeLines >= 50) codeVolume = 40;
  else codeVolume = Math.max(10, Math.round(code.codeLines / 2));

  // Code Quality (20%) — comment ratio, TODO density, function length
  let codeQuality = 60; // baseline
  if (code.commentRatio >= 0.15) codeQuality += 15;
  else if (code.commentRatio >= 0.05) codeQuality += 5;
  else codeQuality -= 10;

  if (code.avgFunctionLength > 0 && code.avgFunctionLength <= 20) codeQuality += 10;
  else if (code.avgFunctionLength > 50) codeQuality -= 10;

  if (code.todoFixmeCount <= 3) codeQuality += 5;
  else if (code.todoFixmeCount > 10) codeQuality -= 10;

  // Language diversity bonus
  const langCount = Object.keys(code.languages).length;
  if (langCount >= 3) codeQuality += 5;

  codeQuality = Math.min(100, Math.max(0, codeQuality));

  // Documentation (20%) — README quality,  // Documentation
  let documentation = 0;
  if (docs.hasReadme) {
    documentation += 20;
    if (docs.readmeWordCount > 300) documentation += 20;
    else if (docs.readmeWordCount > 100) documentation += 10;
    if (docs.hasBadges) documentation += 10;
    if (docs.hasTOC) documentation += 10;
    if (docs.hasIstinyeLogo) documentation += 5;
    if (docs.hasInstructorInfo) documentation += 5;
  }
  if (docs.markdownFileCount > 2) documentation += 15;
  else if (docs.markdownFileCount > 1) documentation += 10;
  if (docs.hasDocsFolder) documentation += 15;

  documentation = Math.min(100, Math.max(0, documentation));
  if (docs.hasLicense) documentation = Math.min(100, documentation + 5);

  // Repo Professionalism (15%) — structure, CI/CD, Docker, etc.
  // Repo Professionalism
  let repoProfessionalism = 0;
  if (repo.hasGitignore) repoProfessionalism += 15;
  if (repo.hasGitAttributes) repoProfessionalism += 10;
  if (repo.hasCICD) repoProfessionalism += 25;
  if (repo.hasDockerfile) repoProfessionalism += 20;
  if (repo.hasEnvExample) repoProfessionalism += 10;
  if (repo.hasEnv) repoProfessionalism -= 20; // bad practice to push .env
  
  if (repo.directoryDepth >= 2) repoProfessionalism += 10;
  if (repo.topLevelDirs.length >= 2) repoProfessionalism += 10;

  if (repo.hasMakefile || repo.hasPackageJson || repo.hasCargotoml) {
    repoProfessionalism += 20;
  } 
  repoProfessionalism = Math.min(100, Math.max(0, repoProfessionalism));

  const codeCombined = (codeVolume + codeQuality) / 2;

  // Find AI grade if exists
  let aiDepthScore = code.technicalDepthScore;
  try {
     const coursePrefix = sub.course_id === 'web-security' ? 'secure-web' : sub.course_id;
     const fsAPI = require("fs");
     const pathAPI = require("path");
     const aiFile = fsAPI.readFileSync(pathAPI.join(process.cwd(), 'api/data/ai-grading-last', sub.student_id + '-' + coursePrefix + '.json'), 'utf-8');
     const aiData = JSON.parse(aiFile);
     if (aiData.ai_review_score != null) {
         aiDepthScore = Math.round((aiData.ai_review_score / 30) * 100);
         code.technicalDepthScore = aiDepthScore; // Override the object property as well
     }
  } catch (e) {
      // Ignore if not present
  }

  // Weighted total
  const totalWeighted = Math.round(
    ((commitActivity * 0.10 +
    timeInvestment * 0.05 +
    codeCombined * 0.10 +
    documentation * 0.10 +
    repoProfessionalism * 0.10 +
    aiDepthScore * 0.25) / 70) * 100
  );

  return {
    commitActivity: Math.round(commitActivity),
    timeInvestment: Math.round(timeInvestment),
    codeVolume: Math.round(codeVolume),
    codeQuality: Math.round(codeQuality),
    documentation: Math.round(documentation),
    repoProfessionalism: Math.round(repoProfessionalism),
    totalWeighted,
    videoDemoBonus: 0, // will be set by gradeSubmission
  };
}

// ────────────────────────── Clone & Grade ──────────────────────────

function cloneRepo(repoUrl: string, destDir: string): boolean {
  if (fs.existsSync(destDir) && fs.existsSync(path.join(destDir, '.git'))) {
    log(`Using cached clone, pulling latest changes: ${destDir}`);
    const pullResult = spawnSync("git", ["pull"], { cwd: destDir, encoding: "utf-8" });
    if (pullResult.status !== 0) {
      warn(`Failed to git pull in ${destDir}. Error: ${pullResult.stderr}`);
    }
    return true;
  }

  // Clean up any failed partial clone
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }

  const cleanUrl = sanitizeRepoUrl(repoUrl);
  log(`Cloning ${cleanUrl} → ${destDir}`);
  fs.mkdirSync(destDir, { recursive: true });

  const result = spawnSync("git", ["clone", cleanUrl, destDir], {
    encoding: "utf-8",
    timeout: 120000,
  });

  if (result.status !== 0) {
    error(`Clone failed: ${result.stderr}`);
    // Clean up failed clone dir
    fs.rmSync(destDir, { recursive: true, force: true });
    return false;
  }

  return true;
}

async function gradeSubmission(sub: Submission): Promise<GradingReport | null> {
  const repoDir = makeCloneDir(sub);

  if (!cloneRepo(sub.github_repo, repoDir)) {
    error(`Failed to clone ${sub.github_repo}`);
    return null;
  }

  log(`Extracting metrics for ${sub.student_name} (${sub.student_id})...`);

  const git = extractGitMetrics(repoDir);
  const code = await extractCodeMetrics(repoDir);
  const docs = extractDocMetrics(repoDir);
  const repo = extractRepoMetrics(repoDir);
  const video = extractVideoMetrics(repoDir);
  const scores = calculateScores(git, code, docs, repo, sub);

  // Apply video demo bonus
  scores.videoDemoBonus = video.hasVideoDemo ? 10 : 0;

  return {
    submission: sub,
    clonedAt: new Date().toISOString(),
    repoPath: repoDir,
    git,
    code,
    docs,
    repo,
    video,
    scores,
  };
}

// ────────────────────────── Main ──────────────────────────

async function main() {
  console.log("\n\x1b[1m╔══════════════════════════════════════════╗\x1b[0m");
  console.log("\x1b[1m║  q-sec-courses Auto-Grading Engine v1.0  ║\x1b[0m");
  console.log("\x1b[1m╚══════════════════════════════════════════╝\x1b[0m\n");

  let submissions: Submission[] = [];

  // Mode 1: Direct repo grading
  if (directRepo) {
    submissions = [{
      id: "direct",
      timestamp: new Date().toISOString(),
      student_name: getArg("name") || "Unknown",
      student_id: getArg("student-id") || "direct-" + Date.now(),
      course_id: getArg("course") || "unknown",
      project_title: getArg("title") || "Direct Evaluation",
      github_repo: directRepo,
      description: "",
    }];
    log(`Direct mode: grading ${directRepo}`);
  }
  // Mode 2: From API or local submissions.json
  else if (apiBase) {
    // Fetch from remote API
    try {
      submissions = await fetchSubmissionsFromApi(apiBase);
      log(`Loaded ${submissions.length} submissions from API (${apiBase})`);
    } catch (e: unknown) {
      error(`Failed to fetch from API: ${e instanceof Error ? e.message : String(e)}`);
      error("Falling back to local submissions.json...");
      if (fileExists(SUBMISSIONS_FILE)) {
        submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, "utf-8"));
      } else {
        error(`No local fallback found either.`);
        process.exit(1);
      }
    }

    // Apply filters
    if (filterCourse) {
      submissions = submissions.filter(s => s.course_id === filterCourse);
      log(`Filtered by course: ${filterCourse} → ${submissions.length} submissions`);
    }
    if (filterStudentIds.length > 0) {
      submissions = submissions.filter(s => filterStudentIds.includes(s.student_id));
      log(`Filtered by students: ${filterStudentIds.join(', ')} → ${submissions.length} submissions`);
    }
    if (!hasFlag("all")) {
      submissions = submissions.filter(s => s.status !== "graded" && s.status !== "approved");
    }
    log(`Pending (ungraded): ${submissions.length}`);
  }
  // Mode 3: Local submissions.json
  else {
    if (!fileExists(SUBMISSIONS_FILE)) {
      error(`No submissions file found at ${SUBMISSIONS_FILE}`);
      error("Tip: Use --api-base https://example.com/api to fetch from remote or --repo for direct grading");
      process.exit(1);
    }

    const raw = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, "utf-8"));
    submissions = Array.isArray(raw) ? raw : [];

    log(`Loaded ${submissions.length} submissions from local database`);

    // Apply filters
    if (filterCourse) {
      submissions = submissions.filter(s => s.course_id === filterCourse);
      log(`Filtered by course: ${filterCourse} → ${submissions.length} submissions`);
    }
    if (filterStudentIds.length > 0) {
      submissions = submissions.filter(s => filterStudentIds.includes(s.student_id));
      log(`Filtered by students: ${filterStudentIds.join(', ')} → ${submissions.length} submissions`);
    }

    // Skip already graded unless --all is passed
    if (!hasFlag("all")) {
      submissions = submissions.filter(s => s.status !== "graded" && s.status !== "approved");
    }
    log(`Pending (ungraded): ${submissions.length}`);
  }

  if (submissions.length === 0) {
    warn("No submissions to grade.");
    process.exit(0);
  }

  // Ensure output dirs
  fs.mkdirSync(CLONE_DIR, { recursive: true });
  fs.mkdirSync(GRADING_HISTORY_DIR, { recursive: true });
  fs.mkdirSync(GRADING_LATEST_DIR, { recursive: true });

  const reports: GradingReport[] = [];

  for (const sub of submissions) {
    console.log(`\n${"─".repeat(60)}`);
    log(`\x1b[1m📋 ${sub.student_name}\x1b[0m (${sub.student_id})`);
    log(`   Course: ${sub.course_id}`);
    log(`   Repo:   ${sub.github_repo}`);
    console.log("─".repeat(60));

    const report = await gradeSubmission(sub);
    if (report) {
      reports.push(report);
      printReport(report);

      // Push to API immediately after each grading (if in API mode)
      if (apiBase) {
        await pushGradeToApi(apiBase, report);
      }
    }
  }

  // Write reports separately into grading-history and grading-latest
  const ts = Date.now();
  for (const r of reports) {
    const sId = r.submission.student_id;
    // Normalize course name since submission courses map to folder names slightly differently
    const cId = r.submission.course_id === 'web-security' ? 'secure-web' : r.submission.course_id;

    const histDir = path.join(GRADING_HISTORY_DIR, cId);
    if (!fs.existsSync(histDir)) fs.mkdirSync(histDir, { recursive: true });
    
    const histFile = path.join(histDir, `${sId}.json`);
    let history = [];
    if (fs.existsSync(histFile)) {
      history = JSON.parse(fs.readFileSync(histFile, "utf-8"));
    }
    
    const modularReport = {
      timestamp: ts,
      student_name: r.submission.student_name,
      student_id: sId,
      course_id: cId,
      git: r.git,
      code: r.code,
      video: r.video,
      scores: r.scores
    };
    
    history.push(modularReport);
    history.sort((a:any, b:any) => a.timestamp - b.timestamp);
    fs.writeFileSync(histFile, JSON.stringify(history, null, 2));

    const latestDir = path.join(GRADING_LATEST_DIR, cId);
    if (!fs.existsSync(latestDir)) fs.mkdirSync(latestDir, { recursive: true });
    
    fs.writeFileSync(path.join(latestDir, `${sId}.json`), JSON.stringify(modularReport, null, 2));
  }
  
  log(`\n✅ Reports successfully modularized and saved across student files.`);

  // Summary table
  console.log("\n\x1b[1m═══════════════════ SUMMARY ═══════════════════\x1b[0m\n");
  console.log("┌─────────────────────────┬────────┬────────┬────────┬────────┬────────┬────────┬─────────┐");
  console.log("│ Student                 │ Commit │ Time   │ LOC    │ Quality│ Docs   │ Repo   │ TOTAL   │");
  console.log("├─────────────────────────┼────────┼────────┼────────┼────────┼────────┼────────┼─────────┤");
  for (const r of reports) {
    const s = r.scores;
    const name = r.submission.student_name.padEnd(23).slice(0, 23);
    console.log(
      `│ ${name} │ ${pad(s.commitActivity)} │ ${pad(s.timeInvestment)} │ ${pad(s.codeVolume)} │ ${pad(s.codeQuality)} │ ${pad(s.documentation)} │ ${pad(s.repoProfessionalism)} │ ${pad(s.totalWeighted, 7)} │`
    );
  }
  console.log("└─────────────────────────┴────────┴────────┴────────┴────────┴────────┴────────┴─────────┘");

  if (dryRun) {
    log("\n🔍 Dry run complete. No evaluations generated.");
  } else {
    log(`\n📊 ${reports.length} reports generated. Review and run with Antigravity to generate ProposalData JSONs.`);
  }
}

function pad(n: number, width = 6): string {
  const str = n.toString();
  return str.padStart(width);
}

function printReport(r: GradingReport) {
  const { git, code, docs, repo, scores } = r;

  console.log(`\n  \x1b[1mGit Activity\x1b[0m`);
  console.log(`    Commits: ${git.totalCommits} │ Authors: ${git.authors.join(", ")} │ Branches: ${git.branchCount}`);
  console.log(`    Time span: ${git.timeSpanDays} days (${git.firstCommitDate} → ${git.lastCommitDate})`);
  console.log(`    Working sessions: ${git.workingSessions} │ Avg commits/day: ${git.avgCommitsPerDay}`);

  console.log(`\n  \x1b[1mCode Metrics\x1b[0m`);
  console.log(`    Files: ${code.totalFiles} │ Total lines: ${code.totalLines} │ Code: ${code.codeLines} │ Comments: ${code.commentLines} │ Blank: ${code.blankLines}`);
  console.log(`    Comment ratio: ${(code.commentRatio * 100).toFixed(1)}% │ TODO/FIXME: ${code.todoFixmeCount} │ Avg func length: ${code.avgFunctionLength}`);
  console.log(`    Largest file: ${code.largestFile.path} (${code.largestFile.lines} lines)`);
  console.log(`    Languages: ${Object.entries(code.languages).map(([l, d]) => `${l}(${d.files}f/${d.lines}L)`).join(", ")}`);

  console.log(`\n  \x1b[1mDocumentation\x1b[0m`);
  console.log(`    README: ${docs.hasReadme ? `✅ (${docs.readmeLines}L, ${docs.readmeWordCount}w)` : "❌ MISSING"} │ Markdown files: ${docs.markdownFileCount} │ Total doc lines: ${docs.totalDocLines}`);
  console.log(`    License: ${docs.hasLicense ? "✅" : "❌"} │ Changelog: ${docs.hasChangelog ? "✅" : "❌"} │ Contributing: ${docs.hasContributing ? "✅" : "❌"}`);

  console.log(`\n  \x1b[1mRepo Structure\x1b[0m`);
  console.log(`    .gitignore: ${repo.hasGitignore ? "✅" : "❌"} │ CI/CD: ${repo.hasCICD ? `✅ (${repo.cicdType})` : "❌"} │ Docker: ${repo.hasDockerfile ? "✅" : "❌"}`);
  console.log(`    Depth: ${repo.directoryDepth} │ Dirs: [${repo.topLevelDirs.join(", ")}]`);

  console.log(`\n  \x1b[1m📊 Scores\x1b[0m`);
  console.log(`    Commit Activity:     ${scoreBar(scores.commitActivity)} ${scores.commitActivity}/100`);
  console.log(`    Time Investment:     ${scoreBar(scores.timeInvestment)} ${scores.timeInvestment}/100`);
  console.log(`    Code Volume:         ${scoreBar(scores.codeVolume)} ${scores.codeVolume}/100`);
  console.log(`    Code Quality:        ${scoreBar(scores.codeQuality)} ${scores.codeQuality}/100`);
  console.log(`    Documentation:       ${scoreBar(scores.documentation)} ${scores.documentation}/100`);
  console.log(`    Repo Professional:   ${scoreBar(scores.repoProfessionalism)} ${scores.repoProfessionalism}/100`);
  console.log(`    ─────────────────────────────────────────`);
  console.log(`    \x1b[1mWeighted Total:      ${scoreBar(scores.totalWeighted)} ${scores.totalWeighted}/100\x1b[0m`);

  console.log(`\n  \x1b[1m🎬 Video Demo\x1b[0m`);
  console.log(`    Has Video Demo:  ${r.video.hasVideoDemo ? '\x1b[32m✅ YES (+10 BONUS)\x1b[0m' : '\x1b[31m❌ NO\x1b[0m'}`);
  if (r.video.videoFiles.length > 0) console.log(`    Video Files:     ${r.video.videoFiles.join(', ')}`);
  if (r.video.hasReadmeEmbed) console.log(`    README Embed:    ✅`);
  if (r.video.hasExternalVideoLink) console.log(`    External Link:   ${r.video.videoLinkUrl}`);
  if (r.video.hasDemoDir) console.log(`    Demo Directory:  ✅`);
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  let color = "\x1b[32m"; // green
  if (score < 50) color = "\x1b[31m"; // red
  else if (score < 70) color = "\x1b[33m"; // yellow
  return `${color}${"█".repeat(filled)}${"░".repeat(empty)}\x1b[0m`;
}

main().catch(e => {
  error(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
