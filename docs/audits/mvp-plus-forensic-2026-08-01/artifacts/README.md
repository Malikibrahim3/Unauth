# Sanitized evidence artifacts

This directory contains only sanitized audit evidence. No auth tokens, cookies,
merchant identifiers, customer data, provider credentials, raw server logs or
database dumps were copied here.

The final Playwright runs passed, so they produced no failure screenshots. The
intermediate responsive defects were inspected in the test runner and fixed;
their raw screenshots/traces were not retained because they were generated
from an authenticated demo tenant. The text summaries below preserve the
reproducible result without carrying tenant data.

See the parent [`EVIDENCE_INDEX.md`](../EVIDENCE_INDEX.md) for command-level
references and limitations.
