#!/usr/bin/env node
// Walks through deploying the lazykola comment server end to end: asks a
// few yes/no questions up front, installs dependencies, creates the D1
// database, writes its id into wrangler.toml, pushes the schema, asks for
// the admin password (via wrangler's own interactive prompt, this script
// never sees or stores it), applies whichever optional extras you said yes
// to, deploys the Worker, and either patches your site's conf.py directly
// or prints the snippet to paste in. Stops and explains itself on the
// first thing that fails, rather than pressing on with a half-configured
// setup. Safe to re-run: it detects a database id already in wrangler.toml
// and skips straight past creating one.
//
// All the interactive questions happen before anything else runs, on
// purpose: once a child process (npm, wrangler) has shared this script's
// stdin via inherited stdio, Node's readline can't reliably read from that
// same stdin afterward, so asking everything up front sidesteps it rather
// than fighting it.
//
// Usage:
//   node setup.js               full setup, ends with a live public deploy
//   node setup.js --skip-deploy everything up through the optional extras,
//                                but skip the final deploy, for testing
//                                locally first via `npm run dev` and going
//                                live later with `npm run deploy`

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");

const ROOT = __dirname;
const WRANGLER_TOML = path.join(ROOT, "wrangler.toml");
const SITE_CONF_PY = path.join(ROOT, "..", "..", "..", "conf.py");
const SKIP_DEPLOY = process.argv.includes("--skip-deploy");
const TOTAL_STEPS = SKIP_DEPLOY ? 6 : 7;

function run(cmd, args, { captureOutput = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      shell: true,
      stdio: captureOutput ? ["inherit", "pipe", "inherit"] : "inherit",
    });

    let output = "";
    if (captureOutput) {
      child.stdout.on("data", (chunk) => {
        process.stdout.write(chunk);
        output += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

// Feeds `value` to the child over a real pipe, never as a command-line
// argument, so it can't show up in a process listing for other users on
// the same machine to see (unlike `wrangler.toml` toggles, secret values
// need this).
function runWithStdinValue(cmd, args, value) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      shell: true,
      stdio: ["pipe", "inherit", "inherit"],
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
    child.stdin.write(value + "\n");
    child.stdin.end();
  });
}

function fail(step, err) {
  console.error(`\n✖ Setup stopped at: ${step}`);
  console.error(err.message || err);
  console.error("\nNothing after this step ran. Fix the issue above and re-run `node setup.js`, it's safe to re-run from the top.");
  process.exit(1);
}

function readDatabaseId() {
  const tomlContents = fs.readFileSync(WRANGLER_TOML, "utf-8");
  const match = tomlContents.match(/database_id\s*=\s*"([^"]+)"/);
  return match ? match[1] : null;
}

function readTomlVar(varName) {
  const toml = fs.readFileSync(WRANGLER_TOML, "utf-8");
  const active = toml.match(new RegExp(`^${varName}\\s*=\\s*"([^"]*)"`, "m"));
  return active ? active[1] : null;
}

function setTomlVar(varName, value, comment) {
  let toml = fs.readFileSync(WRANGLER_TOML, "utf-8");
  const activeRe = new RegExp(`^${varName}\\s*=.*$`, "m");
  const commentedRe = new RegExp(`^#\\s*${varName}\\s*=.*$`, "m");
  const newLine = `${varName} = "${value}"${comment ? " # " + comment : ""}`;
  if (activeRe.test(toml)) {
    toml = toml.replace(activeRe, newLine);
  } else if (commentedRe.test(toml)) {
    toml = toml.replace(commentedRe, newLine);
  } else {
    toml = toml.replace("[vars]", `[vars]\n${newLine}`);
  }
  fs.writeFileSync(WRANGLER_TOML, toml);
}

