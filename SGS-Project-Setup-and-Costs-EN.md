# SGS Project — Cost, Tools & Access Document

> **To:** SGS Management / IT Department
> **Prepared by:** Development Team
> **Date:** 7 July 2026
> **Purpose:** Define the monthly project cost, the software to be installed on the assigned laptop, and the access required to start work.

---

## 1) Overview

This document outlines the requirements to run the SGS project in terms of **monthly subscriptions**, the **tools and software** to be installed on the laptop provided by the company, and the **permissions** required from the IT department so the developer can work without obstacles.

**Core project stack:** React 19 + Vite + TypeScript on Node.js, with a PostgreSQL database via Supabase.

> **Important note:** The cost of **server hosting** is deferred to next month (to be added once the server type is confirmed — see Section 6). The figures below cover development tools and subscriptions only.

---

## 2) Recurring Monthly Cost (Subscriptions)

> Exchange rate used: **1 USD ≈ 0.385 OMR** (the Omani Rial is pegged at a fixed rate).

| # | Item | Purpose | Cost (USD) | Cost (OMR) |
|---|------|---------|:---:|:---:|
| 1 | **Claude Code — Max 5x** | Terminal-based coding assistant; run up to **3 sub-agents** in parallel | $100 | 38.5 |
| 2 | **Supabase Pro** (database) | Managed PostgreSQL + Auth + Storage + Edge Functions | $25 | 9.6 |
| 3 | **Higgsfield AI — Plus plan** | Image & video generation (all models, 1,000 credits/month) | $49 | 18.9 |
| 4 | **Monthly internet / Wi-Fi** | Company does not provide Wi-Fi for the device; independent connection for work | ≈ $52 | 20.0 |
| | **Monthly Total** | | **≈ $226** | **≈ 87.0 OMR** |

**Alternative options (optional):**
- **Claude Code Max 20x** at $200/mo (~77 OMR) instead of Max 5x — for heavier usage.
- **Higgsfield Starter** at $15/mo (~5.8 OMR) as a cheaper option with fewer credits.
- Annual billing for Higgsfield and Supabase saves 30–50% compared to monthly.

---

## 3) Software & Tools to Install on the Laptop (Free / Open Source)

The IT department is kindly requested to install the following software **in advance** on the laptop before handover, and to allow installation and updates for them. The list is categorized, and the symbol indicates priority:
**✅ Essential (install now)** — **⭐ Future/Optional (may be used later; preferably installed or allowed to be installed).**

### 3.1 Editors & Terminal
| Software | Version | Use | Priority |
|----------|---------|-----|:---:|
| **Visual Studio Code** | latest | Primary code editor | ✅ |
| **Windows Terminal** | latest | Main working terminal | ✅ |
| **PowerShell 7** | latest | Modern command shell | ✅ |
| **Git Bash** | with Git | Linux-style shell on Windows | ✅ |
| **WSL 2** (Ubuntu) | latest | Full Linux environment inside Windows | 
| **Cursor / Notepad++** | latest | Alternative/quick editor when needed | |

### 3.2 Runtime & Package Managers
| Software | Version | Use | Priority |
|----------|---------|-----|:---:|
| **Node.js** | LTS 22.x | Runtime for React and build tools | ✅ |
| **npm** | with Node | Default package manager | ✅ |
| **nvm-windows** | latest | Easily switch Node versions | ✅ |
| **pnpm** | latest | Faster, disk-efficient package manager | |
| **Yarn** | latest | Alternative package manager |  |
| **winget / Chocolatey** | latest | Windows package manager for installing tools |  |
| **Bun** | latest | Fast alternative runtime/bundler |  |

### 3.3 Frameworks & Build
| Tool | Version | Use | Priority |
|------|---------|-----|:---:|
| **React** | 19 | Frontend library | ✅ |
| **Vite** | latest | Build tool & fast dev server | ✅ |
| **TypeScript** | latest | Typed programming language | ✅ |
| **Tailwind CSS** | latest | UI styling |  |
| **ESLint + Prettier** | latest | Linting & code formatting | ✅ |

### 3.4 Databases & Tools
| Tool | Version | Use | Priority |
|------|---------|-----|:---:|
| **PostgreSQL** | 16.x | Local database | ✅ |
| **pgAdmin 4** | latest | PostgreSQL management UI | ✅ |
| **Supabase CLI** | latest | Manage the Supabase project from the terminal | ✅ |
| **DBeaver** | latest | Universal database GUI |  |
| **TablePlus** | latest | Lightweight database GUI (alternative) |  |
| **Redis** | latest | Caching (future) |  |

### 3.5 Version Control & DevOps
| Tool | Version | Use | Priority |
|------|---------|-----|:---:|
| **Git** (Git for Windows) | latest | Version control & pushing code | ✅ |
| **GitHub CLI** (`gh`) | latest | Interact with GitHub from the terminal | ✅ |
| **GitHub Desktop** | latest | Git GUI (optional) |  |
| **Docker Desktop** | latest | Run containers | ✅ |
| **Docker Compose** | with Docker | Manage multi-container setups | ✅ |

