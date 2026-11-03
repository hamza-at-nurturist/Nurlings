## 1. Shared package

- [x] 1.1 Create `@rakazo/mini-app` with the catalog, icon list and file check moved out of the web app
- [x] 1.2 Flatten a nested spec into the flat form, with the position of any mistake
- [x] 1.3 Return a reason in words for every refusal; the web app maps the code to its own copy

## 2. Check where a bot saves

- [x] 2.1 `attach_file` refuses a broken `.app.json` and returns the reason
- [x] 2.2 `write_file` writes it and returns the reason
- [x] 2.3 Tests for both, and for files that are not mini apps

## 3. Bot guidance

- [x] 3.1 Teach the nested format in the Apps skill
- [x] 3.2 Add the "App templates" skill with a multi-screen starter
- [x] 3.3 Test that every mini app example in a skill passes the validator

## 4. Verify

- [x] 4.1 `openspec validate mini-apps-bot-authoring --strict`
- [ ] 4.2 Ask a live bot on `edge` for a dashboard and note what it gets wrong
- [ ] 4.3 Archive the change after merge