// Every interactive question this script ever asks, asked here, before any
// child process (npm, wrangler) has had a chance to touch this script's
// stdin. Returns a plain object of answers; nothing else in this function
// has any side effects.
async function askQuestions() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const askYesNo = async (question, defaultNo = true) => {
    const suffix = defaultNo ? " (y/N) " : " (Y/n) ";
    const answer = (await rl.question(question + suffix)).trim().toLowerCase();
    if (!answer) return !defaultNo;
    return answer.startsWith("y");
  };
  const askText = async (question) => (await rl.question(question + " ")).trim();

  console.log("A few optional questions before we start (say no to skip any of these, nothing happens if you do):\n");

  const answers = {
    turnstile: false,
    turnstileSecretKey: "",
    turnstileSiteKey: "",
    discord: false,
    discordWebhookUrl: "",
    autoApprove: false,
    hardDelete: false,
  };

  answers.turnstile = await askYesNo("Set up Cloudflare Turnstile spam protection?");
  if (answers.turnstile) {
    answers.turnstileSecretKey = await askText("  Turnstile secret key (from the Cloudflare Turnstile dashboard):");
    answers.turnstileSiteKey = await askText("  Turnstile site key (also from the dashboard, this one is public):");
  }

  answers.discord = await askYesNo("Set up Discord alerts for new comments awaiting moderation?");
  if (answers.discord) {
    answers.discordWebhookUrl = await askText("  Discord webhook URL:");
  }

  const autoApproveCurrent = readTomlVar("AUTO_APPROVE") === "true";
  answers.autoApprove = await askYesNo(
    `Auto-approve comments instead of holding them for moderation? (currently ${autoApproveCurrent ? "on" : "off"})`
  );

  const hardDeleteCurrent = readTomlVar("PRESERVE_REPLIES_ON_DELETE") === "false";
  answers.hardDelete = await askYesNo(
    `Hard-delete a comment's replies along with it, instead of preserving them? (currently ${hardDeleteCurrent ? "hard-delete" : "preserve"})`
  );

  rl.close();
  return answers;
}

// Applies whatever the user said yes to in askQuestions(). No prompting
// here, just execution, so it's safe to call after child processes have
// already shared stdin.
async function applyOptionalExtras(answers) {
  console.log(`\n5/${TOTAL_STEPS} Applying the extras you chose...`);

  if (answers.turnstile && answers.turnstileSecretKey) {
    try {
      await runWithStdinValue("npx", ["wrangler", "secret", "put", "TURNSTILE_SECRET_KEY"], answers.turnstileSecretKey);
    } catch (err) {
      fail("wrangler secret put TURNSTILE_SECRET_KEY", err);
    }
  }
  if (answers.turnstile && answers.turnstileSiteKey) {
    console.log("   Turnstile secret key set. Since the site key goes inside your existing THEME_CONFIG dict, not a new top-level line, add it yourself:");
    console.log(`     "comment_turnstile_site_key": "${answers.turnstileSiteKey}",`);
  }

  if (answers.discord && answers.discordWebhookUrl) {
    try {
      await runWithStdinValue("npx", ["wrangler", "secret", "put", "DISCORD_WEBHOOK_URL"], answers.discordWebhookUrl);
    } catch (err) {
      fail("wrangler secret put DISCORD_WEBHOOK_URL", err);
    }
  }

  if (answers.autoApprove) {
    setTomlVar("AUTO_APPROVE", "true", "Set to \"true\" to skip moderation");
    console.log("   Auto-approve turned on.");
  }

  if (answers.hardDelete) {
    setTomlVar("PRESERVE_REPLIES_ON_DELETE", "false", 'Defaults to "true"; set to "false" to hard-delete a comment\'s replies along with it');
    console.log("   Hard-delete turned on.");
  }

  if (!answers.turnstile && !answers.discord && !answers.autoApprove && !answers.hardDelete) {
    console.log("   Nothing chosen, skipping.");
  }
}

function patchSiteConfPy(commentSystemId) {
  if (!fs.existsSync(SITE_CONF_PY)) return "not-found";

  const existing = fs.readFileSync(SITE_CONF_PY, "utf-8");
  if (existing.includes("COMMENT_SYSTEM") && existing.includes("lazykola")) {
    return "already-set";
  }

  const addition =
    "\n# Added by lazykola-comment-server/setup.js\n" +
    'COMMENT_SYSTEM = "lazykola"\n' +
    `COMMENT_SYSTEM_ID = "${commentSystemId}"\n`;
  fs.appendFileSync(SITE_CONF_PY, addition);
  return "patched";
}

