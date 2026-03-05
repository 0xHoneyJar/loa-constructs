# Best-in-Class Template and Scaffolding Design — Deep Research

_Generated: 2026-03-05 | Model: gemini-2.5-flash + Google Search + Firecrawl | Config: escape-velocity_

# The Constructs Network: Best-in-Class Template and Scaffolding Design

## A Definitive Guide to Building Installable Expertise

---

**Document Purpose:** This document serves as the FINAL, DEFINITIVE research compendium for "Best-in-Class Template and Scaffolding Design" within the Constructs Network. It is engineered to be a permanent knowledge base, enabling any reader to replicate expert-level work in creating templates and scaffolding for installable expertise packages (constructs). By internalizing the mental models, core concepts, and practical implementations detailed herein, construct authors will be equipped to design experiences that are not merely functional, but transformative – echoing the "All Might handing down One For All" moment for every new user.

**Contextual Foundation:** The Constructs Network is at an inflection point, poised to revolutionize AI agent development. Constructs, as installable expertise packages (skills + identity + workflow), empower developers to move beyond generic AI interactions to bespoke, highly specialized agent capabilities. The immediate challenge is to design a world-class template that progressively teaches the construct mental model, refines existing constructs like Artisan, and prepares for rapid user growth. This document leverages deep expertise in construct architecture, the Bridgebuilder archetype, and game-design-informed UX to deliver actionable patterns and mechanics.

---

## Expert Mental Models & Decision Frameworks

Top practitioners in template and scaffolding design operate with a sophisticated understanding of human psychology, system architecture, and long-term maintainability. Their decision-making is not accidental; it's guided by a set of deeply ingrained principles and a proactive approach to problem-solving.

### Core Principles Guiding Expert Decisions:

1.  **The "Time-to-First-Value (TTFV)" Obsession:**
    *   **Thinking:** The paramount goal is to deliver a tangible, meaningful artifact to the user in the absolute shortest time possible. This isn't merely about speed; it's about generating an immediate sense of accomplishment, utility, and "magic." A template should feel like an instant power-up, not a setup chore. The first interaction must be a success.
    *   **Decision Framework:**
        *   **Prioritize Zero-to-One:** Focus relentlessly on the path from `create-construct` to a *working, observable construct* in the AI agent.
        *   **Minimal Dependencies:** Strip down initial requirements to the absolute bare minimum. If it's not essential for the "Hello World" experience, defer it.
        *   **Pre-configured Defaults:** Provide sensible, battle-tested defaults for everything. Reduce cognitive load and decision fatigue.
        *   **Clear "First Edit" Path:** Guide the user directly to the most impactful, easiest change they can make to see a new result.
    *   **Optimization Target:** User engagement and retention. A high TTFV directly correlates with lower abandonment rates and increased user satisfaction.
    *   **Conscious Trade-off:** Initial simplicity often means abstracting away complexity that will be necessary later. This is managed through **Progressive Disclosure**.

2.  **Mental Model as the Core Curriculum:**
    *   **Thinking:** A template is fundamentally a pedagogical instrument. It implicitly (and sometimes explicitly) teaches the platform's architectural patterns, core APIs, and philosophical underpinnings. For the Constructs Network, this means instilling the "skills + identity + workflow" paradigm. The template's structure *is* the lesson.
    *   **Decision Framework:**
        *   **Reflect Core Concepts in Structure:** The file system, module exports, and primary configuration files must directly mirror the platform's mental model. For Constructs, this mandates clear separation and definition of `identity`, `skills`, and `workflow`.
        *   **Intentional Naming Conventions:** Use names that are intuitive, consistent, and directly map to the underlying concepts.
        *   **Illustrative Code:** The initial code should be a pristine example of how to use the core APIs correctly and idiomatically.
        *   **Comments as Mentors:** Use in-code comments not just to explain *what* the code does, but *why* it's structured that way and *how it relates to the mental model*.
    *   **Optimization Target:** User understanding and long-term adoption of best practices.
    *   **Conscious Trade-off:** Over-explaining upfront can overwhelm. This is mitigated by **Progressive Disclosure** and **README-Driven Development**.

3.  **Opinionated Defaults & Guardrails:**
    *   **Thinking:** Developers face constant decision fatigue. Expert templates make smart, battle-tested engineering decisions *for* the user, enforcing best practices by default. They also proactively prevent common mistakes, acting as a benevolent guardian. This frees the user to focus on their unique problem, not boilerplate.
    *   **Decision Framework:**
        *   **Pre-configure Essential Tooling:** Include TypeScript, ESLint, robust schema validation (e.g., Zod for skill parameters), and a recommended project structure from the outset.
        *   **Sensible Project Structure:** Provide a clear, logical hierarchy that scales.
        *   **Automated Quality Checks:** Integrate linting, formatting, and basic type checking into the development workflow.
        *   **Secure-by-Default:** If applicable, consider security best practices in initial setup (e.g., environment variable handling).
    *   **Optimization Target:** Code quality, maintainability, and developer efficiency.
    *   **Conscious Trade-off:** Too much opinion can feel restrictive. The balance is achieved by providing clear escape hatches, modularity (e.g., sub-generators for optional features), and transparent configuration.

