# Proposal

## Why

After several merges to `main`, the test server still reported the commit of an older merge even
though each publish finished in order and each redeploy request was accepted. A redeploy only
starts what the server already has unless the compose file tells it to pull, so a moved `edge`
tag is not always fetched. An earlier webhook deploy did pull correctly, and manual deploys during
a volume reset overlapped with the later ones, so the failure is intermittent and the exact trigger
is not proven. Making the pull explicit removes the dependence on whatever Coolify decides.

## What Changes

- Every first-party image service in the Coolify compose file (api, worker, web, supervisor and
  the bot computer image) gets `pull_policy: ${NURLINGS_PULL_POLICY:-missing}`.
- The default stays `missing`, which is what a client server on a release tag gets today. Only
  `nurlings-test` sets `NURLINGS_PULL_POLICY=always`, so each redeploy pulls the moved `edge` tag.
- The runbook documents the variable, the test-server setup step, and the check that follows a
  merge.
- A compose test pins that all five services carry the variable with the safe default and that the
  file never hardcodes `always`.

Not changed: the publish workflow (its runs are already serialized and in order), the deploy
webhook, the images, and any client server's behaviour.

## Impact

- Capability: `coolify-deployment`.
- Existing test servers and client servers must paste the updated compose file into Coolify for
  the variable to exist; until then nothing changes for them.
- No migration and no application code.