async function main() {
  console.log("lazykola comment server setup\n");

  const answers = await askQuestions();

  console.log(`\n1/${TOTAL_STEPS} Installing dependencies (npm install)...`);
  try {
    await run("npm", ["install"]);
  } catch (err) {
    fail("npm install", err);
  }

  let databaseId = readDatabaseId();
  if (databaseId && databaseId !== "PLACEHOLDER_D1_DATABASE_ID") {
    console.log(`\n2/${TOTAL_STEPS} Database already set up (${databaseId}), skipping creation.`);
  } else {
    console.log(`\n2/${TOTAL_STEPS} Creating the D1 database (lazykola-db)...`);
    let createOutput;
    try {
      createOutput = await run("npx", ["wrangler", "d1", "create", "lazykola-db"], { captureOutput: true });
    } catch (err) {
      fail(
        "wrangler d1 create lazykola-db\n" +
          "If this failed because a database named 'lazykola-db' already exists on your account, " +
          "either delete it from the Cloudflare dashboard first or rename the database in wrangler.toml and re-run.",
        err
      );
    }

    const idMatch = createOutput.match(/database_id\s*=\s*"([0-9a-fA-F-]+)"/);
    if (!idMatch) {
      fail(
        "parsing the database_id out of wrangler's output",
        new Error("Could not find a database_id in wrangler's output above. Copy it manually into wrangler.toml, replacing PLACEHOLDER_D1_DATABASE_ID, then re-run this script; it will detect the id is already set and skip this step.")
      );
    }
    databaseId = idMatch[1];

    const tomlContents = fs.readFileSync(WRANGLER_TOML, "utf-8");
    fs.writeFileSync(WRANGLER_TOML, tomlContents.replace("PLACEHOLDER_D1_DATABASE_ID", databaseId));
    console.log(`   wrangler.toml updated (${databaseId})`);
  }

  console.log(`\n3/${TOTAL_STEPS} Pushing the schema (production and local)...`);
  try {
    await run("npx", ["wrangler", "d1", "execute", "lazykola-db", "--file=schema.sql"]);
    await run("npx", ["wrangler", "d1", "execute", "lazykola-db", "--file=schema.sql", "--local"]);
  } catch (err) {
    fail("pushing schema.sql", err);
  }

  console.log(`\n4/${TOTAL_STEPS} Setting the admin dashboard password.`);
  console.log("   Wrangler will prompt you directly below; this script never sees or stores what you type.");
  console.log("   The login username will be 'admin'.\n");
  try {
    await run("npx", ["wrangler", "secret", "put", "ADMIN_PASSWORD"]);
  } catch (err) {
    fail("wrangler secret put ADMIN_PASSWORD", err);
  }

  await applyOptionalExtras(answers);

  if (SKIP_DEPLOY) {
    console.log(`\n6/${TOTAL_STEPS} Skipping deploy (--skip-deploy).`);
    console.log("\nDatabase, admin password, and any extras you chose are set up. To test locally:");
    console.log("  npm run dev");
    console.log('  Then set COMMENT_SYSTEM_ID = "http://localhost:8787" in your Nikola conf.py while testing.');
    console.log("\nWhen you're ready to go live:");
    console.log("  npm run deploy");
    console.log("  Then copy the URL it prints into COMMENT_SYSTEM_ID in conf.py (or re-run this script without --skip-deploy).");
    return;
  }

  console.log(`\n6/${TOTAL_STEPS} Deploying the Worker...`);
  let deployOutput;
  try {
    deployOutput = await run("npx", ["wrangler", "deploy"], { captureOutput: true });
  } catch (err) {
    fail("wrangler deploy", err);
  }

  const urlMatch = deployOutput.match(/https:\/\/[^\s]+\.workers\.dev/);
  if (!urlMatch) {
    console.log("\nDeployed, but couldn't find the Worker URL in the output above.");
    console.log("Copy the URL wrangler printed above and use it in place of the placeholder below.");
  }
  const workerUrl = urlMatch ? urlMatch[0] : "https://your-comments-worker.yourname.workers.dev";

  console.log(`\n7/${TOTAL_STEPS} Configuring your Nikola site...`);
  const patchResult = patchSiteConfPy(workerUrl);
  if (patchResult === "patched") {
    console.log(`   Added COMMENT_SYSTEM and COMMENT_SYSTEM_ID to ${SITE_CONF_PY}`);
  } else if (patchResult === "already-set") {
    console.log(`   ${SITE_CONF_PY} already has a lazykola COMMENT_SYSTEM entry, leaving it alone.`);
    console.log(`   If you want to point it at this deploy, update COMMENT_SYSTEM_ID to: ${workerUrl}`);
  } else {
    console.log(`   Couldn't find a conf.py three directories up (expected around ${SITE_CONF_PY}).`);
    console.log("   Add this to your Nikola site's conf.py yourself:\n");
    console.log("   COMMENT_SYSTEM = \"lazykola\"");
    console.log(`   COMMENT_SYSTEM_ID = "${workerUrl}"`);
  }
}

main();