4.  **The "Bridgebuilder" Mentality (Review & Mentorship):**
    *   **Thinking:** Templates are not static artifacts; they are living foundations that evolve and facilitate collaboration. They should actively lower the barrier for new authors to contribute and simplify the review and mentorship process for experienced ones. The template itself is a standard-bearer.
    *   **Decision Framework:**
        *   **Contribution Guidelines:** Include `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and PR templates.
        *   **Automated Feedback:** Implement linting, type checking, and schema validation that provides actionable, clear feedback.
        *   **Living Example:** The template's own code must exemplify the highest standards of clarity, maintainability, and adherence to best practices.
        *   **Documentation for Reviewers:** Provide guidance on what to look for when reviewing contributions.
    *   **Optimization Target:** Community health, code quality, and sustainable growth of the ecosystem.
    *   **Conscious Trade-off:** Adding community health files increases initial template size and perceived complexity. The long-term benefits of maintainability, quality, and a thriving community far outweigh this.

5.  **Game-Design-Informed UX (Warmth, Weight, Rhythm, Intentional Friction):**
    *   **Thinking:** The user experience of interacting with a template should be intuitive, engaging, and even delightful. This goes beyond mere functionality to the emotional and cognitive aspects of development.
        *   **Warmth:** The template feels welcoming, supportive, and easy to approach.
        *   **Weight:** It feels substantial, capable, and robust, inspiring confidence in its underlying power.
        *   **Rhythm:** The flow from creation to first interaction to further development is smooth, predictable, and satisfying.
        *   **Intentional Friction:** Carefully placed obstacles or prompts guide the user to make important decisions, understand critical concepts, or perform necessary actions, preventing future problems.
    *   **Decision Framework:**
        *   **Interactive CLIs:** Use prompts, clear choices, and immediate feedback during the scaffolding process.
        *   **Immediate Visual/Tangible Feedback:** The "Hello World" must be instantly observable.
        *   **Structured `README.md`s:** Use clear headings, code blocks, and progressive sections.
        *   **Layered Complexity:** Introduce advanced features only when the user is ready.
        *   **Clear Error Messages:** When friction occurs (e.g., validation error), the message should be helpful and actionable.
    *   **Optimization Target:** User satisfaction, learning efficacy, and emotional connection to the platform.
    *   **Conscious Trade-off:** Over-gamification can be distracting. Intentional friction must always serve a clear learning or quality goal, never just to be clever.

### What Top Practitioners Check FIRST When Something Goes Wrong:

When a template-generated project fails or behaves unexpectedly, experts follow a systematic diagnostic path:

1.  **Configuration File (`construct.json`, `package.json`, `manifest.json`):**
    *   **Check:** Is the entry point correctly specified? Are dependencies listed and correctly versioned? Are activation events, API versions, or required permissions correctly declared? (e.g., `id`, `name`, `version` in `construct.json`, `main` in `package.json`, `activationEvents` in VSCode extensions).
    *   **Why:** These files are the "DNA" of the project, dictating how it's built, run, and integrated. Misconfigurations here are often silent killers.

2.  **`README.md` / Quickstart Guide:**
    *   **Check:** Did I miss a crucial setup step, prerequisite, or environment variable configuration? Is there a common troubleshooting section that addresses this specific issue?
    *   **Why:** Many issues stem from incomplete setup or environmental mismatches. The `README` is the authoritative source for initial setup.

3.  **Console/Terminal Output (during generation, installation, runtime):**
    *   **Check:** Are there any errors during `npm install`, `construct activate`, or during the construct's execution within the AI agent? Look for stack traces, warnings, or specific error codes.
    *   **Why:** This is the most direct source of runtime feedback. Errors here often point to dependency conflicts, build failures, or fundamental logic errors.

4.  **Generated Code Entry Point (`src/main.ts`, `index.js`, `app.py`):**
    *   **Check:** Is the "Hello World" or initial core logic correctly implemented and being called? Is the main export correct? Are there any obvious syntax errors or missing imports?
    *   **Why:** If the entry point itself is flawed, nothing else will work. This verifies the most basic functionality.

5.  **Linting/Type Checking Output:**
    *   **Check:** Are there immediate syntax errors, type mismatches, or style violations reported by ESLint or TypeScript?
    *   **Why:** These tools catch a vast array of common programming errors *before* runtime, often preventing deeper, harder-to-debug issues.

### Conscious Trade-offs:

Expert template designers understand that every decision involves trade-offs. The art lies in making these trade-offs consciously, aligning them with the primary goals of the project and the target audience.

*   **Simplicity vs. Completeness:**
    *   **Amateur:** Tries to include everything or nothing.
    *   **Professional:** Leans towards a *minimal viable template* for quick starts, then uses **progressive disclosure** (e.g., sub-generators, advanced sections in `README`) to introduce completeness. The initial experience is always simple.
    *   **Why:** Maximizes TTFV while allowing for growth.

*   **Boilerplate vs. Dynamic Generation:**
    *   **Amateur:** Relies solely on static files or overly complex dynamic systems.
    *   **Professional:** Uses static boilerplate for universal, core components and dynamic generation (e.g., `plop`, `cookiecutter` principles) for customizable elements (e.g., adding a new skill, choosing a framework).
    *   **Why:** Balances ease of creation with necessary customization, avoiding "fork-and-edit" fatigue for common patterns.

*   **Tight Coupling vs. Modularity:**
    *   **Amateur:** Either creates a monolithic block or excessively fragmented modules.
    *   **Professional:** Provides an opinionated, tightly coupled *initial structure* for immediate functionality, but designs it with clear boundaries and interfaces to allow for future modularity and replacement. Meta-frameworks like Next.js (App Router) exemplify this by providing a strong structure but allowing co-location by feature.
    *   **Why:** Delivers immediate value and best practices without sacrificing long-term flexibility.

*   **Performance vs. Developer Convenience:**
    *   **Amateur:** Often overlooks performance or over-optimizes prematurely.
    *   **Professional:** Prioritizes developer convenience for the *template creation/usage experience* but builds in performance best practices *into the generated code* from the start. (e.g., `create-next-app` prioritizes performance of the *resulting app*, while `create-react-app` initially prioritized *developer convenience* for the template itself, leading to its eventual deprecation for new projects).
    *   **Why:** A good template should be fast to use, and the projects it creates should be fast to run.

*   **Example Implementations vs. Placeholder TODOs:**
    *   **Amateur:** Uses too many empty TODOs or overly complex examples.
    *   **Professional:** Employs a mix: a *single, working example* for the core functionality (e.g., a "Hello World" skill) to demonstrate the pattern, and *strategic TODOs* for optional extensions, configuration points, or areas where user input is genuinely required.
    *   **Why:** Working examples provide immediate understanding; well-placed TODOs encourage engagement without frustration.

---

## Core Concepts (with full explanations)

To truly master template and scaffolding design, one must grasp the underlying principles that make these tools effective. These concepts are the "why" behind the "what."

### 1. Time-to-First-Value (TTFV)

*   **Concept:** TTFV is the elapsed time from a user initiating a new project (e.g., running `create-construct`) to them experiencing a tangible, meaningful, and successful outcome. This outcome could be a "Hello World" message, a working UI, or an AI agent performing a simple task.
*   **Why it Matters:**
    *   **Psychological Impact:** Humans are wired for immediate gratification. A quick success creates a positive feedback loop, reduces frustration, and builds confidence. It transforms the initial setup from a chore into an achievement.
    *   **Reduced Abandonment:** The longer it takes to see value, the higher the chance a user will give up. A low TTFV is critical for onboarding and retention.
    *   **Establishes Trust:** Delivering immediate value signals that the platform is robust, well-designed, and respects the user's time.
*   **Implementation Principles:**
    *   **Minimalism:** Strip away non-essential features, dependencies, and configuration from the initial template.
    *   **Automation:** Automate all boilerplate setup (dependency installation, basic configuration).
    *   **Clear Call to Action:** Provide explicit instructions on how to run the generated project and what to expect.
    *   **Observable Output:** The "first value" must be easily and immediately perceivable by the user.

### 2. Mental Model as Curriculum

*   **Concept:** A template is a structured lesson. Its file organization, naming conventions, and initial code examples implicitly teach the user the fundamental architectural patterns, core APIs, and philosophical approach of the platform. For the Constructs Network, this means teaching "skills + identity + workflow" through the template's very design.
*   **Why it Matters:**
    *   **Accelerated Learning:** Users learn by doing and by observing. A well-structured template provides a working example of the "right way" to build, making abstract concepts concrete.
    *   **Consistency & Predictability:** When all constructs follow a similar mental model reflected in their structure, it reduces cognitive load for authors moving between projects and for reviewers.
    *   **Enforces Best Practices:** By demonstrating the ideal way to integrate `identity`, `skills`, and `workflow`, the template guides authors towards robust and maintainable designs.
*   **Implementation Principles:**
    *   **Direct Mapping:** File and folder names should directly correspond to core concepts (e.g., `src/identity.ts`, `src/skills/`, `src/workflow.ts`).
    *   **Illustrative Examples:** The initial code should be a canonical example of how to define an identity, register a skill, and orchestrate a workflow.
    *   **In-Code Documentation:** Use comments to explain the *purpose* of each section and *how it relates* to the overall construct mental model.

### 3. Progressive Disclosure

*   **Concept:** The principle of revealing information and functionality only when the user needs it or requests it. Instead of overwhelming a new user with all possible options and complexities upfront, progressive disclosure introduces them in layers, building on prior understanding.
*   **Why it Matters:**
    *   **Prevents Information Overload:** New users are easily intimidated by too much complexity. Progressive disclosure manages cognitive load, allowing them to master basics before moving to advanced topics.
    *   **Maintains Engagement:** By providing a clear path from simple to complex, users feel a sense of progression and accomplishment, encouraging them to explore further.
    *   **Tailored Learning:** It allows users to learn at their own pace and delve into specific areas of interest without being forced through irrelevant information.
*   **Implementation Principles:**
    *   **Layered Templates:** Offer different "flavors" of templates (e.g., minimal, skill-focused, full-stack) via CLI prompts.
    *   **Structured `README.md`:** Start with a "Quick Start," then "What's Next," then "Advanced Topics."
    *   **In-Code Comments & TODOs:** Use comments to explain basic concepts and strategically place TODOs for optional extensions or advanced features.
    *   **Sub-generators:** Provide CLI commands to add specific features (e.g., `construct add skill`, `construct add workflow-step`) after the initial project is created.

### 4. Opinionated Defaults & Guardrails

*   **Concept:** Providing a template that comes pre-configured with a set of carefully chosen, battle-tested defaults and mechanisms that prevent common errors. This includes tooling, project structure, and coding standards.
*   **Why it Matters:**
    *   **Reduces Decision Fatigue:** New users don't have to research and choose between countless options for linters, formatters, build tools, etc. Experts have already made the best choices.
    *   **Enforces Quality & Consistency:** By baking in tools like TypeScript, ESLint, and Zod, the template ensures a baseline level of code quality, type safety, and adherence to coding standards across the ecosystem.
    *   **Prevents Common Pitfalls:** Guardrails (e.g., schema validation for skill parameters) catch errors early, saving developers significant debugging time.
    *   **Accelerates Development:** Users can immediately focus on business logic rather than infrastructure setup.
*   **Implementation Principles:**
    *   **Pre-installed Dependencies:** Include `typescript`, `eslint`, `@types/node`, `zod` (for schema validation) in `package.json`.
    *   **Configuration Files:** Provide `.eslintrc.js`, `tsconfig.json`, `prettier.config.js` with sensible defaults.
    *   **Schema Validation:** Use Zod or similar for input/output validation of skills and workflow steps.
    *   **Clear Project Structure:** Define `src/`, `tests/`, `config/` with clear purposes.

### 5. The "Bridgebuilder" Mentality

*   **Concept:** Designing templates and scaffolding not just for individual creation, but for fostering a collaborative, high-quality ecosystem. This involves making it easy for new contributors to get started, for experienced developers to review, and for the project to maintain consistency and quality over time.
*   **Why it Matters:**
    *   **Scalable Community Growth:** Lowers the barrier to entry for new contributors, expanding the pool of potential authors.
    *   **Consistent Quality:** Standardized templates and automated checks ensure that contributions meet a minimum quality bar, reducing the burden on reviewers.
    *   **Efficient Mentorship:** Provides a common language and framework for mentors to guide new authors, focusing on higher-level design rather than basic setup.
    *   **Long-term Maintainability:** Well-documented contribution guidelines and automated checks make it easier to maintain a large codebase.
*   **Implementation Principles:**
    *   **Contribution Guidelines (`CONTRIBUTING.md`):** Clear instructions on how to set up, develop, test, and submit changes.
    *   **Code of Conduct (`CODE_OF_CONDUCT.md`):** Establishes community expectations.
    *   **Pull Request Templates:** Guide contributors on what information to include in their PRs.
    *   **Automated CI/CD:** Integrate linting, testing, and build checks into the CI pipeline.
    *   **Template as Example:** The template itself should be a shining example of the best practices it advocates.

### 6. Game-Design-Informed UX (Warmth, Weight, Rhythm, Intentional Friction)

*   **Concept:** Applying principles from game design to create a more engaging, intuitive, and satisfying developer experience.
    *   **Warmth:** The feeling of being welcomed and supported. Achieved through friendly language, clear instructions, and helpful feedback.
    *   **Weight:** The perception of substance and capability. The template feels robust, well-engineered, and powerful, not flimsy. Achieved through opinionated defaults, comprehensive tooling, and clear structure.
    *   **Rhythm:** The flow and pacing of the interaction. A smooth, predictable, and satisfying progression from one step to the next. Achieved through clear CLI prompts, immediate feedback, and logical documentation flow.
    *   **Intentional Friction:** Deliberately introduced challenges or pauses that serve a pedagogical or quality-assurance purpose. This isn't arbitrary difficulty, but guided effort. Achieved through interactive prompts for critical decisions, validation errors with helpful messages, or explicit "pause and reflect" sections in documentation.
*   **Why it Matters:**
    *   **Enhanced Engagement:** Makes the development process more enjoyable and less frustrating.
    *   **Deeper Learning:** Intentional friction, when well-designed, forces users to engage with concepts more deeply.
    *   **Increased Adoption:** A delightful UX is a powerful differentiator and encourages continued use.
    *   **Reduced Errors:** Guiding users through critical steps with intentional friction can prevent common mistakes.
*   **Implementation Principles:**
    *   **Interactive CLIs:** Use `inquirer.js` or similar for engaging prompts.
    *   **Emoji & Color:** Judicious use in CLI output for warmth and clarity.
    *   **Clear Progress Indicators:** Show progress during long operations (e.g., `npm install`).
    *   **Actionable Error Messages:** Turn errors into learning opportunities.
    *   **"What's Next" Sections:** Guide the user smoothly to the next logical step.

### 7. README-Driven Development (RDD)

*   **Concept:** Treating the `README.md` as the primary interface and documentation for a project, especially for templates. It's not just an afterthought; it's the first thing a user sees and interacts with, guiding them through setup, usage, and contribution.
*   **Why it Matters:**
    *   **Immediate Onboarding:** Provides a single, accessible source for getting started quickly.
    *   **Living Documentation:** Encourages maintainers to keep documentation up-to-date as the `README` is central to the project's identity.
    *   **Mental Model Reinforcement:** A well-structured `README` can explicitly walk users through the core concepts of the template.
    *   **Reduces Support Burden:** Clear documentation answers common questions upfront.
*   **Implementation Principles:**
    *   **Quick Start First:** The very first section should be 2-3 commands to get running.
    *   **Progressive Structure:** Follow the progressive disclosure model: Quick Start -> Core Concepts -> Advanced Usage -> Contribution.
    *   **Code Blocks & Examples:** Show, don't just tell.
    *   **Visuals (Optional):** Screenshots or GIFs for complex UIs or workflows.
    *   **Links to Deeper Docs:** Point to comprehensive documentation for advanced topics.

---

## Complete Code Recipes

This section provides production-ready implementations of core techniques, designed to be directly applicable to the Constructs Network.

### Recipe 1: Minimum Viable Template for Under 5 Minutes ("Hello World" Construct)

**What it does and when to use it:**
This recipe creates the simplest possible construct, demonstrating the core `identity` and `workflow` concepts with immediate, observable feedback. It's designed for the `create-construct` CLI to generate a new project, ensuring a Time-to-First-Value (TTFV) of under 5 minutes. Use this as the default or "minimal" option for new construct authors.

**Complete Code:**

**File: `my-first-construct/src/main.ts`**
```typescript
// src/main.ts
// This is the main entry point for your Construct.
// It defines the core identity, skills, and workflow that your AI agent will use.

