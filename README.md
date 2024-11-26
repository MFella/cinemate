<img style="width: 100%; background: #4b5563 !important;" src="https://raw.githubusercontent.com/MFella/cinemate/refs/heads/main/apps/frontend/src/assets/cinemate-logo.png" />

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
Project is also deployed - you can try that here.

## 🔐 Authentication

Currently project only supports google authentication (thanks to oauth 2.0). Hence, login via 'google' is required in order to use whole application.

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

The whole project is a fullstack application - it includes a frontend, and a backend connected to the database. Below (in the Tech Stack section), we will list the libraries and dependencies used. The diagram below shows the relationships within the app.
<br>
<img style="width: 100%" src="https://raw.githubusercontent.com/MFella/cinemate/refs/heads/main/assets/overall-architecture.png" />

# 💻 Tech Stack

Project built thanks to <b>nx version @18.3.4</b>

Used **frontend** main technologies:
| Dependency | Version |
| :---: | :---: |
| Angular | ^17.3.0 |
| Angular Material | ^17.3.7 |
| RxJS | ~7.8.0 |
| TailwindCSS | ^3.0.2 |
| Playwright | ^1.36.0 |

Used **backend** main technologies:
| Dependency | Version |
| :---: | :---: |
| NestJS | ^10.0.2 |
| Prisma | ^5.18.1 |
| passport-google-oauth20 | ^2.0.0 |
| Supertest | ^7.0.0 |
| Jest | ^29.4.1 |

and rest can be found within the repo.
