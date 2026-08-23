import {
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import {
  execSync,
} from "node:child_process";
import {
  join,
  resolve,
} from "node:path";

const root =
  process.cwd();

const destination =
  resolve(
    root,
    "apps/api/dist/sdk-download",
  );

rmSync(
  destination,
  {
    recursive: true,
    force: true,
  },
);

mkdirSync(
  destination,
  {
    recursive: true,
  },
);

const npmCommand =
  process.platform === "win32"
    ? "npm.cmd"
    : "npm";

execSync(
  `${npmCommand} pack --workspace=@controlpact/sdk --pack-destination "${destination}"`,
  {
    cwd: root,
    stdio: "inherit",
  },
);

const archives =
  readdirSync(
    destination,
  ).filter(
    (name) =>
      name.endsWith(".tgz"),
  );

if (archives.length !== 1) {
  throw new Error(
    `Expected one SDK tarball, found ${archives.length}.`,
  );
}

const finalName =
  "controlpact-sdk-0.1.0.tgz";

if (
  archives[0] !==
    finalName
) {
  renameSync(
    join(
      destination,
      archives[0],
    ),
    join(
      destination,
      finalName,
    ),
  );
}

console.log(
  `Commercial SDK package ready: apps/api/dist/sdk-download/${finalName}`,
);
