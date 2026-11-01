# The Meta Hackathon build — observed Meta route comparison

Run Spark Open and Wonder on one immutable snapshot and inspect the actual results side by side: returned model, elapsed time, tool calls and accepted/rejected structured claims. The [current desktop packet](../evidence/README.md) and [mobile packet](../evidence/README.md) retain each observed run.

The shared [substantive comparison](../evidence/investigation/summary.json) retains Wonder, Baseten and Fireworks runs on one snapshot. The current [provider pre-flight](../evidence/README.md) records each route's latest nonce/identity outcome. Use the [evidence index](../evidence/README.md) to distinguish route checks, full live investigations and controlled failure tests.

Both model families use the bounded JSON-envelope loop and read-only dispatcher. Spark Open gathers incident evidence and compares recovery choices. Wonder adds recovery narrative and counterfactual tradeoffs. The engine computes option math and the server validates exact source facts. Usage fields retain provider-supplied values; absent usage stays null.
