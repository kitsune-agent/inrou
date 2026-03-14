import { agentProfiles } from '../scoring/profiles.js';
import { formatAgentList } from '../utils/format.js';

export async function agentsCommand(options: { json: boolean }): Promise<void> {
  const agents = agentProfiles.map(p => ({
    name: p.displayName,
    description: p.description,
    keySignals: p.keySignals,
  }));

  if (options.json) {
    console.log(JSON.stringify(agents, null, 2));
  } else {
    console.log(formatAgentList(agents));
  }
}
