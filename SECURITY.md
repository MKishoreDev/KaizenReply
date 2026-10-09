# Security Policy

KaizenReply is committed to ensuring the security and privacy of our users, contributors, and the broader open-source community.

## Supported Versions

Security updates and patches are provided for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

We actively maintain the `main` branch. All production deployments (`https://kaizenreply.vercel.app` and associated microservices) run the latest stable commit from `main`.

---

## Reporting a Vulnerability

If you discover a security vulnerability or security bug in KaizenReply, please follow responsible disclosure guidelines. **Do not create a public GitHub issue for security vulnerabilities.**

### How to Report

1. **Email Report**:
   - Send an email directly to **[kishoredxd@gmail.com](mailto:kishoredxd@gmail.com)** with the subject line `[SECURITY] KaizenReply Vulnerability Report`.
2. **GitHub Private Vulnerability Reporting**:
   - Alternatively, submit a report via GitHub's [Advisory tab](https://github.com/mkishore-dev/kaizenreply/security/advisories/new) if enabled on the repository.

### Information to Include in Your Report

To help us investigate and triage the issue promptly, please include:
- A clear description of the vulnerability and its potential impact.
- Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
- The affected component, file, or endpoint (e.g., `/api/improve`, `/api/reply`, static assets, rate limiting).
- Environment details (browser, Python version, OS) if relevant.
- Any suggested mitigations or patches, if you have one ready.

---

## Response Timeline & Process

- **Acknowledgment**: We aim to acknowledge receipt of vulnerability reports within **48 hours**.
- **Assessment & Triage**: We will investigate, verify severity, and keep you informed of our findings within **5 business days**.
- **Fix & Patch**: A fix will be developed and verified in a private branch or local test suite.
- **Coordinated Release**: A patch will be deployed and, if appropriate, public credit will be given in release notes and changelogs (unless you prefer anonymity).

---

## Scope & Guidelines

When conducting security research on KaizenReply:
- **Respect Privacy**: Do not attempt to access, modify, or delete user or production data.
- **No Denial of Service**: Do not perform volumetric Denial of Service (DoS/DDoS) attacks against production infrastructure or third-party AI APIs (Groq, Kotowaza datasets).
- **Rate Limits**: The application enforces a per-IP rate limit of 30 requests per minute on AI endpoints to protect API quotas. Please respect these limits during testing.
- **Local Testing**: Whenever possible, reproduce potential vulnerabilities locally using `uvicorn app.main:app` and your own test environment.

Thank you for helping keep KaizenReply safe, stable, and reliable for everyone.
