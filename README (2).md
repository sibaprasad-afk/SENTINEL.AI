# SENTINEL AI

### Clinical Intelligence & Prioritization Platform

**Smarter Care. Faster Clinical Decisions.**

SENTINEL AI is a healthcare decision-support project designed to help
healthcare professionals review approved medical images and clinical
datasets, identify potential disease-related signals, and organize cases
for further assessment.

> **Important:** SENTINEL AI is intended to support clinical review, not
> replace a qualified healthcare professional or provide an autonomous
> diagnosis. Any model output must be interpreted alongside the original
> data and clinical context.

------------------------------------------------------------------------

## Table of contents

-   [Problem statement](#problem-statement)
-   [Our approach](#our-approach)
-   [Core workflow](#core-workflow)
-   [Key modules](#key-modules)
-   [Technology stack](#technology-stack)
-   [Project structure](#project-structure)
-   [Getting started](#getting-started)
-   [Environment configuration](#environment-configuration)
-   [Medical data and AI model
    integration](#medical-data-and-ai-model-integration)
-   [Privacy and safety](#privacy-and-safety)
-   [Development scripts](#development-scripts)
-   [Project status](#project-status)
-   [Contributing](#contributing)

------------------------------------------------------------------------

## Problem statement

Develop a decision-support tool that analyzes approved medical images or
clinical datasets to identify potential signs of disease and help
healthcare professionals prioritize cases for further assessment.

### The challenge

Healthcare teams may need to review large volumes of medical images and
clinical information. Manually reviewing every case can be
time-consuming, and important findings may need to be surfaced
efficiently for professional assessment.

### Our objective

SENTINEL AI aims to bring medical data analysis and case prioritization
into one clinical workspace. It is designed to:

1.  Accept supported medical images or structured clinical datasets.
2.  Validate and prepare submitted data for analysis.
3.  Connect to an appropriate trained medical AI/ML model.
4.  Present potential signals and model outputs with relevant context.
5.  Help organize cases into configurable review queues.
6.  Keep healthcare professionals responsible for final assessment and
    decisions.

------------------------------------------------------------------------

## Our approach

SENTINEL AI is organized around five stages:

  -----------------------------------------------------------------------
  Stage                               Purpose
  ----------------------------------- -----------------------------------
  **Analyze**                         Process approved medical images or
                                      clinical datasets using a
                                      compatible analysis pipeline.

  **Identify**                        Surface potential disease-related
                                      signals returned by the configured
                                      model.

  **Explain**                         Present model information,
                                      supporting evidence where
                                      available, confidence values where
                                      supplied, and data-quality
                                      limitations.

  **Prioritize**                      Organize cases using configured
                                      review criteria and appropriate
                                      human oversight.

  **Review**                          Enable healthcare professionals to
                                      inspect the original data and
                                      record their assessment.
  -----------------------------------------------------------------------

A model confidence score is not the same as the probability that a
patient has a disease. Review priority is a workflow aid, not a
diagnosis.

------------------------------------------------------------------------

## Core workflow

``` text
Approved medical image / clinical dataset
                  |
                  v
          Upload and validation
                  |
                  v
       Compatible analysis pipeline
                  |
                  v
      Potential signals and model output
                  |
                  v
       Clinical context and data quality
                  |
                  v
       Configurable review prioritization
                  |
                  v
       Healthcare professional assessment
                  |
                  v
          Review record and audit trail
```

The exact analysis capabilities depend on the medical model and data
modality configured for the deployment.

------------------------------------------------------------------------

## Key modules

The product is planned around the following modules. Their availability
and integration status should be verified in the running build.

### 1. Command Center

A central overview of cases, review workload, analysis activity, and
priority distribution.

### 2. Clinical Queue

A searchable and filterable workspace for organizing cases into
configurable review categories such as Critical, High, Moderate, and
Routine. These labels represent workflow priority, not confirmed disease
severity.

### 3. Medical Image Analysis

An image review workspace for supported medical image formats. Model
inference must be provided by a compatible, configured medical imaging
model. DICOM support requires an appropriate imaging pipeline and
viewer.

### 4. Clinical Dataset Analysis

A workspace for structured datasets, such as CSV files, with data
validation, column inspection, missing-value checks, and analysis
through a compatible model where available.

### 5. Patient Intelligence

A consolidated view of available patient context, associated studies,
analysis history, and review notes, subject to access permissions.

### 6. Explainable Clinical Signals

A presentation layer for model outputs, model/version information,
confidence values, supporting evidence where available, and limitations.

### 7. Analytics and Review History

A view of case activity and recorded review actions. Analytics should be
calculated from stored application data rather than invented clinical
statistics.

------------------------------------------------------------------------

## Technology stack

The repository currently includes the following technologies and
packages:

  -----------------------------------------------------------------------
  Area                                Technology
  ----------------------------------- -----------------------------------
  Frontend                            React 19, TypeScript

  Build tooling                       Vite

  Styling                             Tailwind CSS 4

  Backend runtime                     Node.js / TypeScript with Express

  Development runner                  `tsx`

  AI integration package              Google Gen AI SDK (`@google/genai`)

  Backend configuration               dotenv

  Application data / services         Firebase SDK and Firestore
                                      configuration files

  Charts                              Recharts

  Icons                               Lucide React

  Motion                              Motion

  Realtime communication package      `ws`
  -----------------------------------------------------------------------

The presence of a dependency or configuration file does not by itself
mean that a production integration is fully configured. Check the
application code and deployment environment before relying on any
integration.

------------------------------------------------------------------------

## Project structure

The repository includes the following top-level files and directories:

``` text
SENTINEL.AI/
├── server/
├── src/
├── .data/
├── .env.example
├── .gitignore
├── bun.lock
├── eslint.config.mjs
├── firebase-applet-config.json
├── firebase-blueprint.json
├── firestore.rules
├── firestore.rules.test.ts
├── index.html
├── metadata.json
├── package.json
├── security_spec.md
├── server.ts
├── tsconfig.json
└── vite.config.ts
```

The application source is maintained in `src/` and the server entry
point is `server.ts`. Refer to the current source tree for the latest
component and route organization.

------------------------------------------------------------------------

## Getting started

### Prerequisites

-   Node.js (use a current supported LTS release).
-   npm, or Bun if you prefer the package manager represented by the
    repository's `bun.lock`.
-   Git.

### 1. Clone the repository

``` bash
git clone https://github.com/sibaprasad-afk/SENTINEL.AI.git
cd SENTINEL.AI
```

### 2. Install dependencies

Using npm:

``` bash
npm install
```

Or using Bun:

``` bash
bun install
```

### 3. Configure environment variables

Create a local `.env` file using `.env.example` as a reference:

``` bash
cp .env.example .env
```

Add the required values for your development environment. Do not commit
`.env` or real credentials.

### 4. Start the development server

Using npm:

``` bash
npm run dev
```

Or using Bun:

``` bash
bun run dev
```

Open the local URL printed by the development server in your terminal.

### 5. Build the frontend

``` bash
npm run build
```

### 6. Run the TypeScript check

``` bash
npm run lint
```

The `lint` script currently runs the TypeScript compiler in no-emit mode
(`tsc --noEmit`).

------------------------------------------------------------------------

## Environment configuration

The repository's `.env.example` documents these variables:

  -----------------------------------------------------------------------
  Variable                            Purpose
  ----------------------------------- -----------------------------------
  `GEMINI_API_KEY`                    API key for configured Gemini API
                                      calls.

  `APP_URL`                           Hosted application URL used for
                                      application links and related
                                      callbacks.
  -----------------------------------------------------------------------

Example:

``` env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
APP_URL="YOUR_APP_URL"
```

In Google AI Studio deployments, secrets and runtime values may be
supplied by the platform. Follow the configuration instructions for the
selected deployment environment.

**Never expose API keys in frontend code, public repositories,
screenshots, or client-side environment variables.**

Firebase configuration and Firestore security rules are present in the
repository. Configure the corresponding Firebase project and verify the
deployed rules before using persistent data features.

------------------------------------------------------------------------

## Medical data and AI model integration

A medical dataset and an AI model are separate requirements:

-   A dataset supplies examples or input data.
-   A trained model performs inference.
-   A compatible application pipeline validates inputs, calls the model,
    and interprets its output.
-   A healthcare professional reviews the output in context.

Before enabling a medical analysis workflow, document:

-   Dataset source and usage licence.
-   Supported modality and file formats.
-   Model name, version, and intended use.
-   Input preprocessing requirements.
-   Output labels and their meaning.
-   Validation results and known limitations.
-   Appropriate review and escalation criteria.

If no compatible, validated medical model is configured, the application
should clearly identify the workflow as a demonstration or
data-exploration mode. It must not invent predictions, confidence
scores, diagnostic heatmaps, or successful analysis messages.

For public demonstrations, use synthetic or appropriately licensed
de-identified data. Do not upload identifiable patient information to
third-party services unless the required authorization, safeguards, and
compliant data-processing arrangements are in place.

------------------------------------------------------------------------

## Privacy and safety

SENTINEL AI is a decision-support concept and must be developed with
privacy, security, and clinical oversight in mind.

-   Use synthetic or properly authorized data during development and
    demonstrations.
-   Apply authentication and server-side authorization to protected
    resources.
-   Enforce least-privilege access to patient information.
-   Validate uploaded file types, sizes, and contents.
-   Keep API secrets on the server or in the deployment platform's
    secret manager.
-   Protect stored files and database records with appropriate access
    controls.
-   Record important review and priority-override actions where audit
    logging is implemented.
-   Clearly distinguish AI-generated output from clinician-confirmed
    information.
-   Do not use model confidence alone as a clinical triage decision.
-   Do not present the application as a certified medical device or
    claim regulatory compliance without evidence.

**SENTINEL AI does not replace professional medical judgment and must
not be used as the sole basis for diagnosis or treatment.**

------------------------------------------------------------------------

## Development scripts

  -----------------------------------------------------------------------
  Command                             Description
  ----------------------------------- -----------------------------------
  `npm run dev`                       Starts the TypeScript server in
                                      development mode using `tsx`.

  `npm run build`                     Builds the frontend with Vite.

  `npm run preview`                   Serves the built frontend for local
                                      preview.

  `npm run lint`                      Runs the TypeScript no-emit check.

  `npm run clean`                     Removes the configured build output
                                      and generated server file.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## Project status

SENTINEL AI is under active development.

The repository contains the application scaffold, frontend/build
tooling, server entry point, Firebase/Firestore configuration, and
supporting project files. Individual product capabilities, backend
integrations, and medical model pipelines should be considered complete
only after they have been implemented and tested in the current build.

### Current development priorities

-   Complete and test the core application workflows.
-   Configure secure authentication and data access.
-   Integrate a compatible medical image or clinical dataset model.
-   Validate upload and preprocessing pipelines.
-   Implement transparent case-prioritization criteria.
-   Test role permissions, audit records, and error handling.
-   Document model performance and limitations before clinical claims
    are made.

------------------------------------------------------------------------

## Contributing

Contributions, suggestions, and issue reports are welcome.

1.  Fork the repository.
2.  Create a feature branch.
3.  Make focused changes.
4.  Run the available checks.
5.  Submit a pull request with a clear description and testing notes.

Do not include real patient information, private credentials, or
restricted medical datasets in issues or pull requests.

------------------------------------------------------------------------

## Repository

<https://github.com/sibaprasad-afk/SENTINEL.AI>

------------------------------------------------------------------------

**SENTINEL AI --- Smarter Care. Faster Clinical Decisions.**
