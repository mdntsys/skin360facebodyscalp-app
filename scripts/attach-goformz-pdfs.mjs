// Attach exported GoFormz PDFs to client profiles: storage upload + an
// intake_forms row per file, matched to the client by the name printed inside
// each PDF (GoFormz keeps a text layer for filled fields).
//
// Usage:
//   1. Export the completed forms from GoFormz into one folder.
//   2. Dry run (no writes, prints the match table):
//        node scripts/attach-goformz-pdfs.mjs --dir ~/Downloads/goformz --dry-run
//   3. Real run (signs into the app as an allow-listed user; set env first):
//        APP_LOGIN_EMAIL=... APP_LOGIN_PASSWORD=... \
//          node scripts/attach-goformz-pdfs.mjs --dir ~/Downloads/goformz
//
// Text extraction uses the `pdftotext` binary (brew install poppler).
// Unmatched files are listed at the end — attach those by hand with the
// client profile's "Upload Scan" button.
//
// Idempotent: files already attached (same storage path) are skipped.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const dirIdx = args.indexOf("--dir");
const DIR = dirIdx >= 0 ? resolve(args[dirIdx + 1]) : null;
const DRY = args.includes("--dry-run");
if (!DIR || !existsSync(DIR)) {
  console.error("Pass --dir <folder of exported PDFs>");
  process.exit(1);
}

// .env.local supplies the Supabase URL + publishable key (same as the app).
const envFile = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

function pdfText(path) {
  try {
    return execFileSync("pdftotext", ["-f", "1", "-l", "2", path, "-"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

const norm = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ");

async function main() {
  if (!DRY) {
    const email = process.env.APP_LOGIN_EMAIL;
    const password = process.env.APP_LOGIN_PASSWORD;
    if (!email || !password) {
      console.error("Set APP_LOGIN_EMAIL and APP_LOGIN_PASSWORD (an allow-listed app user).");
      process.exit(1);
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Sign-in failed:", error.message);
      process.exit(1);
    }
  } else {
    // Dry run still needs read access for the client list.
    const email = process.env.APP_LOGIN_EMAIL;
    const password = process.env.APP_LOGIN_PASSWORD;
    if (email && password) {
      await supabase.auth.signInWithPassword({ email, password });
    }
  }

  const { data: clients, error: cErr } = await supabase
    .from("clients")
    .select("id, first_name, last_name");
  if (cErr || !clients?.length) {
    console.error("Couldn't load clients (are you signed in?):", cErr?.message);
    process.exit(1);
  }

  const { data: existing } = await supabase
    .from("intake_forms")
    .select("file_path")
    .not("file_path", "is", null);
  const attached = new Set((existing ?? []).map((r) => r.file_path));

  const files = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
  console.log(`${files.length} PDFs in ${DIR}, ${clients.length} clients to match against\n`);

  const unmatched = [];
  let done = 0, skipped = 0;

  for (const file of files) {
    const text = norm(pdfText(join(DIR, file)));
    // Best match: the client whose full name appears in the PDF text.
    // Longest name wins so "Maria Lopez Garcia" beats "Maria Lopez".
    const match = clients
      .filter((c) => {
        const full = norm(`${c.first_name} ${c.last_name}`).trim();
        return full.length > 3 && text.includes(full);
      })
      .sort((a, b) =>
        (`${b.first_name} ${b.last_name}`.length) - (`${a.first_name} ${a.last_name}`.length)
      )[0];

    if (!match) {
      unmatched.push(file);
      console.log(`  ✗ UNMATCHED  ${file}`);
      continue;
    }

    const path = `${match.id}/goformz-${file.replace(/[^\w.\- ]+/g, "_")}`;
    if (attached.has(path)) {
      skipped++;
      console.log(`  – already attached  ${file}`);
      continue;
    }
    console.log(`  ✓ ${file}  →  ${match.first_name} ${match.last_name}`);
    if (DRY) continue;

    const bytes = readFileSync(join(DIR, file));
    const { error: upErr } = await supabase.storage
      .from("client-files")
      .upload(path, bytes, { contentType: "application/pdf" });
    if (upErr && !upErr.message.includes("already exists")) {
      console.error(`    upload failed: ${upErr.message}`);
      unmatched.push(file);
      continue;
    }
    const { error: insErr } = await supabase.from("intake_forms").insert({
      client_id: match.id,
      name: file.replace(/\.pdf$/i, "") + " (GoFormz)",
      file_type: "PDF",
      size_kb: Math.max(1, Math.round(bytes.length / 1024)),
      file_path: path,
    });
    if (insErr) {
      console.error(`    record failed: ${insErr.message}`);
      continue;
    }
    done++;
  }

  console.log(`\n${DRY ? "DRY RUN — nothing written. " : ""}attached: ${done}, already there: ${skipped}, unmatched: ${unmatched.length}`);
  if (unmatched.length) {
    console.log("\nAttach these by hand (client profile → Upload Scan):");
    for (const f of unmatched) console.log(`  - ${f}`);
  }
}

main();
