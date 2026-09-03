import type { Remediator } from "../domain/remediation.js";
import { DockerBaseImageRemediator } from "./docker-remediator.js";
import { NpmPackageLockRemediator } from "./npm-remediator.js";
import { PythonRequirementsRemediator } from "./python-remediator.js";
import { RubyGemfileRemediator } from "./ruby-remediator.js";
import { TerraformProviderRemediator } from "./terraform-remediator.js";

export function createDefaultRemediators(): Remediator[] {
  return [
    new NpmPackageLockRemediator(),
    new PythonRequirementsRemediator(),
    new DockerBaseImageRemediator(),
    new RubyGemfileRemediator(),
    new TerraformProviderRemediator(),
  ];
}
