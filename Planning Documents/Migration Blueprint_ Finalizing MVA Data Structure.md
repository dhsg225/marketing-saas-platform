# **Migration Blueprint: Finalizing MVA Data Structure**

STATUS: MVA Mandate is approved. All new feature development is paused until this migration is executed.  
GOAL: Refactor the existing PostgreSQL database to align with the MVA Blueprint's AI & Content Core and Project & Finance domains, specifically establishing the necessary tables for strategy tracking and AI configuration.

## **Migration Tasks (PostgreSQL)**

### **1\. Rename and Refactor content\_recipes**

* **Action:** Rename the existing content\_recipes table to **post\_types**.  
* **Mandate:** Ensure all existing columns and data are retained.

### **2\. Create Core Strategy Tables**

* **Action:** Create the following new tables based on the architectural\_blueprint.md specification:

| Table Name | Primary Purpose | Key New Field |
| :---- | :---- | :---- |
| content\_strategies | Strategy Planning (Feature 10\) | **post\_type\_mix\_targets** (JSONB) |
| tone\_profiles | AI System Instructions (Feature 9\) | **system\_instruction** (TEXT) |
| model\_configs | AI Abstraction Configuration (Q2 Resolution) | **adapter\_name** (TEXT) |

### **3\. Enhance Existing projects Table**

* **Action:** Add a new column to the existing projects table.  
* **New Column:** industry\_niche (STRING)  
* **Purpose:** Supports the Multi-Tiered Knowledge Base (Feature 8\) for hyper-relevant content generation.

### **4\. Verification**

* After migration, verify the **Content Strategy Adherence Visualization** (the Pie Chart) can successfully read and consume the mock data structure from the **content\_strategies.post\_type\_mix\_targets** field.

This plan gives you a clear, actionable task to achieve MVA compliance. Once you confirm this migration is ready, we can start designing the **Advanced Tone and Style Profiler (Feature 9\)** UI.

Does this migration blueprint look solid for your next task?