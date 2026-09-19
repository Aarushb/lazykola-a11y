#!/usr/bin/env node
// Walks through deploying the lazykola comment server end to end: installs
// dependencies, creates the D1 database, writes its id into wrangler.toml,
// pushes the schema, asks for the admin password (via wrangler's own
// interactive prompt, this script never sees or stores it), deploys the
// Worker, and prints the conf.py snippet with the real deployed URL filled
// in. Stops and explains itself on the first thing that fails, rather than
// pressing on with a half-configured setup. Safe to re-run: it detects a
// database id already in wrangler.toml and skips straight past creating one.
//
// Usage:
//   node setup.js               full setup, ends with a live public deploy
//   node setup.js --skip-deploy everything up through the admin password,
//                                but skip the final deploy, for testing
//                                locally first via `npm run dev` and going
//                                live later with `npm run deploy`

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const WRANGLER_TOML = path.join(ROOT, "wrangler.toml");
const SKIP_DEPLOY = process.argv.includes("--skip-deploy");
const TOTAL_STEPS = SKIP_DEPLOY ? 5 : 6;

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

async function main() {
  console.log("lazykola comment server setup\n");

  console.log("1/" + TOTAL_STEPS + " Installing dependencies (npm install)...");
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

  if (SKIP_DEPLOY) {
    console.log(`\n5/${TOTAL_STEPS} Skipping deploy (--skip-deploy).`);
    console.log("\nDatabase and admin password are set up. To test locally:");
    console.log("  npm run dev");
    console.log('  Then set COMMENT_SYSTEM_ID = "http://localhost:8787" in your Nikola conf.py while testing.');
    console.log("\nWhen you're ready to go live:");
    console.log("  npm run deploy");
    console.log("  Then copy the URL it prints into COMMENT_SYSTEM_ID in conf.py.");
    return;
  }

  console.log(`\n5/${TOTAL_STEPS} Deploying the Worker...`);
  let deployOutput;
  try {
    deployOutput = await run("npx", ["wrangler", "deploy"], { captureOutput: true });
  } catch (err) {
    fail("wrangler deploy", err);
  }

  const urlMatch = deployOutput.match(/https:\/\/[^\s]+\.workers\.dev/);
  if (!urlMatch) {
    console.log("\nDeployed, but couldn't find the Worker URL in the output above to auto-fill the snippet below.");
    console.log("Copy the URL wrangler printed above and use it in place of the placeholder below.");
  }
  const workerUrl = urlMatch ? urlMatch[0] : "https://your-comments-worker.yourname.workers.dev";

  console.log("\nDone. Add this to your Nikola site's conf.py:\n");
  console.log("COMMENT_SYSTEM = \"lazykola\"");
  console.log(`COMMENT_SYSTEM_ID = "${workerUrl}"`);
  console.log("\nOptional extras (Turnstile, Discord alerts, auto-approve) are in README.md if you want them.");
}

main();
