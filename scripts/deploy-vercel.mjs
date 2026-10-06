import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, delimiter, resolve } from "node:path";
import { parseEnv } from "node:util";

const root = resolve(import.meta.dirname, "..");
const cli = resolve(root, ".tools/vercel-cli/node_modules/vercel/dist/index.js");
const environmentFile = resolve(root, ".env.deploy.local");
const settingsFile = resolve(root, ".tools/deployment-settings.json");
const environment = {
  ...process.env,
  PATH: dirname(process.execPath) + delimiter + process.env.PATH,
  CI: "true",
};

function vercel(args, input, capture = false) {
  return execFileSync(process.execPath, [cli, ...args], {
    cwd: root,
    env: environment,
    input,
    stdio: ["pipe", capture ? "pipe" : "inherit", "inherit"],
    encoding: "utf8",
  });
}

if (!existsSync(environmentFile)) {
  const settings = {
    DEMO_MODE: "true",
    DASHBOARD_PASSWORD: randomBytes(12).toString("hex"),
    AUTH_SECRET: randomBytes(32).toString("hex"),
    CRON_SECRET: randomBytes(32).toString("hex"),
  };
  writeFileSync(environmentFile, Object.entries(settings).map(([name, value]) => `${name}=${value}`).join("\n") + "\n", { mode: 0o600 });
}
const variables = parseEnv(readFileSync(environmentFile, "utf8"));
// Vercel Marketplace 연결에서 제공한 값은 검증에 사용하며 다시 등록하지 않습니다.
const integrationFile = resolve(root, ".env.integration.local");
const integrationVariables = existsSync(integrationFile) ? parseEnv(readFileSync(integrationFile, "utf8")) : {};
const liveVariables = { ...integrationVariables, ...variables };
if (!variables.DASHBOARD_PASSWORD || (variables.AUTH_SECRET?.length ?? 0) < 32 || !variables.CRON_SECRET) {
  throw new Error("배포용 로그인 및 Cron 환경 변수를 확인해 주세요.");
}
if (variables.DEMO_MODE === "false") {
  for (const name of ["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET", "SUPABASE_URL"]) {
    if (!liveVariables[name]) throw new Error(`${name}를 .env.deploy.local에 설정해 주세요.`);
  }
  if (!liveVariables.SUPABASE_SECRET_KEY && !liveVariables.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase 서버용 키를 설정해 주세요.");
}

vercel(["whoami"]);
if (!existsSync(resolve(root, ".vercel/project.json"))) {
  let settings;
  if (existsSync(settingsFile)) settings = JSON.parse(readFileSync(settingsFile, "utf8"));
  else {
    settings = { projectName: "ecardvan-connect-monitor-" + randomBytes(3).toString("hex") };
    writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
  }
  vercel(["project", "add", settings.projectName]);
  vercel(["link", "--yes", "--project", settings.projectName]);
}

for (const [name, value] of Object.entries(variables)) {
  if (!value) continue;
  const args = ["env", "add", name, "production", "--yes", "--force"];
  args.push(name === "DEMO_MODE" ? "--no-sensitive" : "--sensitive");
  // 값을 셸 명령에 삽입하거나 로그에 출력하지 않고 표준 입력으로 전달합니다.
  vercel(args, value);
}
const output = vercel(["deploy", "--prod", "--yes"], undefined, true);
process.stdout.write(output);
let deployment;
try { deployment = JSON.parse(output); } catch { /* Older CLI releases return a plain URL. */ }
const url = deployment?.deployment?.productionUrl ?? output.match(/https:\/\/[^\s]+\.vercel\.app/)?.[0];
if (url) {
  writeFileSync(resolve(root, ".tools/deployment-result.json"), JSON.stringify({ url, mode: variables.DEMO_MODE === "true" ? "demo" : "live", deployedAt: new Date().toISOString() }, null, 2));
  writeFileSync(resolve(root, ".env.deploy.access.local"), `배포 주소: ${url}\n로그인 비밀번호: ${variables.DASHBOARD_PASSWORD}\n`, { mode: 0o600 });
}