import { defineConstruct, ConstructDefinition, AgentContext } from '@constructs-network/core'; // Hypothetical core library

/**
 * Defines your Construct.
 *
 * @param {ConstructDefinition} config - The configuration object for your construct.
 *   It includes:
 *   - `id`: A unique identifier for your construct.
 *   - `name`: A human-readable name.
 *   - `description`: A brief explanation of what your construct does.
 *   - `version`: The current version of your construct.
 *   - `identity`: Defines the persona and core values of your AI agent.
 *   - `workflow`: Defines how your construct reacts to events or orchestrates tasks.
 *   - `skills`: An array of specific capabilities your AI agent can perform.
 */
export default defineConstruct({
  id: 'my-first-construct', // Unique ID for your construct (e.g., 'my-org/my-construct-name')
  name: 'Hello World Construct',
  description: 'A minimal construct to get you started with the Constructs Network.',
  version: '0.1.0', // Start with 0.1.0 for initial development

  // --- IDENTITY ---
  // This defines the persona and core values of your AI agent when this construct is active.
  // Think of it as the "soul" of your construct.
  identity: {
    persona: `You are a friendly and encouraging AI assistant.
              Your primary goal is to help new construct authors understand the platform.
              You are currently running the 'Hello World Construct'.`,
    // You can add more identity attributes here, such as:
    // tone: 'helpful and encouraging',
    // preferredTechnologies: ['TypeScript', 'Node.js'],
    // ethicalGuidelines: 'Always prioritize user learning and provide clear feedback.'
  },

  // --- WORKFLOW ---
  // This defines how your construct orchestrates tasks and reacts to events.
  // The 'onActivate' event is triggered when your construct is loaded into the AI agent.
  workflow: {
    /**
     * Called when the construct is activated in the AI agent.
     * This is a great place to perform initial setup or greet the user.
     * @param {AgentContext} context - The context object providing access to agent capabilities.
     */
    onActivate: async ({ agent }: AgentContext) => {
      // The agent.say() method allows your AI agent to send a message to the user.
      await agent.say("Hello, Construct Author! Your 'Hello World Construct' is now active.");
      await agent.say("Try editing `src/main.ts` to change my persona or add a skill!");
    },

    // You can define other workflow events here, such as:
    // onDeactivate: async ({ agent }) => { /* ... */ },
    // onMessage: async ({ agent, message }) => { /* ... */ },
    // onSkillCalled: async ({ agent, skillId, params }) => { /* ... */ },
  },

  // --- SKILLS ---
  // These are the specific capabilities your AI agent can perform.
  // Each skill is like a tool in its toolbox.
  // For a minimal construct, we start with no skills to keep it simple.
  //
  // TODO: Uncomment and add your first skill here!
  // skills: [
  //   {
  //     id: 'greet-user',
  //     name: 'Greet User',
  //     description: 'Greets the user by a specified name.',
  //     parameters: {
  //       type: 'object',
  //       properties: {
  //         name: { type: 'string', description: 'The name of the user to greet.' }
  //       },
  //       required: ['name']
  //     },
  //     execute: async ({ agent, params }) => {
  //       const name = params.name || 'there';
  //       await agent.say(`Hello, ${name}! It's great to have you here.`);
  //       return { success: true, message: `Greeted ${name}.` };
  //     }
  //   }
  // ]
});
```

**File: `my-first-construct/README.md`**
```markdown
# My First Construct: Hello World

