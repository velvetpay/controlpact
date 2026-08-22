import {
  Link,
} from "react-router-dom";
import ApiKeysPanel from "../components/ApiKeysPanel";
import PageHeader from "../components/PageHeader";

type ApiKeysPageProps = {
  accessToken: string;
  activeApiKey: string;
  onActiveApiKey: (
    apiKey: string,
  ) => void;
};

export default function ApiKeysPage({
  accessToken,
  activeApiKey,
  onActiveApiKey,
}: ApiKeysPageProps) {
  return (
    <>
      <PageHeader
        eyebrow="STEP 5 · EXECUTION CREDENTIAL"
        title="API Keys"
        description="Create a scoped execution key from an existing assignment. The key inherits its environment, agent and policy authority."
        action={
          <Link
            to="/decisions"
            className="cp-flow-next-button"
          >
            Next: Decision →
          </Link>
        }
      />

      <ApiKeysPanel
        accessToken={accessToken}
        activeApiKey={activeApiKey}
        onActiveApiKey={onActiveApiKey}
      />
    </>
  );
}
