# Security

The default deployment is a public static site. Imported files stay in the browser; forecasts execute no trades and require no secrets. Every file in dist is public. Do not place private data, tokens or credentials there.

SHA-256 validation detects corrupted model transfers/caches. It does not protect against a compromised trusted site/manifest. Review pinned weight sources, dependencies and workflow permissions. The builder uploads a whitelist of browser/model/data assets, not the repository.

Use HTTPS/localhost for WebGPU and Cache Storage. Large models may exceed browser memory. Imported JSON is size-limited, validated and rendered as text. Users can remove cached downloads from the interface.

Report vulnerabilities privately through GitHub reporting if enabled or a private channel listed by the repository owner. Include commit, browser, deployment context, impact and minimal reproduction with secrets/private data removed.