A minimal "Hello World" construct for the Constructs Network. This template is designed to get you up and running in under 5 minutes, demonstrating the core concepts of `identity` and `workflow`.

## Quick Start (under 5 minutes!)

Follow these steps to activate your first construct and see it in action:

1.  **Navigate to your construct directory:**
    ```bash
    cd my-first-construct
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```
    *(This installs the necessary `@constructs-network/core` library and development tools.)*

3.  **Activate Your Construct:** This command registers your construct with your AI coding assistant.
    ```bash
    construct activate .
    ```
    *(The `.` tells the CLI to activate the construct in the current directory.)*

4.  **Experience the Magic!**
    Open your AI coding assistant (e.g., Claude Code, or your integrated environment). You should immediately see a message from your AI assistant:

    > "Hello, Construct Author! Your 'Hello World Construct' is now active."
    > "Try editing `src/main.ts` to change my persona or add a skill!"

    Congratulations! You've successfully activated your first construct.

## What's Next? (Progressive Disclosure)

Now that your construct is running, let's make it do something more interesting and learn about the core components:

1.  **Edit Your Identity:**
    *   Open `src/main.ts`.
    *   Locate the `identity` object.
    *   Change the `persona` description to something new and unique. For example, make it a "sarcastic AI assistant" or "an expert in ancient history."
    *   **Save the file.** The `construct activate .` command will automatically detect changes and reload your construct.
    *   Observe how your AI assistant's tone or self-description changes based on your new identity!

2.  **Add Your First Skill:**
    *   In `src/main.ts`, scroll down to the `skills` array.
    *   **Uncomment the example skill** (`greet-user`) provided in the `TODO` section.
    *   **Save the file.**
    *   Now, in your AI assistant, try calling the new skill. You might say something like:
        > "Hey AI, can you `greet-user` with the name 'Alice'?"
    *   Your AI assistant should respond with: "Hello, Alice! It's great to have you here."

3.  **Explore the Workflow:**
    *   The `workflow` section in `src/main.ts` defines how your construct reacts to events. The `onActivate` function is what sent the initial greeting.
    *   Consider adding an `onDeactivate` function to say goodbye when your construct is unloaded.

## Project Structure

```
my-first-construct/
├── src/
│   └── main.ts         # The core definition of your construct (identity, workflow, skills)
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── .eslintrc.js        # ESLint configuration for code quality
└── README.md           # This guide!
```

## Commands

*   `npm install`: Installs project dependencies.
*   `construct activate .`: Activates (or reloads) your construct in the AI agent.
*   `npm run lint`: Checks your code for style and potential errors.
*   `npm run build`: Compiles your TypeScript code to JavaScript.

