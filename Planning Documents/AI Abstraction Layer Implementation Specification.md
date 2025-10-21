# **AI Abstraction Layer Implementation Specification**

This document defines the strict requirements for the AI Abstraction Layer, which decouples the SaaS platform from specific AI providers (e.g., Apiframe, DALL-E, Imagen). All components (Frontend and Backend) must adhere to this specification.

## **1\. Data Model Specification (Firestore modelConfigs)**

All routing and configuration logic must be driven by data stored in a single, public Firestore collection. The unique modelId must be used as the document ID for quick lookup.

### **Collection Path**

The collection must be publicly readable by the frontend to populate model selection menus:

### **Required Document Fields**

| Field Name | Data Type | Constraint | Description |
| :---- | :---- | :---- | :---- |
| **modelId** | String | **Required, Unique (Document ID)** | The unique identifier used by the Frontend to request content (e.g., midjourney-v6, imagen-3.0). |
| **providerName** | String | Required | Display name for the model in the UI (e.g., Apiframe (Midjourney), Google). |
| **modelType** | Enum | Required | The capability this model provides (image, video, or text). |
| **adapterModule** | String | **Required** | The exact name of the server-side code module responsible for handling this API's unique structure (e.g., ApiframeAdapter, GeminiFlashAdapter). |
| **apiEndpoint** | String | Required (URL) | The base URL for the external provider (e.g., https://api.apiframe.ai/v1). |
| **apiKeyType** | Enum | Required | Defines where the API key is sourced: user\_specific (Bring Your Own Key) or global (Platform-held key). |
| description | String | Optional | A brief description for the Admin UI. |

## **2\. Universal Frontend Contract (API Calls)**

The frontend application (e.g., the Assets module) must only interact with a single, internal Platform API endpoint (/ai/generate), passing the modelId as a parameter. The client side should *never* know the specific provider details (endpoint, adapter, key management).

| Frontend Request | Platform Endpoint | Required Payload | Expected Response |
| :---- | :---- | :---- | :---- |
| **Generate Content** | POST /ai/generate | modelId, prompt, options | { jobId: string, status: 'pending' } |
| **Check Status** | GET /ai/status | jobId | \`{ status: 'completed' |
| **Get Results** | GET /ai/results | jobId | { status: 'completed', assets: \[url, metadata\] } |

## **3\. Universal Adapter Contract (Backend Requirements)**

Every adapter module defined in the Firestore configuration (e.g., ApiframeAdapter) **must** implement the following three universal functions. The Adapter's job is to translate the universal platform request into the specific external API's format and handle its response structure.

### **3.1. generateJob(modelConfig, prompt, options, authContext)**

| Parameter | Type | Description |
| :---- | :---- | :---- |
| modelConfig | Object | The Firestore document for the requested modelId. |
| prompt | String | The user's input prompt. |
| options | Object | Standardized generation settings (e.g., aspect ratio, negative prompt). |
| authContext | Object | Contains the user's ID and the relevant API key (global or user-specific). |
| **Returns** | Object | Must return a standardized Platform Job ID. |

### **3.2. checkStatus(jobId, modelConfig, authContext)**

| Parameter | Type | Description |
| :---- | :---- | :---- |
| jobId | String | The ID returned by generateJob. |
| modelConfig | Object | The Firestore document. |
| authContext | Object | User/Key context. |
| **Returns** | Object | Must return { status: string, progress: number } (Standardized status). |

### **3.3. getResults(jobId, modelConfig, authContext)**

| Parameter | Type | Description |
| :---- | :---- | :---- |
| jobId | String | The ID returned by generateJob. |
| modelConfig | Object | The Firestore document. |
| authContext | Object | User/Key context. |
| **Returns** | Array | Must return an array of standardized asset objects: \[{ url: string, metadata: object }\]. |

