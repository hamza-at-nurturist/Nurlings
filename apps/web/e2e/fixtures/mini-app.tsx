import "../../src/styles.css";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MiniAppViewer } from "../../src/components/MiniAppViewer";
import { leadPipelineApp, leadPipelineData } from "../../src/lib/mini-app/lead-pipeline-example";

i18n.loadAndActivate({ locale: "en", messages: {} });

/** The lead pipeline as the Artifacts screen draws it, with fixed data and no chat behind it. */
function Fixture() {
  const [asked, setAsked] = useState("");
  return (
    <I18nProvider i18n={i18n}>
      <div style={{ height: "80vh" }}>
        <MiniAppViewer
          source={leadPipelineApp}
          loadData={async () => leadPipelineData}
          onAskBot={setAsked}
        />
      </div>
      <output data-testid="asked">{asked}</output>
    </I18nProvider>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Fixture />);
