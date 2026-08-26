import { renderTable } from "../ui/table.js";
import type { ListedRole } from "./listing.js";

interface RenderRoleListOptions {
  missingOnly?: boolean;
}

export function renderRoleList(sourceName: string, roles: ListedRole[], options: RenderRoleListOptions = {}): string {
  if (roles.length === 0) {
    return options.missingOnly
      ? `No missing roles found in source: ${sourceName}`
      : `No roles found in source: ${sourceName}`;
  }

  return renderTable(
    [
      { header: "Path", value: (role) => role.path },
      { header: "Name", value: (role) => role.name },
      { header: "Description", value: (role) => role.description },
      { header: "Install Command", value: (role) => role.installCommand }
    ],
    roles,
    { title: options.missingOnly ? `Missing roles in ${sourceName}:` : `Roles in ${sourceName}:` }
  );
}
