# Secret scan adjudication

The required history command passes with default rules. An additional whole-working-tree default scan initially reported two findings in legacy root .env.example. Verified assignments and the following assignments are all empty; the multiline generic rule captures the next variable name. No credential values were displayed or changed.

hackathon/gitleaks.toml extends every default rule and adds a generic-rule allowlist requiring BOTH the exact root .env.example path and extracted secret equal to the literal variable name LEDGER_NOTARY_SECRET or LEDGER_VERIFY_INTERVAL_MS (optional trailing equals). It does not suppress nonempty values, arbitrary file contents, rule families, commits or line numbers. The legacy template is unchanged.

Three isolated synthetic scanner cases pass: empty template is allowed; a nonempty random synthetic credential in that template is detected; one in another file is detected. No live credential was used in these fixtures. Scratch is retained. Evidence: scan-config-test.json. Original redacted findings remain scan-findings.json; they are historical false positives, not unresolved leaks.

Final logs: gitleaks.txt is required default history scan; working-tree-gitleaks.txt is full working tree with --config hackathon/gitleaks.toml; product-gitleaks.txt scans hackathon without custom exceptions. Gitleaks rule-extension/AND/secret-target semantics were checked against its primary documentation: https://github.com/gitleaks/gitleaks#configuration . Local regression outcomes establish this exact installed scanner behavior.