### 3.6 API & Testing
| Tool | Version | Use | Priority |
|------|---------|-----|:---:|
| **k6** (Grafana k6) | latest | Performance & load testing | ✅ |
| **Postman** or **Insomnia** | latest | API testing | ✅ |
| **Bruno** | latest | Open-source API client (alternative) |  |
| **Vitest / Jest** | latest | Unit testing |  |
| **Playwright / Cypress** | latest | End-to-end (E2E) testing |  |

### 3.7 Coding Assistant & MCP
| Tool | Version | Use | Priority |
|------|---------|-----|:---:|
| **Claude Code CLI** | latest | Terminal-based coding assistant | ✅ |
| **MCP tools/servers** | per project | Connect extra tools to Claude Code (Filesystem, GitHub, PostgreSQL, etc.) | ✅ |

### 3.8 Design, Assets & Browser
| Tool | Version | Use | Priority |
|------|---------|-----|:---:|
| **Google Chrome** | latest | Development browser + DevTools | ✅ |
| **Figma** (Desktop) | latest | UI design & handoff |  |
| **Higgsfield** (web) | — | Image & video generation (subscription — Section 2) | ✅ |

### 3.9 Recommended VS Code Extensions
ESLint · Prettier · Tailwind CSS IntelliSense · ES7+ React/Redux Snippets · GitLens · Docker · Error Lens · Thunder Client · Claude Code · PostgreSQL.

### 3.10 General Utilities
| Tool | Use | Priority |
|------|-----|:---:|
| **7-Zip** | Compress/extract files |  |
| **curl / wget** | Download & test network from the terminal | ✅ |
| **OpenSSL** | Certificates & encryption | |

### 3.11 Cloud & Deployment Tools (Future)
| Tool | Use | Priority |
|------|-----|:---:|
| **AWS CLI / Azure CLI / gcloud** | Cloud management (depends on the adopted server) | ⭐ |
| **Vercel CLI / Netlify CLI** | Frontend deployment | ⭐ |
| **Terraform** | Infrastructure as Code (IaC) | ⭐ |

> Goal: have everything **ready and pre-installed** (at least the ✅ items) so work can start immediately without delay, while allowing ⭐ items to be installed later when needed — without having to request new permissions.

---

## 4) Project Tech Stack

- **Frontend:** React 19 + Vite + TypeScript
- **Runtime:** Node.js 22 LTS
- **Backend/DB:** PostgreSQL via Supabase
- **Containers:** Docker
- **Performance testing:** k6
- **Version control & deployment:** Git + GitHub
- **Coding assistance:** Claude Code (CLI) + MCP tools

---

## 5) Access & Permissions Required from IT

For the developer to work efficiently, we request the following permissions on the assigned laptop:

1. **Local admin rights** to install and update the software above.
2. **Full terminal access** (PowerShell / Windows Terminal) **with no restrictions or blocking** — allowing command-line tools to run and the Execution Policy to be changed.
3. **Run Claude Code in the terminal** without blocking, with the ability to run **up to 3 sub-agents**.
4. **Install and connect MCP tools** (MCP servers) to the project freely.
5. **Permission to push code to GitHub** — create/access company repositories and push to them.
6. **Permission to use Docker** — build images and run containers without blocking.
7. **Full Google Chrome permissions** (developer extensions, DevTools).
8. **Open outbound network access** to at least the following domains:
   - `registry.npmjs.org` (npm packages)
   - `github.com` (pushing code)
   - `hub.docker.com` (Docker containers)
   - `api.anthropic.com` (Claude Code service)
   - `supabase.com` (database)
   - `higgsfield.ai` (image/video generation)

> In short: **we do not want any of the listed tools locked or blocked**, since all work is done through the terminal and these tools.

---

## 6) Server Type (Clarification Needed — Cost Deferred to Next Month)

We kindly ask the IT department to **provide the type of server used within the company**, such as:

- On-premise server — Linux or Windows Server?
- Or cloud server — AWS / Azure / GCP / VPS?
- Available specifications (CPU, RAM, storage, operating system).

> **Server hosting cost will be included in next month's document** after confirming the type and specifications.

---

## 7) Total Cost Summary

| Item | Monthly (OMR) |
|------|:---:|
| Claude Code Max 5x | 38.5 |
| Supabase Pro | 9.6 |
| Higgsfield Plus | 18.9 |
| Internet / Wi-Fi subscription | 20.0 |
| **Monthly Total** | **≈ 87.0 OMR** |
| Server cost | To be defined next month |

---

*Prices are based on the platforms' official rates as of July 2026 and are subject to change. All tools in Section 3 are free and open source and add no cost.*
