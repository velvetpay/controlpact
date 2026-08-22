type AgentDecision = {
  id: string;
  agent: string;
  action: string;
  decision:
    | "ALLOW"
    | "APPROVE"
    | "BLOCK";
  policy: string;
  time: string;
};

type AgentsPanelProps = {
  decisions: AgentDecision[];
  apiKeyConnected: boolean;
};

export default function AgentsPanel({
  decisions,
  apiKeyConnected,
}: AgentsPanelProps) {
  const agents =
    Array.from(
      decisions.reduce(
        (
          map,
          item,
        ) => {
          const current =
            map.get(
              item.agent,
            );

          if (!current) {
            map.set(
              item.agent,
              {
                id: item.agent,
                count: 1,
                latestAction:
                  item.action,
                latestDecision:
                  item.decision,
                latestPolicy:
                  item.policy,
                latestTime:
                  item.time,
              },
            );
          } else {
            current.count += 1;
          }

          return map;
        },
        new Map<
          string,
          {
            id: string;
            count: number;
            latestAction: string;
            latestDecision:
              | "ALLOW"
              | "APPROVE"
              | "BLOCK";
            latestPolicy: string;
            latestTime: string;
          }
        >(),
      ).values(),
    );

  return (
    <section
      id="agents"
      className="panel agents-panel"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            OBSERVED AGENT ACTIVITY
          </p>
          <h3>Agents</h3>
        </div>

        <span
          className={
            apiKeyConnected
              ? "live-chip"
              : "api-key-required-chip"
          }
        >
          {apiKeyConnected
            ? "AGENT ACCESS READY"
            : "API KEY REQUIRED"}
        </span>
      </div>

      <p className="agents-copy">
        Agents appear here after they call
        the ControlPact decision API with
        an organisation API key.
      </p>

      {agents.length === 0 ? (
        <div className="agent-empty">
          No agent activity recorded yet.
        </div>
      ) : (
        <div className="agent-grid">
          {agents.map(
            (agent) => (
              <article
                className="agent-card"
                key={agent.id}
              >
                <div className="agent-card-top">
                  <strong>
                    {agent.id}
                  </strong>

                  <span
                    className={`decision decision-${agent.latestDecision.toLowerCase()}`}
                  >
                    {agent.latestDecision}
                  </span>
                </div>

                <span>
                  Latest action:{" "}
                  <strong>
                    {agent.latestAction}
                  </strong>
                </span>

                <span>
                  Policy:{" "}
                  {agent.latestPolicy}
                </span>

                <small>
                  {agent.count} recorded
                  decision
                  {agent.count === 1
                    ? ""
                    : "s"}{" "}
                  - last activity{" "}
                  {agent.latestTime}
                </small>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}