# STEMMate Architecture Explanation
## SDN621S A4 – Group 45

### 1. Introduction

STEMMate is designed as an offline-first STEM planning platform for facilitators and school STEM coaches. Its architecture supports activity discovery, session planning, local storage and synchronisation when a network connection becomes available.

The system was designed with the Namibian school environment in mind, where internet access and device availability may be limited.

### 2. System Context

The context diagram shows the main people and external resources that interact with STEMMate.

The facilitator uses the system to find activities and prepare session plans. A local administrator handles administrative tasks such as exporting backups and managing PINs.

Learners are beneficiaries rather than direct system users. The platform avoids storing learner names, personal accounts or other unnecessary personal information.

### 3. Application Architecture

The system separates its main responsibilities into different components:

- The frontend provides the interface used by facilitators.
- The validation module checks submitted information.
- The service module handles application logic and database operations.
- The server exposes API endpoints for communication.
- The local database stores application information.

This separation makes the application easier to maintain and test.

### 4. Offline-First Design

One important architectural decision is allowing facilitators to save plans locally before synchronisation.

When a facilitator saves a plan, the application validates the information and stores it on the device. If the internet is unavailable, the plan remains available locally.

When connectivity returns, the application attempts to synchronise the pending changes with the server.

### 5. Save and Synchronisation Process

The sequence diagram illustrates the save-and-sync process.

First, the facilitator submits a plan. The application checks the information and attempts to save it locally. If the local save succeeds, the application displays a waiting status when the server cannot be reached.

When the connection becomes available, the application sends the pending plan to the server. The server validates the request and checks the plan version.

If a conflict occurs, the facilitator can choose whether to keep their version or use the server version. Other errors are reported without incorrectly claiming that the plan was synchronised.

### 6. Design Considerations

The architecture considers the following factors:

- **Reliability:** Plans should remain available when connectivity is interrupted.
- **Usability:** Status messages should explain whether information is saved locally or on the server.
- **Privacy:** Learner personal information is not required for the main planning workflow.
- **Maintainability:** Application responsibilities are separated into modules.
- **Error handling:** Validation failures, conflicts and storage problems should be communicated clearly.

### 7. Conclusion

The STEMMate architecture supports its main purpose of helping facilitators prepare STEM sessions in environments with limited connectivity and shared devices.

The separation of application components and the offline-first approach provide a practical foundation for the current prototype.