## Learning More

*   **Constructs Network Documentation:** [https://docs.constructs.network](https://docs.constructs.network) (for in-depth guides on `identity`, `skills`, `workflow`, and advanced topics).
*   **TypeScript Handbook:** [https://www.typescriptlang.org/docs/handbook/](https://www.typescriptlang.org/docs/handbook/) (for learning TypeScript).
*   **ESLint Documentation:** [https://eslint.org/docs/latest/](https://eslint.org/docs/latest/) (for understanding linting rules).

---

**Common Pitfalls and How to Avoid Them:**

*   **Forgetting `npm install`:** The `construct activate` command might fail with module not found errors.
    *   **Avoidance:** Make `npm install` the very first, explicit step in the `Quick Start`. The `create-construct` CLI should ideally run `npm install` automatically after scaffolding.
*   **Incorrect `construct activate` path:** Users might run `construct activate` from the wrong directory.
    *   **Avoidance:** Explicitly state `cd my-first-construct` and `construct activate .` in the `README`. The CLI could also default to the newly created directory.
*   **No observable feedback:** If the `onActivate` message doesn't appear, the user might think it failed.
    *   **Avoidance:** Ensure `agent.say()` is used for immediate, clear feedback. The `create-construct` CLI should also print a success message and instructions on *where* to look for the output.
*   **Over-editing too soon:** New users might try to implement complex features before understanding the basics.
    *   **Avoidance:** Use progressive disclosure in the `README` and in-code comments. The initial template should be *so simple* that there's little to break.

### Recipe 2: Encoding Best Practices with Progressive Disclosure (Interactive CLI & In-Code Mentors)

**What it does and when to use it:**
This recipe demonstrates how to use an interactive CLI for initial scaffolding and how to embed "in-code mentors" (comments) to teach best practices and guide users towards advanced features progressively. Use this for the primary `create-construct` experience.

**Complete Code:**

**File: `create-construct-cli/index.js` (Conceptual CLI for `create-construct`)**
*(This is a conceptual representation of the CLI logic, not a full `inquirer.js` implementation, focusing on the flow.)*

```javascript
// create-construct-cli/index.js
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');
const chalk = require('chalk'); // For colorful terminal output

async function createConstruct() {
  console.log(chalk.blue.bold("\n✨ Welcome to the Constructs Network! Let's create your new construct. ✨\n"));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'constructName',
      message: 'What is the name of your construct? (e.g., "My Awesome Construct")',
      default: 'my-awesome-construct',
      validate: input => input.trim() !== '' || 'Construct name cannot be empty.'
    },
    {
      type: 'list',
      name: 'templateType',
      message: 'What kind of construct do you want to build?',
      choices: [
        { name: 'Minimal (Hello World, quick start)', value: 'minimal' },
        { name: 'Skill-focused (Template for a new AI skill)', value: 'skill-focused' },
        { name: 'Identity-focused (Template for a specific persona)', value: 'identity-focused' },
        { name: 'Workflow-focused (Template for a multi-step agent workflow)', value: 'workflow-focused' },
        { name: 'Full-stack (Includes UI, data storage, advanced features)', value: 'full-stack' }
      ],
      default: 'minimal'
    },
    {
      type: 'confirm',
      name: 'includeTypeScript',
      message: 'Do you want to include TypeScript for type safety?',
      default: true
    },
    {
      type: 'confirm',
      name: 'includeLinting',
      message: 'Do you want to include ESLint for code quality?',
      default: true
    },
    {
      type: 'confirm',
      name: 'includeZodValidation',
      message: 'Do you want to include Zod for robust skill parameter validation?',
      default: true,
      when: (answers) => answers.templateType !== 'minimal' // Only ask for non-minimal templates
    },
    {
      type: 'confirm',
      name: 'installDependencies',
      message: 'Install dependencies now? (Recommended)',
      default: true
    }
  ]);

  const constructSlug = answers.constructName.toLowerCase().replace(/\s+/g, '-');
  const projectPath = path.join(process.cwd(), constructSlug);

  console.log(chalk.cyan(`\n🚀 Creating your construct at: ${projectPath}`));

  // --- Scaffolding Logic ---
  // In a real scenario, this would copy template files based on answers.
  // For this example, we'll simulate copying the 'minimal' template and then enhancing it.
  const templateDir = path.join(__dirname, 'templates', answers.templateType); // e.g., 'templates/minimal'
  fs.copySync(templateDir, projectPath);

  // --- Post-Scaffolding Enhancements (based on user choices) ---
  let mainTsContent = fs.readFileSync(path.join(projectPath, 'src', 'main.ts'), 'utf8');
  let packageJsonContent = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));

  if (answers.includeTypeScript) {
    // Ensure tsconfig.json is present and configured
    fs.copySync(path.join(__dirname, 'config-templates', 'tsconfig.json'), path.join(projectPath, 'tsconfig.json'));
    packageJsonContent.devDependencies = {
      ...packageJsonContent.devDependencies,
      "typescript": "^5.x.x",
      "@types/node": "^20.x.x"
    };
    // Add build script
    packageJsonContent.scripts.build = "tsc";
  } else {
    // If no TS, convert main.ts to main.js and remove tsconfig
    const mainJsPath = path.join(projectPath, 'src', 'main.js');
    fs.renameSync(path.join(projectPath, 'src', 'main.ts'), mainJsPath);
    mainTsContent = mainTsContent.replace(/import type {.*?}/g, ''); // Remove type-only imports
    fs.writeFileSync(mainJsPath, mainTsContent);
    fs.removeSync(path.join(projectPath, 'tsconfig.json'));
  }

  if (answers.includeLinting) {
    fs.copySync(path.join(__dirname, 'config-templates', '.eslintrc.js'), path.join(projectPath, '.eslintrc.js'));
    packageJsonContent.devDependencies = {
      ...packageJsonContent.devDependencies,
      "eslint": "^8.x.x",
      "@typescript-eslint/eslint-plugin": "^6.x.x",
      "@typescript-eslint/parser": "^6.x.x"
    };
    packageJsonContent.scripts.lint = "eslint src/**/*.ts";
  }

  if (answers.includeZodValidation && answers.templateType !== 'minimal') {
    packageJsonContent.dependencies = {
      ...packageJsonContent.dependencies,
      "zod": "^3.x.x"
    };
    // Add Zod import and example usage to main.ts (or a skill file)
    mainTsContent = `import { z } from 'zod';\n${mainTsContent}`;
    // Example: Inject a skill with Zod validation if it's a skill-focused template
    if (answers.templateType === 'skill-focused') {
      mainTsContent = mainTsContent.replace(
        '// TODO: Add your first skill here!',
        `
  skills: [
    {
      id: 'validate-input',
      name: 'Validate Input Example',
      description: 'A skill demonstrating Zod validation for parameters.',
      parameters: z.object({
        message: z.string().min(5, 'Message must be at least 5 characters long.'),
        count: z.number().int().positive('Count must be a positive integer.').optional(),
      }).jsonSchema(), // Convert Zod schema to JSON Schema for Construct definition
      execute: async ({ agent, params }) => {
        await agent.say(\`Received message: "${params.message}" with count: ${params.count || 'N/A'}\`);
        return { success: true, message: 'Validation successful.' };
      }
    }
  ],
  // TODO: Add your first skill here!
        `
      );
    }
  }

  fs.writeFileSync(path.join(projectPath, 'src', answers.includeTypeScript ? 'main.ts' : 'main.js'), mainTsContent);
  fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify(packageJsonContent, null, 2));

  console.log(chalk.green(`\n✅ Construct '${answers.constructName}' created successfully!`));

  if (answers.installDependencies) {
    console.log(chalk.yellow('\n📦 Installing dependencies... This might take a moment.'));
    try {
      execSync('npm install', { cwd: projectPath, stdio: 'inherit' });
      console.log(chalk.green('✅ Dependencies installed.'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to install dependencies. Please run `npm install` manually.'));
    }
  }

  console.log(chalk.blue(`\n🚀 Next steps:`));
  console.log(chalk.blue(`   1. Navigate to your new construct: ${chalk.magenta(`cd ${constructSlug}`)}`));
  console.log(chalk.blue(`   2. Activate it: ${chalk.magenta('construct activate .')}`));
  console.log(chalk.blue(`   3. Check your AI assistant for a welcome message!`));
  console.log(chalk.blue(`\nHappy building, Construct Author! 🎉\n`));
}

createConstruct().catch(console.error);
```

**File: `my-awesome-construct/src/main.ts` (Enhanced with In-Code Mentors)**
*(This version assumes TypeScript, Linting, and Zod were chosen, and it's a 'skill-focused' template.)*

```typescript
// src/main.ts
// This is the main entry point for your Construct.
// It defines the core identity, skills, and workflow that your AI agent will use.

import { defineConstruct, ConstructDefinition, AgentContext, Skill } from '@constructs-network/core';
import { z } from 'zod'; // Zod is used for robust schema validation of skill parameters.

/**
 * Defines your Construct.
 *
 * @param {ConstructDefinition} config - The configuration object for your construct.
 *   It includes:
 *   - `id`: A unique identifier for your construct.
 *   - `name`: A human-readable name.
 *   - `description`: A brief explanation of what your construct does.
 *   - `version`: The current version of your construct.
 *   - `identity`: Defines the persona and core values of your AI agent.
 *   - `workflow`: Defines how your construct reacts to events or orchestrates tasks.
 *   - `skills`: An array of specific capabilities your AI agent can perform.
 */
export default defineConstruct({
  id: 'my-awesome-construct', // Unique ID (e.g., 'your-org/your-construct-name'). Use kebab-case.
  name: 'My Awesome Construct',
  description: 'A construct focused on demonstrating best practices for skill design.',
  version: '0.1.0', // Always keep your version up-to-date! Semantic Versioning (major.minor.patch) is recommended.

  // --- IDENTITY ---
  // This defines the persona and core values of your AI agent when this construct is active.
  // Think of it as the "soul" of your construct.
  // A well-defined identity helps the AI agent understand its role and respond appropriately.
  identity: {
    persona: `You are an expert AI assistant specializing in web development,
              with a focus on clean code, modern frameworks (React, Next.js),
              and robust API design. You are helpful, precise, and provide
              actionable advice.`,
    // Add more identity attributes here to refine the AI's behavior:
    tone: 'professional and encouraging',
    preferredFrameworks: ['React', 'Next.js', 'Vue'],
    expertiseAreas: ['Frontend Development', 'API Design', 'Cloud Deployment'],
    ethicalGuidelines: 'Always prioritize user privacy and provide secure, maintainable code solutions.'
  },

  // --- WORKFLOW ---
  // This defines how your construct orchestrates tasks and reacts to events.
  // Workflows are crucial for multi-step operations, event handling, and complex agent behaviors.
  workflow: {
    /**
     * `onActivate` is called when the construct is loaded into the AI agent.
     * Use this for initial setup, greetings, or registering global event listeners.
     * @param {AgentContext} context - Provides access to agent capabilities like `agent.say()`.
     */
    onActivate: async ({ agent }: AgentContext) => {
      await agent.say("My Awesome Construct is now active! I'm ready to help with web dev tasks.");
      await agent.say("Try calling the `validate-input` skill to see Zod validation in action.");
    },

    /**
     * `onDeactivate` is called when the construct is unloaded.
     * Use this for cleanup, saving state, or saying goodbye.
     * @param {AgentContext} context - The context object.
     */
    onDeactivate: async ({ agent }: AgentContext) => {
      await agent.say("My Awesome Construct is deactivating. Goodbye for now!");
    },

    // TODO: Consider adding `onMessage` to process user messages directly,
    // or `onSkillCalled` for custom logic when a skill is invoked.
    // onMessage: async ({ agent, message }) => {
    //   if (message.includes('hello')) {
    //     await agent.say('Hello there! How can I assist you today?');
    //   }
    // },
  },

  // --- SKILLS ---
  // These are the specific capabilities your AI agent can perform.
  // Each skill is a self-contained function with a clear purpose, inputs, and outputs.
  // Best practice: Define clear `parameters` using Zod for robust validation.
  skills: [
    {
      id: 'validate-input', // Unique ID for the skill. Use kebab-case.
      name: 'Validate Input Example',
      description: 'A skill demonstrating Zod validation for parameters. Useful for ensuring data quality.',
      // Define skill parameters using Zod for schema validation.
      // `.jsonSchema()` converts the Zod schema into a format compatible with the Constructs Network.
      parameters: z.object({
        message: z.string()
                   .min(5, 'Message must be at least 5 characters long.')
                   .max(100, 'Message cannot exceed 100 characters.'),
        count: z.number()
                .int('Count must be an integer.')
                .positive('Count must be a positive number.')
                .optional(), // 'optional()' makes the parameter not required.
        // Example of an enum:
        priority: z.enum(['low', 'medium', 'high']).default('medium'),
      }).jsonSchema(), // IMPORTANT: Convert Zod schema to JSON Schema!

      /**
       * The `execute` function contains the core logic of your skill.
       * @param {AgentContext} context - Provides access to agent capabilities.
       * @param {object} params - The validated parameters passed to the skill.
       * @returns {Promise<object>} - The result of the skill execution.
       */
      execute: async ({ agent, params }: AgentContext & { params: z.infer<typeof z.object> }) => {
        // Access validated parameters directly
        const { message, count, priority } = params;

        await agent.say(`Skill 'validate-input' executed.`);
        await agent.say(`  Message: "${message}"`);
        await agent.say(`  Count: ${count !== undefined ? count : 'N/A'}`);
        await agent.say(`  Priority: ${priority}`);

        // Return a structured result. This can be consumed by other skills or workflows.
        return {
          success: true,
          message: 'Input validated and processed.',
          processedData: { message, count, priority }
        };
      }
    },
    // TODO: Add more skills here!
    // Example: A skill to generate a React component.
    // {
    //   id: 'generate-react-component',
    //   name: 'Generate React Component',
    //   description: 'Generates a basic React functional component file.',
    //   parameters: z.object({
    //     componentName: z.string().min(1, 'Component name is required.'),
    //     props: z.array(z.string()).optional(),
    //     withStyles: z.boolean().default(false),
    //   }).jsonSchema(),
    //   execute: async ({ agent, params }) => {
    //     const { componentName, props, withStyles } = params;
    //     let componentCode = `import React from 'react';\n\n`;
    //     componentCode += `interface ${componentName}Props {\n`;
    //     props?.forEach(prop => {
    //       componentCode += `  ${prop}: any;\n`; // Simplified type for example
    //     });
    //     componentCode += `}\n\n`;
    //     componentCode += `const ${componentName}: React.FC<${componentName}Props> = ({ ${props?.join(', ') || ''} }) => {\n`;
    //     componentCode += `  return (\n`;
    //     componentCode += `    <div className="${componentName.toLowerCase()}">\n`;
    //     componentCode += `      <h1>Hello from ${componentName}!</h1>\n`;
    //     if (props && props.length > 0) {
    //       componentCode += `      <p>Props: ${props.map(p => `{${p}}`).join(', ')}</p>\n`;
    //     }
    //     componentCode += `    </div>\n`;
    //     componentCode += `  );\n`;
    //     componentCode += `};\n\n`;
    //     componentCode += `export default ${componentName};\n`;
    //
    //     // In a real scenario, you'd use agent.fs.writeFile() or similar
    //     await agent.say(\`Generated component code for ${componentName}:\n\` + '```typescript\\n' + componentCode + '\\n```');
    //     return { success: true, fileName: \`${componentName}.tsx\`, code: componentCode };
    //   }
    // }
  ],
});
```

**File: `my-awesome-construct/README.md` (Progressive Disclosure Structure)**

```markdown
# My Awesome Construct

This construct is designed as a best-in-class example for building robust, maintainable, and powerful AI agent expertise packages within the Constructs Network. It emphasizes clear `identity`, structured `workflow`, and well-defined `skills` with strong validation.

## Quick Start

If you used `create-construct` and chose to install dependencies, you're almost ready!

1.  **Navigate to your construct directory:**
    ```bash
    cd my-awesome-construct
    ```

2.  **Activate Your Construct:**
    ```bash
    construct activate .
    ```

3.  **Verify Activation:**
    Check your AI assistant for the message: "My Awesome Construct is now active! I'm ready to help with web dev tasks."

## Core Concepts & First Steps

This construct is built around three core concepts:

### 1. Identity: The AI's Persona

*   **What it is:** The `identity` object in `src/main.ts` defines the AI agent's persona, expertise, tone, and ethical guidelines. It shapes how the AI perceives itself and interacts with users.
*   **Why it matters:** A clear identity ensures consistent, predictable, and appropriate responses from your AI agent, making it feel more coherent and reliable.
*   **Your Turn:**
    *   Open `src/main.ts`.
    *   Find the `identity` object.
    *   Experiment with changing `persona`, `tone`, or adding `preferredTechnologies`.
    *   **Save the file** and run `construct activate .` to see the changes reflected in your AI assistant's behavior.

### 2. Skills: The AI's Capabilities

*   **What it is:** The `skills` array in `src/main.ts` defines specific, callable functions your AI agent can perform. Each skill is a tool in its toolbox.
*   **Why it matters:** Skills provide concrete actions the AI can take, moving beyond conversational responses to direct problem-solving.
*   **Your Turn (Using the `validate-input` skill):**
    *   This template includes a `validate-input` skill that demonstrates robust parameter validation using `Zod`.
    *   In your AI assistant, try:
        > "AI, use `validate-input` with message 'Hello World' and count 10."
        > "AI, use `validate-input` with message 'Too short' and count -5." (Observe the validation error!)
    *   **Add a New Skill:** Uncomment the `generate-react-component` skill example in `src/main.ts` (or create your own!). Define its `id`, `name`, `description`, `parameters` (using `z.object().jsonSchema()`), and `execute` logic.

### 3. Workflow: The AI's Orchestration

*   **What it is:** The `workflow` object in `src/main.ts` defines how your construct reacts to events (like activation, deactivation, or user messages) and orchestrates sequences of actions or skills.
*   **Why it matters:** Workflows allow your construct to be proactive, respond to external triggers, and chain multiple skills together to achieve complex goals.
*   **Your Turn:**
    *   Observe the `onActivate` and `onDeactivate` functions in `src/main.ts`.
    *   **Implement `onMessage`:** Uncomment the `onMessage` example in `src/main.ts` and customize its logic to respond to specific keywords in user messages.

## Advanced Topics & Best Practices

*   **Project Structure:**
    *   For larger constructs, consider breaking `skills` into individual files (e.g., `src/skills/generateComponent.ts`).
    *   Organize `identity` and `workflow` into dedicated modules if they become complex.
*   **Testing:**
    *   This template includes a basic setup for unit tests. See `tests/main.test.ts`.
    *   Learn how to write tests for your skills and workflow logic to ensure reliability.
*   **Contribution Guidelines:**
    *   If you plan to open-source your construct or collaborate, review `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`.
*   **CI/CD Integration:**
    *   Set up automated linting, testing, and deployment using GitHub Actions or similar tools.

## Project Structure

```
my-awesome-construct/
├── src/
│   ├── main.ts         # Core construct definition (identity, workflow, skills)
│   └── types/          # (Optional) Custom TypeScript types/interfaces
├── tests/
│   └── main.test.ts    # Example unit tests for your construct
├── .eslintrc.js        # ESLint configuration for code quality
├── tsconfig.json       # TypeScript configuration
├── package.json        # Project dependencies and scripts
├── README.md           # This comprehensive guide
├── CONTRIBUTING.md     # Guidelines for contributing to this construct
└── CODE_OF_CONDUCT.md  # Community code of conduct
```

## Commands

*   `npm install`: Installs project dependencies.
*   `construct activate .`: Activates (or reloads) your construct in the AI agent.
*   `npm run lint`: Checks your code for style and potential errors.
*   `npm run test`: Runs unit tests.
*   `npm run build`: Compiles your TypeScript code to JavaScript.

---

**Common Pitfalls and How to Avoid Them:**

*   **Ignoring `parameters` validation:** Not using Zod (or similar) for skill parameters leads to brittle skills that can crash with invalid input.
    *   **Avoidance:** Always define `parameters` using `z.object().jsonSchema()` and ensure all expected inputs are validated.
*   **Overly complex `main.ts`:** As constructs grow, `main.ts` can become a monolithic file.
    *   **Avoidance:** Use the suggested project structure for larger constructs: separate skills into `src/skills/` directory, and import them into `main.ts`.
*   **Unclear `identity`:** A vague persona leads to inconsistent AI behavior.
    *   **Avoidance:** Spend time crafting a detailed `persona` and other `identity` attributes. Think about the AI's role, tone, and expertise.
*   **Lack of testing:** Untested skills and workflows can introduce subtle bugs.
    *   **Avoidance:** Encourage writing unit tests for core skill logic and workflow paths. The template should include a basic test setup.

### Recipe 3: Opinionated Project Structure for Constructs

**What it does and when to use it:**
This recipe defines a standardized, opinionated project structure that directly maps to the Constructs Network's mental model (`identity`, `skills`, `workflow`). It's designed for medium to large constructs, promoting modularity, readability, and maintainability.

**When to use it:** For any construct beyond the "minimal" Hello World, especially those with multiple skills or complex workflows. This structure should be the default for "skill-focused," "identity-focused," "workflow-focused," and "full-stack" templates.

**Complete Code (Directory Structure & Key Files):**

```
my-advanced-construct/
├── src/
│   ├── index.ts                  # Main entry point, orchestrates identity, skills, workflow
│   ├── identity/                 # Defines the AI's persona and core attributes
│   │   └── index.ts              # Exports the core Identity object
│   │   └── types.ts              # Custom types for extended identity attributes
│   ├── skills/                   # Directory for individual skill definitions
│   │   ├── index.ts              # Exports all skills for easy import into `index.ts`
│   │   ├── generateComponent.ts  # Defines a specific skill (e.g., React component generation)
│   │   ├── fetchData.ts          # Another skill (e.g., fetching data from an API)
│   │   └── types.ts              # Common types for skill parameters/outputs
│   ├── workflow/                 # Defines event handlers and orchestration logic
│   │   ├── index.ts              # Exports workflow event handlers
│   │   ├── onActivate.ts         # Logic for construct activation
│   │   ├── onMessage.ts          # Logic for handling user messages
│   │   └── types.ts              # Custom types for workflow context/events
│   └── utils/                    # Utility functions shared across skills/workflow
│       └── codeFormatter.ts      # Example: A utility for formatting generated code
├── tests/
│   ├── identity.test.ts
│   ├── skills/
│   │   ├── generateComponent.test.ts
│   │   └── fetchData.test.ts
│   └── workflow/
│       └── onMessage.test.ts
├── config/                       # Configuration files (e.g., external API keys, environment variables)
│   └── default.json
│   └── production.json
├── .eslintrc.js                  # ESLint configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Project dependencies and scripts
├── README.md                     # Comprehensive documentation
├── CONTRIBUTING.md               # Contribution guidelines
├── CODE_OF_CONDUCT.md            # Community code of conduct
└── .env.example                  # Example environment variables
```

**Key File Implementations:**

**File: `my-advanced-construct/src/identity/index.ts`**
```typescript
// src/identity/index.ts
import { Identity } from '@constructs-network/core';
import { ExtendedIdentityAttributes } from './types'; // Import custom types

/**
 * Defines the core identity for this construct.
 * This object will be merged with the base AI agent identity.
 */
export const constructIdentity: Identity<ExtendedIdentityAttributes> = {
  persona: `You are a highly specialized AI architect, expert in designing scalable,
            secure, and performant cloud-native applications. You prioritize
            developer experience, cost-efficiency, and robust error handling.
            Your advice is always pragmatic and grounded in industry best practices.`,
  tone: 'authoritative and precise',
  preferredCloudProvider: 'AWS',
  preferredLanguages: ['TypeScript', 'Go', 'Python'],
  // Custom attributes defined in types.ts
  specialization: 'Cloud Architecture & DevOps',
  favoriteDesignPattern: 'Event-Driven Architecture',
};

// You might also export functions related to identity if needed, e.g.,
// export function getIdentitySummary(identity: Identity) { /* ... */ }
```

**File: `my-advanced-construct/src/identity/types.ts`**
```typescript
// src/identity/types.ts
// Define custom types for extended identity attributes
export interface ExtendedIdentityAttributes {
  specialization: string;
  favoriteDesignPattern: string;
  preferredCloudProvider: 'AWS' | 'Azure' | 'GCP' | 'On-Prem';
  preferredLanguages: string[];
}
```

**File: `my-advanced-construct/src/skills/generateComponent.ts`**
```typescript
// src/skills/generateComponent.ts
import { Skill, AgentContext } from '@constructs-network/core';
import { z } from 'zod';
import { formatCode } from '../utils/codeFormatter'; // Example utility import

// Define the schema for this skill's parameters
const generateComponentParamsSchema = z.object({
  componentName: z.string().min(1, 'Component name is required.').regex(/^[A-Z][a-zA-Z0-9]*$/, 'Component name must be PascalCase.'),
  type: z.enum(['react', 'vue', 'svelte']).default('react'),
  props: z.array(z.string()).optional(),
  withStyles: z.boolean().default(false),
  directory: z.string().optional().default('./src/components'),
});

type GenerateComponentParams = z.infer<typeof generateComponentParamsSchema>;

/**
 * Skill: Generate Component
 * Generates a basic component file (e.g., React, Vue) based on parameters.
 */
export const generateComponentSkill: Skill<GenerateComponentParams> = {
  id: 'generate-component',
  name: 'Generate Component',
  description: 'Generates a basic component file (React, Vue, or Svelte) with specified name and props.',
  parameters: generateComponentParamsSchema.jsonSchema(), // Convert Zod schema to JSON Schema

  execute: async ({ agent, params }: AgentContext & { params: GenerateComponentParams }) => {
    const { componentName, type, props, withStyles, directory } = params;

    let fileContent = '';
    let fileName = '';

    switch (type) {
      case 'react':
        fileName = `${componentName}.tsx`;
        fileContent = `import React from 'react';\n\n`;
        if (withStyles) fileContent += `import './${componentName}.css';\n\n`;
        fileContent += `interface ${componentName}Props {\n`;
        props?.forEach(prop => (fileContent += `  ${prop}: any; // TODO: Define proper type\n`));
        fileContent += `}\n\n`;
        fileContent += `const ${componentName}: React.FC<${componentName}Props> = ({ ${props?.join(', ') || ''} }) => {\n`;
        fileContent += `  return (\n`;
        fileContent += `    <div className="${componentName.toLowerCase()}">\n`;
        fileContent += `      <h1>${componentName} Component</h1>\n`;
        if (props && props.length > 0) {
          fileContent += `      <p>Props: ${props.map(p => `{${p}}`).join(', ')}</p>\n`;
        }
        fileContent += `    </div>\n`;
        fileContent += `  );\n`;
        fileContent += `};\n\n`;
        fileContent += `export default ${componentName};\n`;
        break;
      case 'vue':
        fileName = `${componentName}.vue`;
        fileContent = `<template>\n`;
        fileContent += `  <div class="${componentName.toLowerCase()}">\n`;
        fileContent += `    <h1>${componentName} Component</h1>\n`;
        if (props && props.length > 0) {
          fileContent += `    <p>Props: ${props.map(p => `{{ ${p} }}`).join(', ')}</p>\n`;
        }
        fileContent