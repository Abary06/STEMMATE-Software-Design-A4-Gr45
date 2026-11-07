# STEMMate v2.0 – Namibia (SDN621S A4, Group 45)

## 1. Project Overview

STEMMate is an offline-first STEM planning platform designed to help facilitators and teachers in Namibia prepare safe and inclusive STEM activities.

Users can browse activities, prepare session plans, save their work locally and synchronise completed plans with a local hub when a connection is available.

## 2. System Requirements

- Node.js version 22.13 or later.
- A modern web browser.
- A computer with PowerShell or another terminal.

Check your Node.js version using: `node --version`

## 3. Running the Application

Open PowerShell in the project folder and run:

`npm.cmd start`

Open `http://localhost:3000` in your browser.

To access the application from a phone on the same Wi-Fi network, use your computer's local IP address followed by `:3000`.

## 4. Running Automated Tests

Run: `npm.cmd test`

The current test suite contains 25 automated tests. All 25 passed in the latest test run.

## 5. Demo Accounts

The application includes these demonstration accounts:

- Mr.Coach — PIN: `123456`
- Admin.Local — PIN: `654321`

The PINs can be changed using the `COACH_PIN` and `ADMIN_PIN` environment variables.

These are demonstration credentials and should be changed before any real deployment.

## 6. Project Structure

- `src/server.js` — Starts the server and handles API requests.
- `src/service.js` — Application services and database operations.
- `src/validate.js` — Validates application data.
- `src/seed.js` — Provides initial demonstration data.
- `public/index.html` — Main web application interface.
- `test/` — Automated tests.
- `architecture/` — Architecture diagrams and source files.
- `docs/` — Supporting project documentation.
- `package.json` — Project information and run scripts.
- `GITHUB_GUIDE.md` — Version control guidance.

## 7. Backup and Reset

An administrator can export data through the `/api/export` endpoint using an authorised bearer token.

The database file can also be copied while the server is stopped.

Deleting `stemmate.db` resets the local database and removes its stored data.

## 8. Troubleshooting

- **Application does not start:** Check that Node.js 22.13 or later is installed.
- **Phone cannot open the application:** Check that both devices use the same Wi-Fi network and that port 3000 is allowed through the firewall.
- **Synchronisation fails:** Check that the local hub is running and try synchronising again.
- **A version conflict appears:** Review the available options and choose which version to keep.
- **A `node:sqlite` error appears:** Upgrade to Node.js 22.13 or later.

## 9. Known Limitations

The current version uses HTTP rather than HTTPS, does not include PIN lockout protection, stores sessions in memory and requires a connection for the first sign-in.

Attendance functionality (FR-02) is not integrated with the local hub.

These limitations should be considered before using the system outside an academic demonstration.

## 10. Architecture Documentation

The `architecture/` folder contains the system's context, container, data model, deployment and sequence diagrams.

The file `docs/architecture-explanation.md` provides additional explanation of the architecture.

## 11. Project Handover

Before demonstrating or handing over the application:

1. Confirm that Node.js 22.13 or later is installed.
2. Run the automated tests using `npm.cmd test`.
3. Start the application using `npm.cmd start`.
4. Open the application in a browser and check that it loads.
5. Review the known limitations and security considerations.
6. Keep the project folders and files together.

STEMMate is currently an academic demonstration project. Further security and deployment improvements are required before production use.
