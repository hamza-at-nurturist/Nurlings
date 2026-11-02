import "../../src/styles.css";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MiniAppViewer } from "../../src/components/MiniAppViewer";
import { financeApp, financeData } from "../../src/lib/mini-app/finance-example";
import { leadPipelineApp, leadPipelineData } from "../../src/lib/mini-app/lead-pipeline-example";
import { outreachApp, outreachData } from "../../src/lib/mini-app/outreach-example";

i18n.loadAndActivate({ locale: "en", messages: {} });

/** A mini app as the Artifacts screen draws it, with fixed data and no chat behind it. */
function Fixture() {
  const [asked, setAsked] = useState("");
  const which = new URLSearchParams(location.search).get("app");
  const app =
    which === "finance"
      ? { source: financeApp, data: financeData }
      : which === "outreach"
        ? { source: outreachApp, data: outreachData }
        : { source: leadPipelineApp, data: leadPipelineData };
  return (
    <I18nProvider i18n={i18n}>
      <div style={{ height: which === "outreach" ? "100vh" : "80vh" }}>
        <MiniAppViewer source={app.source} loadData={async () => app.data} onAskBot={setAsked} />
      </div>
      <output data-testid="asked">{asked}</output>
    </I18nProvider>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Fixture />);
