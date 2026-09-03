import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { RemediationError } from "../application/remediation-error.js";
import type { Finding, RepositorySnapshot } from "../domain/model.js";
import type {
  FileMutation,
  RemediationPlan,
  Remediator,
} from "../domain/remediation.js";

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface PackageLockV3 {
  name?: string;
  lockfileVersion: number;
  packages?: Record<
    string,
    {
      version?: string;
      resolved?: string;
      integrity?: string;
      dependencies?: Record<string, string>;
      [key: string]: unknown;
    }
  >;
  dependencies?: Record<
    string,
    {
      version?: string;
      resolved?: string;
      integrity?: string;
      requires?: Record<string, string>;
      [key: string]: unknown;
    }
  >;
  [key: string]: unknown;
}

/**
 * Static npm remediator for direct dependencies declared in package.json
 * with package-lock.json. Never executes package lifecycle scripts.
 */
export class NpmPackageLockRemediator implements Remediator {
  readonly id = "npm-package-lock";

  supports(finding: Finding): boolean {
    return (
      finding.class === "vulnerability" &&
      finding.route === "ready-for-agent" &&
      finding.packageEcosystem === "npm" &&
      Boolean(finding.packageName) &&
      Boolean(finding.fixedVersions?.[0]) &&
      (finding.target === "package-lock.json" ||
        finding.target === "package.json" ||
        finding.target === undefined)
    );
  }

  async plan(
    finding: Finding,
    root: string,
    _snapshot: RepositorySnapshot,
  ): Promise<RemediationPlan> {
    if (!this.supports(finding)) {
      throw new RemediationError(
        "unsupported-finding",
        `Finding ${finding.selectionId} is not supported by ${this.id}`,
      );
    }

    const packageName = finding.packageName!;
    const targetVersion = finding.fixedVersions![0]!;
    const packageJsonPath = join(root, "package.json");
    const lockPath = join(root, "package-lock.json");

    const previousPackageJson = await readFile(packageJsonPath, "utf8");
    const previousLock = await readFile(lockPath, "utf8");
    const packageJson = JSON.parse(previousPackageJson) as PackageJson;
    const lockfile = JSON.parse(previousLock) as PackageLockV3;

    if (lockfile.lockfileVersion !== 2 && lockfile.lockfileVersion !== 3) {
      throw new RemediationError(
        "unsupported-lockfile",
        `Unsupported package-lock.json lockfileVersion ${String(lockfile.lockfileVersion)}`,
      );
    }

    const section = findDirectDependencySection(packageJson, packageName);
    if (!section) {
      throw new RemediationError(
        "not-direct-dependency",
        `${packageName} is not a direct dependency in package.json`,
      );
    }

    const nextPackageJson = structuredClone(packageJson);
    nextPackageJson[section] = {
      ...nextPackageJson[section],
      [packageName]: targetVersion,
    };

    const nextLock = structuredClone(lockfile);
    patchLockfileDirectDependency(nextLock, packageName, targetVersion);

    const mutations: FileMutation[] = [
      {
        path: "package.json",
        previousContent: previousPackageJson,
        nextContent: `${JSON.stringify(nextPackageJson, null, 2)}\n`,
      },
      {
        path: "package-lock.json",
        previousContent: previousLock,
        nextContent: `${JSON.stringify(nextLock, null, 2)}\n`,
      },
    ];

    return {
      findingFingerprint: finding.fingerprint,
      selectionId: finding.selectionId,
      summary: `Upgrade direct dependency ${packageName} to ${targetVersion}`,
      mutations,
      validation: {
        kind: "static",
        commands: [
          "npm install --ignore-scripts --package-lock-only",
          "npm test",
        ],
        notes: [
          "Bot mode applies static manifest/lockfile edits only.",
          "Executable install/test validation is left to repository required CI.",
        ],
      },
      rollback: {
        summary: `Restore ${packageName} to ${finding.installedVersion ?? "previous version"}`,
        mutations: mutations.map((mutation) => ({
          path: mutation.path,
          previousContent: mutation.nextContent,
          nextContent: mutation.previousContent,
        })),
      },
    };
  }
}

function findDirectDependencySection(
  packageJson: PackageJson,
  packageName: string,
):
  | "dependencies"
  | "devDependencies"
  | "optionalDependencies"
  | "peerDependencies"
  | undefined {
  const sections = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ] as const;
  for (const section of sections) {
    if (packageJson[section]?.[packageName] !== undefined) {
      return section;
    }
  }
  return undefined;
}

function patchLockfileDirectDependency(
  lockfile: PackageLockV3,
  packageName: string,
  targetVersion: string,
): void {
  const packageKey = `node_modules/${packageName}`;
  const packageEntry = lockfile.packages?.[packageKey];
  if (packageEntry) {
    packageEntry.version = targetVersion;
    delete packageEntry.resolved;
    delete packageEntry.integrity;
  }

  const rootPackages = lockfile.packages?.[""];
  if (rootPackages?.dependencies?.[packageName] !== undefined) {
    rootPackages.dependencies[packageName] = targetVersion;
  }

  const legacy = lockfile.dependencies?.[packageName];
  if (legacy) {
    legacy.version = targetVersion;
    delete legacy.resolved;
    delete legacy.integrity;
  }
}
