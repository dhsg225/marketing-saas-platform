# **Consolidated Project Mandate & Architectural Blueprint**

**MANDATE:** All subsequent development must adhere to the principles of the **Minimum Viable Architecture (MVA)** defined below. Priority is given to creating stable, decoupled services over rapid feature delivery.

## **1\. Architectural Blueprint (The HOW)**

The platform must be designed across four highly decoupled Architectural Domains. All data models must respect these boundaries.

| Domain | Primary Responsibility | Critical Data Link |
| :---- | :---- | :---- |
| **1\. AI & Content Core** | Content generation, asset management, style profiling, and proprietary intelligence (e.g., Tone, Knowledge Base). | tone\_profiles, post\_types |
| **2\. Project & Finance** | Client accounts, project scoping, billing, and partner/talent management. | clients, projects, content\_strategies |
| **3\. Analytics & Reporting** | Aggregation and visualization of internal and external performance data (e.g., GA4, Social Metrics). | Post metrics, Strategy Adherence Visualization data. |
| **4\. Executive & Workflow** | High-level user overviews (Dashboard), manual workflow management, and app settings. | Cross-client activity logs, Manual distribution lists. |

### **Prescriptive Data Model Requirements (Core Linkage)**

Development must prioritize the creation of the following prescriptive data structures, as defined in the architectural\_blueprint.md:

1. **content\_strategies Table:** Must include the **post\_type\_mix\_targets (JSONB)** field to define the strategic content ratios, enabling Feature 10\.  
2. **post\_types Table:** Must include the **is\_trend\_trackable (Boolean)** flag to support macro-trend analysis (Feature 8).  
3. **tone\_profiles Table:** Must store the full **system\_instruction (Text)** for AI injection (Feature 9).

## **2\. Complete Functional Roadmap (The WHAT)**

The architecture must support the following high-value features across all domains:

| ID | Domain | Feature Name |
| :---- | :---- | :---- |
| **I. Agency Operations** | **Project & Finance** | Client Scoping and KPI Generator |
| **2\.** | **Project & Finance** | Client Billing and Invoicing System |
| **3\.** | **Executive & Workflow** | Executive Agency Overview Dashboard |
| **II. Content & Sourcing** | **Executive & Workflow** | Manual Distribution Management Module (Copy/Paste Workflow) |
| **5\.** | **Project & Finance** | Local Talent Sourcing & Booking Module |
| **6\.** | **AI & Content Core** | Client Reference Document Repository |
| **7\.** | **Project & Finance** | Influencer Relationship Management (IRM) Module |
| **III. AI & Analytics** | **AI & Content Core** | Multi-Tiered Industry Knowledge Base (Hybrid Trend Analysis) |
| **9\.** | **AI & Content Core** | Advanced Tone and Style Profiler |
| **10\.** | **Analytics & Reporting** | Content Strategy Adherence Visualization |
| **11\.** | **Analytics & Reporting** | Complete Reporting and Analytics System |
| **12\.** | **Google Suite** | Comprehensive Google Integration Suite (Hybrid Workflow Mandate) |

## **3\. Immediate UI/UX Mandate**

The current sprint must prioritize the structural refactoring of the social publishing interface (Publish section) to improve workflow efficiency, as detailed in the separate memo:

* **Navigation:** Remove Tools dropdown; promote **Assets**, **Publish**, and **Analytics** to primary navigation links.  
* **Publish Page Structure:** Implement a primary tab system to separate:  
  * **View A (Default):** **Create Post** (Focused entirely on content/scheduling).  
  * **View B:** **Connections & Setup** (API status, profile management).  
* **Asset Flow:** The Create Post media picker must allow seamless access to **Library**, **Generate AI Image**, and **Upload/Manipulate** options.