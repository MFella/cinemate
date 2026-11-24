# 🎥 Overview

The main goal of this project was to create an app for finding perfectly matched movies to watch together (e.g. with your fiancée/boyfriend, etc.). <br><br>
Currently, application supports several functionalities:

<ul style="list-style-type: square;">
<li><b>Matching phase</b> - user can vote whether movie seems interesting for him (1.) or rather no (2.), or he doesn't know (3.)</li>
<li><b>Preferences</b> - user can set what kind of movies want to find</li>
<li><b>Find</b> - user can find perfectly matched movie among other users</li>
</ul>

## 🏃‍♂️ Getting started

To install application locally, simply clone this repo and then install all of the dependencies by command

```sh
npm i
```

in the main directory.
<br>
The project is deployed on AWS - try it here: https://dp4vq19ji7yw3.cloudfront.net (the login page has a demo account button).

## 🔐 Authentication

Sign-in goes through Amazon Cognito (Google and Facebook federation, hosted UI, authorization code flow). A demo account is available without any login.

## 🧪 Test exection

Several tests may be executed:

👉 <b> E2E frontend </b> tests with command: <br>

```sh
npm run e2e:front
```

👉 <b> E2E backend </b> tests with command: <br>

```sh
npm run e2e:back
```

👉 <b> Backend unit </b> tests with command: <br>

```sh
npm run units:back
```

# 🏠 Overall architecture

A fullstack Nx monorepo: an Angular frontend and a Nest backend on a Postgres database (Prisma), using the TMDB API for movie data. The libraries are listed in the Tech Stack section; the diagram below shows how it runs on AWS.

# ☁️ AWS architecture

```mermaid
flowchart LR
  U[Browser] --> CF[CloudFront]
  CF -->|static files| S3[(S3, private)]
  CF -->|/api/*| APIGW[HTTP API]
  APIGW --> L[Lambda: Nest app]
  L --> SM[Secrets Manager]
  L --> DB[(Neon Postgres)]
  L -.-> COG[Cognito]
  L --> CW[CloudWatch]
  CW -->|alarms| SNS[SNS] --> MAIL[e-mail]
  GH[GitHub Actions] -->|OIDC role| CDK[CDK deploy]
```

Everything is defined in [`infra/`](infra/README.md) (CDK, TypeScript). Pushes to `main` are deployed by GitHub Actions through an OIDC role, with no stored AWS keys. Decisions: [`docs/adr/`](docs/adr).

# 💻 Tech Stack

Built with <b>Nx 24</b> (TypeScript 6, Node 24). Exact versions are in `package.json`.

**Frontend**

|    Dependency    | Version |
| :--------------: | :-----: |
|     Angular      | ~22.2.0 |
| Angular Material | ~22.2.0 |
|       RxJS       | ~7.8.0  |
|   TailwindCSS    | ^3.0.2  |
|    Playwright    | ^1.36.0 |

**Backend**

|          Dependency           | Version  |
| :---------------------------: | :------: |
|            NestJS             | ^11.2.11 |
|            Prisma             | ^6.19.3  |
|        aws-jwt-verify         |  5.2.1   |
| @codegenie/serverless-express |  5.0.0   |
|             Jest              |  30.5.2  |

**Infrastructure and delivery**

|      Dependency       | Version |
| :-------------------: | :-----: |
|        AWS CDK        | 2.278.0 |
| GitHub Actions (OIDC) |    -    |

The rest can be found within the repo.
