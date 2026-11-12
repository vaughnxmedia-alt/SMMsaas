import {
  stateHelp,
  stateLabels,
  type ConnectionState,
} from "@/lib/social/catalog";
export function ConnectionStatus({ state }: { state: ConnectionState }) {
  return (
    <span
      className={`connection-status state-${state.toLowerCase()}`}
      title={stateHelp[state]}
    >
      <i />
      {stateLabels[state]}
    </span>
  );
}
