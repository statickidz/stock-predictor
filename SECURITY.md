# Security

Stock Predictor is a local, personal research application. It is not designed as a hardened public or multi-tenant service. Forecasts do not execute trades.

## Deployment scope

Keep the default loopback bind (`127.0.0.1`). For remote access, set a long, random `KRONOS_API_TOKEN` and use an SSH tunnel or a TLS reverse proxy with appropriate access controls. The optional bearer token protects API routes; the application itself does not terminate TLS. See [configuration](docs/configuration.md) for details.

Use trusted model sources and review dependency and upstream changes. Keep tokens, `.env`, private logs, and downloaded weights out of version control. If a token is exposed, replace it and restart the application.

## Reporting a vulnerability

Use the repository's **Security → Report a vulnerability** option if private vulnerability reporting is enabled. Otherwise, use a contact method listed by the repository owner on their GitHub profile. Do not put exploit details, credentials, or sensitive logs in public issues.

Include the affected commit or version, deployment context, impact, and minimal reproduction steps with secrets removed. This personal project does not offer a guaranteed response time or a formal security support lifecycle.
