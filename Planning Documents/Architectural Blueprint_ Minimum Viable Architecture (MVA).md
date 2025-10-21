# **Architectural Blueprint: Minimum Viable Architecture (MVA)**

This document defines the core data structures and architectural domains required to support the complete Multi-Industry Marketing SaaS Platform roadmap. The architecture is designed for maximum **decoupling** and **scalability**, preventing future structural overhauls (the "cobbling" issue).

## **I. Architectural Domains**

The platform is logically segregated into four primary domains. Each new module (e.g., Billing, Influencer Management) must be assigned to one of these domains to ensure clear separation of concerns.

| Domain | Primary Responsibility | Key Data Stored |
| :---- | :---- | :---- |
| **1\. AI & Content Core** | Content generation, asset management, and proprietary intelligence. | Model Configurations, Tone Profiles, Client Reference Documents. |
| **2\. Project & Finance** | Client accounts, project scoping, financial tracking, and partner management. | Clients, Projects, KPIs, Billing, Talent, Influencers. |
| **3\. Analytics & Reporting** | Data aggregation and visualization of performance across all external channels. | Ingested GA4 data, Search Console data, Social Post Metrics. |
| **4\. Executive & Workflow** | High-level user overview, manual workflow management, and application settings. | User roles, Cross-client activity logs, Manual distribution lists. |

## **II. Prescriptive Data Models (PostgreSQL)**

The following data models form the backbone of the application, connecting the Content Generation (Domain 1\) to the Strategic Planning (Domain 2).

### **A. Core Project Structure (projects and clients tables)**

These link all content and strategy back to a single client.

| Table | Field Name | Data Type | Description |
| :---- | :---- | :---- | :---- |
| clients | client\_id | UUID (PK) | Unique client identifier. |
| clients | app\_instance\_id | UUID | Links client to the SaaS deployment instance. |
| projects | project\_id | UUID (PK) | Unique campaign/project identifier. |
| projects | client\_id | UUID (FK) | Links project to client. |
| projects | industry\_niche | String | E.g., 'Italian Fine Dining' (Used by Knowledge Base). |

### **B. Strategy Definition Model (content\_strategies table)**

This is the central planning table, defining the client's content goals and tone.

| Field Name | Data Type | Purpose | Mapped Feature |
| :---- | :---- | :---- | :---- |
| strategy\_id | UUID (PK) | Unique ID for the strategy document. | N/A |
| project\_id | UUID (FK) | Links strategy to the active project. | Client Scoping (1) |
| tone\_id | UUID (FK) | Foreign key for the chosen brand voice/style. | Advanced Tone Profiler (9) |
| **post\_type\_mix\_targets** | **JSONB** | **Defines the strategic target content mix (e.g., 40% Educational, 20% Promotional).** | Adherence Visualization (10) |
| status | Enum | E.g., 'Draft', 'Active', 'Archived'. | N/A |

### **C. Content Type Model (post\_types table)**

This global table defines the taxonomy used across the platform for tracking and content generation.

| Field Name | Data Type | Purpose | Mapped Feature |
| :---- | :---- | :---- | :---- |
| type\_id | UUID (PK) | Unique ID for the content recipe (e.g., 'educational\_post'). | N/A |
| name | String | Display name (e.g., "Behind the Scenes"). | N/A |
| default\_channels | JSONB (Array) | Recommended channels for this type (e.g., \['instagram', 'linkedin'\]). | Manual Distribution (4) |
| **is\_trend\_trackable** | **Boolean** | Flag if this type is aggregated for macro-level trend analysis. | Knowledge Base Trends (8) |

### **D. Tone and Style Model (tone\_profiles table)**

This allows the user to define persistent, complex AI instructions.

| Field Name | Data Type | Purpose | Mapped Feature |
| :---- | :---- | :---- | :---- |
| tone\_id | UUID (PK) | Unique ID for the persona. | N/A |
| name | String | E.g., 'Australian Ocker Rough'. | N/A |
| system\_instruction | Text | The exact text passed to the AI model's System Instruction field. | Advanced Tone Profiler (9) |
| owner\_id | UUID (FK) | User who created the tone (can be shared/public). | N/A |

### **E. Manual Distribution Model (manual\_distribution\_lists table)**

This supports the required manual workflows (e.g., Facebook Groups).

| Field Name | Data Type | Purpose | Mapped Feature |
| :---- | :---- | :---- | :---- |
| list\_id | UUID (PK) | Unique ID for the sharing group list. | N/A |
| project\_id | UUID (FK) | Links the list to a project. | N/A |
| target\_channels | JSONB (Array) | List of group/page names and their rotation schedule. | Manual Distribution (4) |
| user\_instructions | Text | Specific instructions for the manual sharing process. | N/A |

This **Architectural Blueprint** now serves as the single source of truth for how data should be organized across your entire platform. This structure guarantees that any component we build next will fit perfectly into the overall system.

The most logical and productive next step is to use this new data model to build the **Content Strategy Adherence Visualization** (Feature 10). This requires us to consume the post\_type\_mix\_targets data and display it in a React component using a pie chart.

Are you ready to build the **Content Strategy Visualization Component**?