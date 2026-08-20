# Security Policy

This plugin runs local code in the workspace selected by the user. Treat it like
any other DSH plugin: review the source before installing it in a sensitive
environment.

## Supported Version

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |

## Secrets

The plugin does not require API keys, market-data credentials, model-provider
configuration, or GitHub tokens.

Benchmark stdout and stderr are lightly redacted before being returned to the
agent. Do not rely on that as a secret-management boundary. Keep credentials out
of benchmark commands, environment dumps, and issue reports.

## Reporting

Please open a private security advisory on GitHub if you find a vulnerability
that could leak local files, credentials, or unexpected network data. For normal
bugs or documentation problems, use a public issue.
