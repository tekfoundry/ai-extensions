export interface DiscoveredSkill {
  path: string;
  name: string;
}

export interface ListedSkill extends DiscoveredSkill {
  installCommand: string;
}
