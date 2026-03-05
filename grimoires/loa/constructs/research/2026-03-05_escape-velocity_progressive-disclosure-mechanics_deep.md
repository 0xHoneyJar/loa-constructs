# Progressive Disclosure Mechanics for Developer Tools — Deep Research

_Generated: 2026-03-05 | Model: gemini-2.5-flash + Google Search + Firecrawl | Config: escape-velocity_

This document captures the COMPLETE mental model that the top 0.1% of practitioners use for Progressive Disclosure Mechanics in Developer Tools, synthesizing findings into a comprehensive knowledge base for the Constructs Network.

## The Definitive Reference: Progressive Disclosure Mechanics for Developer Tools

### Context: The Constructs Network

The Constructs Network is a construct ecosystem for AI agent tooling, where 'constructs' are installable expertise packages (skills + identity + workflow) that transform how developers work with AI coding assistants like Claude Code. The network is reaching escape velocity: early adopters are experiencing transformative results (one user compared receiving a construct to 'All Might handing down One For All to Deku' — the power transfer moment from My Hero Academia).

The immediate challenge is threefold: (1) the construct template needs to be world-class for new construct authors, with progressive disclosure that teaches the mental model through building, (2) the existing Artisan construct (14 skills for design/taste/motion) needs its identity and workflow tied back together after evolution, and (3) we need to compose the right team to handle the influx of users who are coming from pain points (frontend struggles, wanting to build with constructs).

This document is designed to equip researchers and developers within the Constructs Network with the expert-level understanding and tools necessary to implement progressive disclosure effectively, ensuring that the power of constructs is revealed optimally, guiding users from novice to master.

---

### Expert Mental Models & Decision Frameworks

Top practitioners view progressive disclosure not merely as a UI pattern, but as a **strategic approach to managing cognitive load and accelerating expertise acquisition**. Their mental model is deeply rooted in understanding the user's journey from novice to expert, and designing systems that adapt to this evolution. They think of it as a **"complexity gradient"** (Dan Abramov) or a **"learning curve scaffold"** that is dynamically adjusted, always optimizing for **flow state** and **time-to-value**.

1.  **The "Complexity Gradient" & "Absorb the Complexity" (Dan Abramov, React):**
    *   **Mental Model:** The core idea is to "make the easy things easy and the hard things possible." This means the tool itself should absorb the vast majority of internal complexity, presenting a simplified surface area to the user for common tasks. Advanced features are intentionally hidden or deferred. This is a conscious decision to shift complexity from the user to the tool's maintainers.
    *   **Optimizes For:** User onboarding speed, reduced cognitive load for common tasks, long-term maintainability of the user experience.
    *   **Decision Framework:**
        *   **Prioritize UI/UX before API:** Start with the desired user experience and work backward to define the API/tooling. How should the user *feel*? What problems should they *not* have to think about?
        *   **Centralize Complexity:** The core team takes on the burden of integrating N+1 features seamlessly with N existing features, ensuring the abstraction remains stable and powerful for product developers.
        *   **Identify "Core" vs. "Advanced":** What is essential for the initial "aha!" moment? What can be deferred until the user explicitly needs it or demonstrates readiness?
        *   **Provide "Escape Hatches":** Acknowledge that no abstraction is perfect. Offer temporary, flexible ways for power users to "hack" around limitations, observe these hacks, and eventually provide idiomatic solutions. This prevents users from being stuck and informs future feature development.
    *   **Tradeoffs:**
        *   **Internal Complexity vs. External Simplicity:** Consciously choose to make the *tool's internals* more complex so the *user's interaction* is simpler.
        *   **Immediate Feature Availability vs. Cognitive Load:** Prioritize reducing cognitive load over immediately exposing every possible feature.
        *   **Opinionated Defaults vs. Full Customization:** Start with opinionated defaults (golden path) and progressively reveal customization options.

2.  **"Spatial Software" & Embodied Cognition (Maggie Appleton):**
    *   **Mental Model:** Humans understand spatial concepts intuitively. Programming, despite being text-based, often uses spatial metaphors (front-end, back-end, upload, download, deep merge). Top practitioners leverage this by externalizing and visualizing these mental models, making abstract concepts tangible.
    *   **Optimizes For:** Intuitive understanding, reduced mental mapping, improved debugging, and collaboration.
    *   **Decision Framework:**
        *   **Visualize the Invisible:** How can abstract concepts (like a dependency graph, data flow, state changes, AI agent thought processes) be made tangible and spatial?
        *   **Create "Programming Portals":** Instead of full-blown GUIs or pure CLIs, can we create scoped, visual "windows" into complex systems that allow limited, contextual text-based interaction? (e.g., a formula bar in a drawing app, Stately AI's state machine visualization, a construct's internal workflow visualization).
        *   **Use Strong Visual Metaphors:** Can we correlate syntax to shapes, or processes to relatable real-world actions (e.g., CSS as painting a house, a construct's skill as a specialized tool)?
    *   **Tradeoffs:**
        *   **Visual Clarity vs. Textual Density:** Balance the power of visual representation with the precision and composability of text.
        *   **Scoped Visuals vs. Global Overview:** Focus on visualizing specific, complex contexts rather than trying to visualize an entire codebase, which can become overwhelming.

3.  **"Builder-First" & "Aha! Moment" Acceleration (Twilio, Stripe):**
    *   **Mental Model:** The primary goal is to get the user to experience the core value proposition as quickly as possible, minimizing friction and time-to-first-success. Onboarding is not just about teaching, but about *enabling immediate creation*. This means providing a clear, low-friction path to a tangible outcome.
    *   **Optimizes For:** User activation, retention, perceived value, and viral growth.
    *   **Decision Framework:**
        *   **Identify the "First Message Activation" (Twilio):** What is the absolute minimum a user needs to do to achieve a meaningful outcome? Design the onboarding around this. For constructs, this might be "run your first AI-assisted task."
        *   **Provide "Virtual Sandboxes" (Twilio, Stripe):** Can users experiment and build without real-world consequences (e.g., credit card, compliance)? This reduces anxiety and encourages exploration.
        *   **Personalize the Journey:** Based on user roles, goals, or initial choices, dynamically adjust the content and sequence of disclosure.
        *   **Integrate Testing & Examples:** Provide runnable code samples and integrated testing environments (e.g., `stripe samples create`).
    *   **Tradeoffs:**
        *   **Speed-to-Value vs. Comprehensive Setup:** Prioritize getting started quickly, deferring more complex setup until later.
        *   **Guided Path vs. Free Exploration:** Start with a strong golden path, but ensure escape hatches for exploration.

4.  **"Eat Your Own Dog Food" & Composability (Charm CLI):**
    *   **Mental Model:** Build the tools you want others to use, using the same foundational libraries. This ensures authenticity, robustness, and a deep understanding of the user experience. Focus on composable, opinionated building blocks that can be combined to create more complex systems.
    *   **Optimizes For:** Tool quality, developer empathy, consistency across the ecosystem, and rapid iteration.
    *   **Decision Framework:**
        *   **Build Foundational Libraries First:** Create robust, single-purpose libraries (e.g., Bubble Tea for TUI, Lip Gloss for styling) that can be combined.
        *   **Prioritize UX in Core Libraries:** Ensure the underlying components are inherently "glamorous" and user-friendly.
        *   **Create Higher-Level Tools from Lower-Level Libraries:** Build standalone applications (like Gum, Mods) by composing the foundational libraries. This demonstrates best practices and ensures the libraries are production-ready.
    *   **Tradeoffs:**
        *   **Opinionated Design vs. Infinite Flexibility:** Charm libraries are opinionated about good TUI design, which might limit some niche customizations but ensures a high-quality baseline.
        *   **Go-centric vs. Language Agnostic:** While Go-centric, the principles of composability and UX translate across languages.

5.  **"Observability & Metrics-Driven Iteration" (Figma, JetBrains):**
    *   **Mental Model:** Progressive disclosure is not a one-time design; it's an ongoing process of refinement based on user behavior. You need to know *when* users are ready, *when* they are struggling, and *what* content is effective. This requires robust telemetry and a culture of continuous improvement.
    *   **Optimizes For:** User success, feature adoption, reduced support burden, and continuous improvement of the learning curve.
    *   **Decision Framework:**
        *   **Track Granular User States:** Define precise events and states that indicate readiness, confusion, or mastery (e.g., "user opened file type X," "user ran command Y," "user encountered error Z").
        *   **Implement Advanced Metrics:** Go beyond simple adoption counts to metrics like "Visual Coverage" (Figma) or "time to complete task," "error rate on specific feature," "time spent in help documentation" (JetBrains).
        *   **A/B Test Everything:** Continuously experiment with different disclosure triggers, content, and presentation.
        *   **Build Robust Logging & Analytics:** Understand how users interact with help content and identify areas for improvement.
    *   **Tradeoffs:**
        *   **Data Collection vs. Privacy/Overhead:** Balance the need for detailed user data with privacy concerns and performance impact.
        *   **Quantitative vs. Qualitative Insights:** Combine metrics with user interviews and feedback to understand the "why" behind the numbers.

**What they check FIRST when something goes wrong:**

1.  **User Context & Current State:** Is the user in the right environment? What task are they trying to accomplish? What prerequisites are missing? (e.g., `turbo.json` for task graph, `package.json` for dependencies, `RAILWAY_TOKEN` for auth, correct construct loaded).
2.  **Error Messages & Logs:** Are there explicit error messages? What do the logs (potentially at a higher verbosity level like `debug`) reveal? (e.g., Turborepo circular dependencies, Railway `attached mode` logs, construct execution traces).
3.  **Implicit Readiness Signals:** Has the user completed previous steps? Are they repeatedly performing a suboptimal action? Are they spending too much time on a specific task? (JetBrains, Roblox, AI agent struggling with a skill).
4.  **Configuration Files:** Is the `turbo.json` correct? Is the `.env` configured? Is the `config.toml` for the CLI correct? Is the construct's `manifest.json` or `workflow.yaml` properly defined? (Turborepo, Stripe).
5.  **Documentation & Help Flags:** Is the `--help` output clear for the specific command? Is the relevant documentation easily discoverable and *contextually linked*?

---

### Core Concepts & Complete Code Recipes

This section details the fundamental techniques for implementing progressive disclosure, complete with actionable explanations and production-ready code examples.

#### 1. State-Based Contextual Revelation

**Problem Solved:** Overwhelming users with all features at once; providing irrelevant information.
**Why it matters:** Reduces cognitive load, makes tools feel intelligent and responsive, and guides users through complex workflows by showing them only what's relevant to their current task or expertise level. For Constructs, this means revealing advanced skill parameters or workflow branching only when the user demonstrates readiness.

*   **Turborepo: Revealing the Task Graph (`--graph`, `dependsOn`, `--affected`)**
    *   **What it does and when to use it:** Turborepo manages monorepo builds and tasks. It defers the visualization of its complex internal dependency model until explicitly requested or contextually relevant.
        *   `dependsOn`: Used in `turbo.json` to define task relationships, implicitly building the graph. Essential for correct task execution order and caching.
        *   `--graph`: Visualizes the Task Graph (how tasks relate across packages) or Package Graph (monorepo structure). Use when debugging build issues, understanding execution flow, or optimizing cache.
        *   `--affected`: Progressively discloses execution to only the relevant parts of the monorepo based on changes. Use in CI/CD, large monorepos, or local development to speed up feedback loops.
    *   **Complete Code Recipe:**
        ```json
        // turbo.json - Example for a monorepo with 'app' and 'ui' packages
        {
          "$schema": "https://turbo.build/schema.json",
          "pipeline": {
            "build": {
              "dependsOn": ["^build"], // Run 'build' in direct dependencies first (e.g., 'ui' before 'app')
              "outputs": ["dist/**", ".next/**", "build/**"] // Cache these outputs
            },
            "test": {
              "dependsOn": ["build"], // Run 'build' in current package first
              "outputs": ["coverage/**"]
            },
            "lint": {
              "outputs": [] // Linting doesn't produce artifacts to cache
            },
            "dev": {
              "cache": false, // Don't cache dev server output
              "persistent": true // Keep dev server running
            }
          }
        }
        ```
        ```bash
        # To visualize the task graph for the 'build' task across the monorepo
        turbo run build --graph=build-graph.png

        # To visualize the package graph (structure of your monorepo)
        turbo run --graph=package-graph.png

        # To run 'build' only for packages affected by changes since the 'main' branch
        turbo run build --affected --base=main

        # To run 'test' only for affected packages
        turbo run test --affected
        ```
    *   **Common Pitfalls and How to Avoid Them:**
        *   **Not defining `outputs` in `turbo.json`:** Tasks will run every time, destroying cache hit rates. **Solution:** Explicitly define `outputs` for all tasks that produce artifacts.
        *   **Hashing too many files:** Including irrelevant files in `inputs` or `outputs` can lead to cache misses. **Solution:** Be precise with `inputs` and `outputs` glob patterns.
        *   **Circular dependencies:** Turborepo cannot resolve them, leading to hangs or infinite loops. **Solution:** Use `--graph` to visualize and identify cycles, then refactor your `dependsOn` or package structure.
        *   **Incorrect `^` usage in `dependsOn`:** `^` means "run in direct dependencies first," while omitting it means "run in the current package first." **Solution:** Understand the difference and apply correctly based on whether a task needs its dependencies built *before* itself (`^build`) or *itself* built before its own tests (`build`).

*   **Railway CLI: Deployment Modes & Target Selection**
    *   **What it does and when to use it:** Railway CLI adapts output verbosity and interaction based on context (interactive user vs. CI/CD) or explicit user choice. This progressively discloses the level of detail and control.
    *   **Complete Code Recipe:**
        ```bash
        # Default: Attached mode - streams all logs, useful for local debugging
        railway up

        # Detached mode: returns immediately, deploys in background. Use for quick uploads.
        railway up -d

        # CI mode: streams build logs, exits on build completion. Essential for automated pipelines.
        railway up --ci

        # JSON output: implies CI mode, useful for scripting and machine parsing.
        railway up --json

        # Explicitly target a service and environment in a multi-service project.
        # If not specified, CLI prompts user to choose if ambiguity exists.
        railway up --service my-api --environment staging

        # Deploy a specific branch
        railway up --branch feature/new-login
        ```
    *   **Common Pitfalls and How to Avoid Them:**
        *   **Forgetting `--ci` in CI pipelines:** Can cause pipelines to hang indefinitely waiting for interactive input or log streams. **Solution:** Always use `--ci` in automated environments.
        *   **Not specifying `--service` in multi-service projects:** Requires an interactive prompt, which fails in non-interactive environments. **Solution:** Explicitly use `--service` and `--environment` flags in scripts or CI.
        *   **Misinterpreting detached mode:** `railway up -d` doesn't mean the deployment is instant; it just means the CLI detaches. You still need to check the Railway dashboard for deployment status. **Solution:** Understand that detached mode is for convenience, not instant deployment.

*   **VS Code Walkthrough API: Activation Events**
    *   **What it does and when to use it:** Triggers tutorials or feature introductions based on specific user actions or workspace states. Use to onboard users to new extensions, introduce complex features, or guide through project setup.
    *   **Complete Code Recipe:**
        ```json
        // package.json for a VS Code extension
        {
          "name": "my-construct-extension",
          "displayName": "My Construct Extension",
          "description": "Integrates Constructs Network into VS Code",
          "version": "0.0.1",
          "engines": {
            "vscode": "^1.85.0"
          },
          "activationEvents": [
            "onCommand:myConstructExtension.startOnboarding",
            "onStartupFinished", // Trigger on first startup
            "onLanguage:typescript", // Trigger when a TS file is opened
            "workspaceContains:**/construct.json" // Trigger if a construct project is detected
          ],
          "main": "./out/extension.js",
          "contributes": {
            "commands": [
              {
                "command": "myConstructExtension.startOnboarding",
                "title": "Start Construct Onboarding"
              }
            ],
            "walkthroughs": [
              {
                "id": "myConstructExtension.onboarding",
                "title": "Welcome to Constructs Network!",
                "description": "Learn how to build and use AI constructs.",
                "steps": [
                  {
                    "id": "step1_install_cli",
                    "title": "Install the Construct CLI",
                    "description": "First, install the global Construct CLI. [Learn more](command:myConstructExtension.openDocs?%22cli-install%22)",
                    "completionEvents": ["onCommand:myConstructExtension.cliInstalled"] // Custom event
                  },
                  {
                    "id": "step2_create_construct",
                    "title": "Create Your First Construct",
                    "description": "Run `construct init` in your terminal to scaffold a new construct project. [Open Terminal](command:workbench.action.terminal.new)",
                    "completionEvents": ["workspaceContains:**/construct.json"] // Detect project file
                  },
                  {
                    "id": "step3_explore_manifest",
                    "title": "Explore the Construct Manifest",
                    "description": "Open `construct.json` to define your construct's identity and skills. [Open construct.json](command:vscode.open?%22construct.json%22)",
                    "completionEvents": ["onDidOpenTextDocument:**/construct.json"]
                  },
                  {
                    "id": "step4_run_skill",
                    "title": "Run Your First Skill",
                    "description": "Use the 'Construct: Run Skill' command to execute a skill from your new construct. [Run Skill](command:myConstructExtension.runSkill)",
                    "completionEvents": ["onCommand:myConstructExtension.skillExecuted"]
                  }
                ]
              }
            ]
          },
          "scripts": {
            "vscode:prepublish": "npm run compile",
            "compile": "tsc -p ./",
            "watch": "tsc -watch -p ./",
            "test": "node ./out/test/runTests.js"
          },
          "devDependencies": {
            "@types/vscode": "^1.85.0",
            "@types/node": "^18.18.11",
            "@typescript-eslint/eslint-plugin": "^6.11.0",
            "@typescript-eslint/parser": "^6.11.0",
            "eslint": "^8.54.0",
            "typescript": "^5.3.2",
            "@vscode/test-electron": "^2.3.6"
          }
        }
        ```
        ```typescript
        // src/extension.ts (simplified)
        import * as vscode from 'vscode';

        export function activate(context: vscode.ExtensionContext) {
            console.log('Congratulations, "my-construct-extension" is now active!');

            // Command to manually start the onboarding walkthrough
            let disposableOnboarding = vscode.commands.registerCommand('myConstructExtension.startOnboarding', () => {
                vscode.commands.executeCommand('workbench.action.openWalkthrough', 'myConstructExtension.onboarding');
            });
            context.subscriptions.push(disposableOnboarding);

            // Command to simulate CLI installation completion (for walkthrough step)
            let disposableCliInstalled = vscode.commands.registerCommand('myConstructExtension.cliInstalled', () => {
                vscode.window.showInformationMessage('Construct CLI detected!');
                // In a real scenario, you'd check for CLI presence here
            });
            context.subscriptions.push(disposableCliInstalled);

            // Command to open documentation (for walkthrough step)
            let disposableOpenDocs = vscode.commands.registerCommand('myConstructExtension.openDocs', (topic: string) => {
                const docUrl = `https://docs.constructs.network/${topic || ''}`;
                vscode.env.openExternal(vscode.Uri.parse(docUrl));
            });
            context.subscriptions.push(disposableOpenDocs);

            // Command to simulate skill execution (for walkthrough step)
            let disposableRunSkill = vscode.commands.registerCommand('myConstructExtension.runSkill', async () => {
                const skillName = await vscode.window.showInputBox({ prompt: 'Enter skill name to run' });
                if (skillName) {
                    vscode.window.showInformationMessage(`Running skill: ${skillName}`);
                    // Simulate skill execution logic here
                    vscode.commands.executeCommand('myConstructExtension.skillExecuted'); // Mark step complete
                }
            });
            context.subscriptions.push(disposableRunSkill);

            // Example: Trigger walkthrough on first startup if not completed
            const hasSeenOnboarding = context.globalState.get('myConstructExtension.hasSeenOnboarding', false);
            if (!hasSeenOnboarding) {
                vscode.commands.executeCommand('workbench.action.openWalkthrough', 'myConstructExtension.onboarding');
                context.globalState.update('myConstructExtension.hasSeenOnboarding', true);
            }
        }

        export function deactivate() {}
        ```
    *   **Common Pitfalls and How to Avoid Them:**
        *   **Over-triggering:** Annoying users with repeated walkthroughs. **Solution:** Use `globalState` to track completion and only show once, or provide a "Don't show again" option.
        *   **Not providing clear completion events:** Walkthrough steps don't progress automatically. **Solution:** Carefully define `completionEvents` using built-in events (`onCommand`, `onDidOpenTextDocument`) or custom commands that your extension triggers.
        *   **Lack of context:** Presenting a walkthrough when the user is busy or not in the right mindset. **Solution:** Use `activationEvents` like `onStartupFinished` or `workspaceContains` to trigger when relevant, or allow manual initiation via a command palette entry.

*   **Roblox Contextual Tutorials: `ContextActionService`, Positional/Event Triggers**
    *   **What it does and when to use it:** Triggers in-game tutorials based on player actions, location, or game state. Ideal for teaching game mechanics, but the principles apply to developer tools for teaching specific features when a user interacts with a relevant UI element or code context.
    *   **Complete Code Recipe:**
        ```lua
        -- Server Script: TutorialService (simplified)
        -- This service would manage tutorial states (completed/in-progress) for players.
        local TutorialService = {}
        local Players = game:GetService("Players")
        local ReplicatedStorage = game:GetService("ReplicatedStorage")

        local tutorialStates = {} -- Stores player tutorial completion status

        -- RemoteEvent to trigger client-side tutorial UI
        local ShowTutorialEvent = Instance.new("RemoteEvent")
        ShowTutorialEvent.Name = "ShowTutorial"
        ShowTutorialEvent.Parent = ReplicatedStorage

        function TutorialService:HasCompletedTutorial(player, tutorialId)
            if not tutorialStates[player.UserId] then
                tutorialStates[player.UserId] = {}
            end
            return tutorialStates[player.UserId][tutorialId] == true
        end

        function TutorialService:ShowTutorial(player, tutorialId)
            if not self:HasCompletedTutorial(player, tutorialId) then
                print(player.Name .. " is being shown tutorial: " .. tutorialId)
                ShowTutorialEvent:FireClient(player, tutorialId)
                -- Optionally mark as in-progress or completed after showing
                -- For this example, we'll mark as completed immediately for simplicity
                if not tutorialStates[player.UserId] then
                    tutorialStates[player.UserId] = {}
                end
                tutorialStates[player.UserId][tutorialId] = true
            end
        end

        -- Example: Positional Trigger (Local Script in a Part named "TutorialTriggerZone")
        -- This script would be inside a Part in the workspace.
        -- When a player touches this part, a tutorial is shown.
        local triggerPart = script.Parent
        local tutorialId = "FirstWeaponTutorial"

        triggerPart.Touched:Connect(function(otherPart)
            local player = Players:GetPlayerFromCharacter(otherPart.Parent)
            if player then
                -- Call server to show tutorial (server-side check for completion)
                game:GetService("ReplicatedStorage").RemoteEvent_ShowTutorial:FireServer(player, tutorialId)
            end
        end)

        -- Example: Event-Driven Trigger (Server Script for a weapon pickup)
        -- This script would be inside a weapon model.
        local weapon = script.Parent -- Assume this is the weapon model
        local tutorialId = "NewWeaponMechanics"

        weapon.Equipped:Connect(function(humanoid)
            local player = Players:GetPlayerFromCharacter(humanoid.Parent)
            if player then
                game:GetService("ReplicatedStorage").RemoteEvent_ShowTutorial:FireServer(player, tutorialId)
            end
        end)

        -- Example: ContextActionService (Local Script for input-based triggers)
        -- This script would be in StarterPlayerScripts or a UI element.
        local ContextActionService = game:GetService("ContextActionService")
        local ReplicatedStorage = game:GetService("ReplicatedStorage")
        local Players = game:GetService("Players")

        local function handleAction(actionName, inputState, inputObject)
            if actionName == "UseSpecialAbility" and inputState == Enum.UserInputState.Begin then
                local player = Players.LocalPlayer
                if player then
                    ReplicatedStorage.RemoteEvent_ShowTutorial:FireServer(player, "SpecialAbilityTutorial")
                end
            end
            return Enum.ContextActionResult.Pass -- Allow other actions to process
        end

        ContextActionService:BindAction("UseSpecialAbility", handleAction, false, Enum.KeyCode.E)

        -- Client-side Local Script to display the tutorial UI (in StarterPlayerScripts)
        ReplicatedStorage.ShowTutorial.OnClientEvent:Connect(function(tutorialId)
            print("Client received tutorial request for: " .. tutorialId)
            -- Here, you would display a UI element (e.g., a modal, a tooltip)
            -- based on the tutorialId.
            local tutorialGui = Instance.new("ScreenGui")
            tutorialGui.Name = "TutorialOverlay"
            tutorialGui.Parent = Players.LocalPlayer.PlayerGui

            local textLabel = Instance.new("TextLabel")
            textLabel.Size = UDim2.new(0.5, 0, 0.2, 0)
            textLabel.Position = UDim2.new(0.25, 0, 0.4, 0)
            textLabel.BackgroundColor3 = Color3.fromRGB(50, 50, 50)
            textLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
            textLabel.TextScaled = true
            textLabel.TextWrap = true
            textLabel.TextXAlignment = Enum.TextXAlignment.Center
            textLabel.TextYAlignment = Enum.TextYAlignment.Center
            textLabel.Text = "Tutorial: " .. tutorialId .. "\n(Press X to close)"
            textLabel.Parent = tutorialGui

            local closeButton = Instance.new("TextButton")
            closeButton.Size = UDim2.new(0.1, 0, 0.05, 0)
            closeButton.Position = UDim2.new(0.45, 0, 0.6, 0)
            closeButton.Text = "X"
            closeButton.Parent = tutorialGui
            closeButton.MouseButton1Click:Connect(function()
                tutorialGui:Destroy()
            end)

            -- You'd have a more sophisticated UI system in a real game.
        end)
        ```
    *   **Common Pitfalls and How to Avoid Them:**
        *   **Overlapping trigger zones:** Multiple tutorials firing at once. **Solution:** Design trigger zones carefully, use debouncing, and prioritize tutorials.
        *   **Repetitive tutorials:** Annoying experienced users. **Solution:** Implement a robust `TutorialService` to track completion state for each player and tutorial, persisting this data.
        *   **Not tracking completion state:** Tutorials keep reappearing. **Solution:** Store completion status in a persistent data store (e.g., Roblox `DataStoreService`).
        *   **Blocking user interaction:** Tutorials that prevent users from doing anything else. **Solution:** Design non-modal or dismissible tutorials, or use `ContextActionService` to temporarily override input.

*   **JetBrains IDEs: Intention Actions (`Alt+Enter`), Smart Completion**
    *   **What it does and when to use it:** Context-aware suggestions and actions directly within the editor, implicitly guiding users to features. Use to introduce refactorings, code fixes, or new language features as the user types, keeping them in the "coding flow."
    *   **Complete Code Recipe (Conceptual, as this is IDE internal logic):**
        *   **Intention Actions:** When the IDE detects a potential improvement (e.g., a redundant cast, a possible refactoring, a missing import), a lightbulb icon appears. Pressing `Alt+Enter` reveals a menu of actions.
            *   **Example Scenario:** User types `const arr = [1, 2, 3]; for (let i = 0; i < arr.length; i++) { console.log(arr[i]); }`
            *   **IDE Logic (Simplified):**
                ```java
                // Pseudo-code for an IDE plugin
                class ForLoopIntentionProvider implements IntentionActionProvider {
                    boolean isAvailable(PsiElement element) {
                        // Check if 'element' is a C-style for loop
                        return element.isInstanceOf(CStyleForLoop.class);
                    }

                    List<IntentionAction> getActions(PsiElement element) {
                        if (isAvailable(element)) {
                            return List.of(
                                new ConvertToForEachAction(element),
                                new ConvertToMapAction(element)
                            );
                        }
                        return Collections.emptyList();
                    }
                }

                class ConvertToForEachAction implements IntentionAction {
                    void invoke(Project project, Editor editor, PsiElement element) {
                        // Transform the C-style for loop into a for-each loop
                        // e.g., `for (const item of arr) { console.log(item); }`
                    }
                    String getText() { return "Convert to for-of loop"; }
                    // ... other metadata
                }
                ```
        *   **Smart Completion (`Ctrl+Shift+Space`):** Analyzes the expected type and context to offer more relevant suggestions than basic code completion.
            *   **Example Scenario:** User types `const user: User = { name: "Alice", age: 30, `
            *   **IDE Logic (Simplified):**
                ```java
                // Pseudo-code for a completion provider
                class UserObjectCompletionProvider implements CompletionProvider {
                    List<CompletionItem> getSuggestions(PsiElement contextElement, ExpectedType expectedType) {
                        if (expectedType.isInstanceOf(User.class)) {
                            // Filter suggestions based on User interface properties
                            return List.of(
                                new CompletionItem("email", "string", "alice@example.com"),
                                new CompletionItem("isActive", "boolean", "true")
                            );
                        }
                        return Collections.emptyList();
                    }
                }
                ```
    *   **Common Pitfalls and How to Avoid Them:**
        *   **Overly aggressive suggestions:** Can be distracting or lead to "suggestion fatigue." **Solution:** Prioritize high-impact, low-risk suggestions. Allow users to configure suggestion frequency or disable certain types.
        *   **Suggestions that don't align with project conventions:** Can introduce inconsistent code. **Solution:** Integrate with project linters/formatters and allow configuration of intention actions based on project settings.
        *   **Performance overhead:** Complex analysis can slow down the editor. **Solution:** Optimize algorithms, run analysis asynchronously, and cache results.

#### 2. Progressive Flags & Incremental Configuration

**Problem Solved:** Overwhelming users with too many options upfront; forcing complex setup for simple tasks.
**Why it matters:** Allows users to start simple and gradually unlock complexity as their needs grow, fostering a sense of control and reducing initial friction. For Constructs, this means providing a simple `construct init` and then revealing advanced configuration options via flags or subcommands.

*   **Stripe CLI: Global Flags, `stripe samples create`, Sandboxes**
    *   **What it does and when to use it:** Provides minimal setup for quick wins, then offers flags for deeper configuration. Use `stripe samples create` for rapid prototyping and learning. Use global flags for specific overrides or advanced logging.
    *   **Complete Code Recipe:**
        ```bash
        # 1. Quick start with a sample:
        # This command guides you through setting up a runnable Stripe integration example.
        # It will prompt for integration type (e.g., Checkout, Elements), language, and configure .env files.
        stripe samples create checkout-single-subscription

        # 2. Global flags for authentication and project management:
        # Log in to your Stripe account. This stores credentials securely.
        stripe login

        # If you have multiple Stripe accounts or projects, use --project-name
        stripe login --project-name my-dev-project

        # Override the API key for a single command (useful for CI/CD or temporary testing)
        stripe listen --api-key sk_test_your_secret_key_here

        # 3. Advanced logging:
        # Tail logs from your Stripe account with increased verbosity for debugging webhooks.
        stripe logs tail --log-level debug

        # 4. Dev Containers for isolated, pre-configured environments:
        # .devcontainer/devcontainer.json (example for a Node.js project)
        # This allows developers to spin up a consistent environment with Stripe CLI pre-installed and configured.
        ```
        ```json
        // .devcontainer/devcontainer.json
        {
          "name": "Stripe Dev Environment (Node.js)",
          "image": "mcr.microsoft.com/devcontainers/javascript-node:18",
          "features": {
            "ghcr.io/devcontainers/features/docker-in-docker:2": {
              "version": "latest"
            }
          },
          "customizations": {
            "vscode": {
              "extensions": [
                "stripe.vscode-stripe",
                "dbaeumer.vscode-eslint",
                "esbenp.prettier-vscode"
              ]
            }
          },
          "postCreateCommand": "npm install && stripe login --project-name sandbox-project",
          "forwardPorts": [4242], // Default port for Stripe CLI webhook forwarding
          "portsAttributes": {
            "4242": {
              "label": "Stripe Webhook Listener",
              "onAutoForward": "notify"
            }
          },
          "remoteUser": "node"
        }
        ```
    *   **Common Pitfalls and How to Avoid Them:**
        *   **Hardcoding API keys in scripts:** Security risk. **Solution:** Use `--api-key` flag for specific commands or environment variables (`STRIPE_API_KEY`) for persistent configuration.
        *   **Not using `--project-name` for multiple Stripe accounts:** Leads to confusion or overwriting credentials. **Solution:** Always use `--project-name` to manage distinct configurations.
        *   **Ignoring webhook forwarding:** Essential for local development with Stripe. **Solution:** Remember `stripe listen` or configure your dev container to forward the correct port.

*   **Twilio CLI: Profile Management, Output Formatting, Logging Levels**
    *   **What it does and when to use it:** Allows users to manage multiple contexts (accounts, regions) and refine output as needed. Use profiles for different Twilio projects/accounts. Use output formatting for scripting. Use logging levels for debugging.
    *   **Complete Code Recipe:**
        ```bash
        # 1. Initial guided setup:
        # This command will open a browser for authentication and save your credentials as the default profile.
        twilio login

        # 2. Create and manage multiple profiles:
        # Create a new profile for a different Twilio account or project.
        twilio profiles:create --account-sid ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx --auth-token your_auth_token --region us1 --set-active
        # Or interactively:
        twilio profiles:create

        # List available profiles
        twilio profiles:list

        # Switch between profiles
        twilio profiles:use my-dev-profile

        # 3. Output formatting for scripting:
        # List messages and output as JSON for easy parsing in scripts.
        twilio api:core:messages:list -o json

        # Select specific columns for cleaner, human-readable output.
        twilio api:core:messages:list --properties "sid,to,status,dateCreated"

        # Retrieve more than the default 50 records (e.g., 100 records).
        twilio api:core:messages:list --limit 100

        # 4. Logging levels for debugging:
        # Get detailed logs for troubleshooting API requests or CLI issues.
        twilio -l debug api:core:messages:list
        ```
    *   **Common Pitfalls and How to Avoid Them:**
        *   **Not using profiles for different environments:** Leads to manual `login` or API key management, increasing error surface. **Solution:** Create distinct profiles for dev, staging, prod, or different client accounts.
        *   **Not leveraging `--properties` for cleaner output in scripts:** Results in verbose JSON that's harder to parse. **Solution:** Use `--properties` to get only the data you need.
        *   **Forgetting `-l debug` when troubleshooting:** Missing crucial request/response details. **Solution:** Make it a habit to add `-l debug` when encountering unexpected behavior.

#### 3. Abstraction & Encapsulation (Hooks, Custom Hooks)

**Problem Solved:** Duplicated logic, large components, complex patterns (HOCs, Render Props).
**Why it matters:** Simplifies common tasks, allows developers to progressively encapsulate complexity into reusable units, making codebases easier to understand, maintain, and scale. For Constructs, this is analogous to defining reusable "skills" or "workflows" that abstract complex AI interactions.

*   **React Hooks (`useState`, `useEffect`, Custom Hooks)**
    *   **What it does and when to use it:** Provides simple, composable primitives that can be combined to abstract complex stateful logic. Use `useState` for simple state, `useEffect` for side effects, and custom hooks to encapsulate reusable logic across components.
    *   **Complete Code Recipe:**
        ```javascript
        // 1. Basic useState and useEffect
        import React, { useState, useEffect } from 'react';

        function Counter() {
          const [count, setCount] = useState(0); // Simple state for a number
          const [message, setMessage] = useState("Hello"); // Simple state for a string

          // useEffect for side effects (runs after render)
          useEffect(() => {
            // This effect runs on mount and when 'count' changes
            document.title = `Count: ${count}`;
            console.log(`Count changed to: ${count}`);

            // Cleanup function (runs before unmount or before re-running effect)
            return () => {
              console.log('Cleaning up effect for count:', count);
              document.title = 'React App'; // Reset title
            };
          }, [count]); // Dependency array: re-run effect only when 'count' changes

          // Another useEffect for a different dependency
          useEffect(() => {
            console.log(`Message changed to: ${message}`);
          }, [message]); // Re-run effect only when 'message' changes

          const increment = () => setCount(prevCount => prevCount + 1);
          const decrement = () => setCount(prevCount => prevCount - 1);
          const changeMessage = () => setMessage("World!");

          return (
            <div>
              <p>Count: {count}</p>
              <button onClick={increment}>Increment</button>
              <button onClick={decrement}>Decrement</button>
              <p>Message: {message}</p>
              <button onClick={changeMessage}>Change Message</button>
            </div>
          );
        }

        export default Counter;
        ```
        ```javascript
        // 2. Custom Hook for reusable logic
        import { useState, useEffect } from 'react';

        /**
         * Custom hook to track window width and height.
         * @returns {{width: number, height: number}} Current window dimensions.
         */
        function useWindowDimensions() {
          const [windowDimensions, setWindowDimensions] = useState({
            width: window.innerWidth,
            height: window.innerHeight,
          });

          useEffect(() => {
            const handleResize = () => {
              setWindowDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
              });
            };

            window.addEventListener('resize', handleResize);

            // Cleanup function to remove the event listener
            return () => window.removeEventListener('resize', handleResize);
          }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

          return windowDimensions;
        }

        // Component consuming the custom hook
        function ResponsiveInfo() {
          const { width, height } = useWindowDimensions(); // Use the custom hook

          return (
            <div>
              <h2>Window Dimensions</h2>
              <p>Width: {width}px</p>
              <p>Height: {height}px</p>
              {width < 768 ? <p>This is a small screen!</p> : <p>This is a large screen.</p>}
            </div>
          );
        }

        export default ResponsiveInfo;
        ```
    *   **Common Pitfalls and How to Avoid Them:**
        *   **Incorrect dependency arrays in `useEffect`:**
            *   **Empty array `[]` when dependencies exist:** Leads to stale closures (effect uses outdated values) or the effect not re-running when it should. **Solution:** Include all values from the component scope that the effect depends on in the dependency array.
            *   **Missing array (no second argument):** Effect runs after *every* render, causing performance issues or infinite loops. **Solution:** Always provide a dependency array.
            *   **Overly broad array:** Effect runs too often. **Solution:** Be precise; if a value doesn't change, it doesn't need to be in the array.
        *   **Over-engineering custom hooks for simple logic:** Can add unnecessary abstraction. **Solution:** Use custom hooks when logic is truly reusable, complex, or involves side effects that need cleanup.
        *   **Forgetting cleanup functions in `useEffect`:** Leads to memory leaks (e.g., event listeners not removed). **Solution:** Always return a cleanup function from `useEffect` if you subscribe to something or set up timers.

#### 4. Visual & Interactive CLI Frameworks (Ink, Charm)

**Problem Solved:** Monotonous, unengaging CLI experiences; difficulty building complex interactive flows in terminals.
**Why it matters:** Enhances user experience, makes CLIs more approachable and powerful, creates a "material feel" (warmth/weight/rhythm) even in text-based interfaces. For Constructs, this means building interactive configuration wizards or real-time feedback during AI agent execution.

*   **Ink CLI Framework (React for the Terminal)**
    *   **What it does and when to use it:** Brings modern UI development paradigms (React components, Flexbox) to the command line. Use for building rich, stateful, and interactive CLIs with familiar React patterns, improving user engagement.
    *   **Complete Code Recipe:**
        ```jsx
        // app.jsx - A simple interactive counter in the terminal
        import React, { useState, useEffect } from 'react';
        import { Text, Box, useInput, useApp } from 'ink';
        import Gradient from 'ink-gradient';
        import BigText from 'ink-big-text';

        function Counter() {
          const [count, setCount] = useState(0);
          const { exit } = useApp(); // Hook to exit the Ink app

          // Hook to handle keyboard input
          useInput((input, key) => {
            if (input === 'q' || key.escape) {
              exit(); // Exit app on 'q' or Escape
            }
            if (key.upArrow) {
              setCount(count + 1);
            }
            if (key.downArrow) {
              setCount(count - 1);
            }
          });

          // Simulate a loading state or async operation
          const [loading, setLoading] = useState(true);
          useEffect(() => {
            const timer = setTimeout(() => {
              setLoading(false);
            }, 2000); // Simulate 2-second loading
            return () => clearTimeout(timer);
          }, []);

          return (
            <Box flexDirection="column" padding={1} borderStyle="round" borderColor="cyan" width={40}>
              <Gradient name="rainbow">
                <BigText text="INK COUNTER" font="tiny"/>
              </Gradient>
              <Text>Press <Text color="yellow">↑</Text>/<Text color="yellow">↓</Text> to change count, <Text color="red">'q'</Text> to quit.</Text>
              <Box marginTop={1} borderStyle="single" borderColor="magenta" paddingX={1}>
                {loading ? (
                  <Text color="gray">Loading...</Text>
                ) : (
                  <Text color="green" bold>Current Count: {count}</Text>
                )}
              </Box>
              <Text color="blue" italic marginTop={1}>
                {count % 2 === 0 ? "Even number!" : "Odd number!"}
              </Text>
            </Box>
          );
        }

        export default Counter;
        ```
        ```javascript
        // index.js (entry point for the Ink app)
        import React from 'react';
        import { render } from 'ink';
        import App from './app.jsx';

        // Render the Ink component
        const { waitUntilExit } = render(<App />);

        // Wait for the app to exit (e.g., when `exit()` is called)
        waitUntilExit().then(() => {
          console.log('Ink app exited.');
          process.exit(0); // Ensure process exits cleanly
        });
        ```
        *   **To run this:**
            1.  `npm init -y`
            2.  `npm install react ink ink-gradient ink-big-text`
            3.  Save `app.jsx` and `index.js` in the same directory.
            4.  Run `node index.js`
    *   **Common Pitfalls and How to Avoid Them:**
        *   **Not wrapping text in `<Text>` components:** Ink expects all displayable text to be within `<Text>` components. **Solution:** Always wrap strings in `<Text>`.
        *   **Blocking the render loop with synchronous operations:** Ink is React-based, so long-running synchronous tasks will freeze the UI. **Solution:** Use `useEffect` for async operations and state updates to trigger re-renders.
        *   **Forgetting cleanup functions for `useEffect`:** Similar to React in the browser, event listeners or timers set up in `useEffect` need to be cleaned up. **Solution:** Return a cleanup function from `useEffect`.
        *   **Complex layout issues:** While Ink uses Flexbox, terminal rendering has limitations. **Solution:** Start with simpler layouts, use `Box` for structure, and test on different terminal sizes.

*   **Charm CLI Libraries (Go for Glamorous TUIs)**
    *   **What it does and when to use it:** A suite of composable Go libraries for building TUIs, based on The Elm Architecture (Model-View-Update). Use for building highly interactive, visually appealing, and robust TUIs in Go, improving user experience and engagement for CLI tools.
    *   **Complete Code Recipe:**
        ```go
        // main.go - A Bubble Tea interactive to-do list
        package main

        import (
            "fmt"
            "os"
            "strings"

            tea "github.com/charmbracelet/bubbletea"
            "github.com/charmbracelet/lipgloss"
        )

        // Model represents the state of our program
        type model struct {
            choices  []string           // items on the to-do list
            cursor   int                // which to-do list item our cursor is pointing at
            selected map[int]struct{} // which to-do list items are selected
            quitting bool               // flag to indicate if we are quitting
        }

        // Styles for our TUI
        var (
            appStyle = lipgloss.NewStyle().Padding(1, 2)
            helpStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("241"))
            cursorStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("205")) // Pink
            selectedStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("212")).Strikethrough(true) // Purple, strikethrough
            unselectedStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("252")) // Light gray
            titleStyle = lipgloss.NewStyle().
                        Background(lipgloss.Color("62")). // Green-ish
                        Foreground(lipgloss.Color("230")). // White
                        Padding(0, 1).
                        MarginBottom(1)
        )

        // initialModel returns an initialized model
        func initialModel() model {
            return model{
                choices:  []string{"Buy carrots", "Buy celery", "Buy kohlrabi", "Write a construct skill", "Refactor Artisan workflow"},
                selected: make(map[int]struct{}),
            }
        }

        // Init is called once when the program starts. It can return a command.
        func (m model) Init() tea.Cmd {
            return nil
        }

        // Update is called when messages are received. It updates the model and can return a command.
        func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
            switch msg := msg.(type) {
            case tea.KeyMsg:
                switch msg.String() {
                case "ctrl+c", "q":
                    m.quitting = true
                    return m, tea.Quit
                case "up", "k":
                    if m.cursor > 0 {
                        m.cursor--
                    }
                case "down", "j":
                    if m.cursor < len(m.choices)-1 {
                        m.cursor++
                    }
                case "enter", " ":
                    _, ok := m.selected[m.cursor]
                    if ok {
                        delete(m.selected, m.cursor)
                    } else {
                        m.selected[m.cursor] = struct{}{}
                    }
                }
            }
            return m, nil
        }

        // View renders the UI. It's called after every Update.
        func (m model) View() string {
            if m.quitting {
                return "See you next time!\n"
            }

            var b strings.Builder
            b.WriteString(titleStyle.Render("Constructs Shopping List") + "\n")
            b.WriteString("What should we buy at the market?\n\n")

            for i, choice := range m.choices {
                checked := " "
                if _, ok := m.selected[i]; ok {
                    checked = selectedStyle.Render("x")
                    choice = selectedStyle.Render(choice)
                } else {
                    choice = unselectedStyle.Render(choice)
                }

                if m.cursor == i {
                    b.WriteString(cursorStyle.Render(">") + " [" + checked + "] " + choice + "\n")
                } else {
                    b.WriteString("  [" + checked + "] " + choice + "\n")
                }
            }

            b.WriteString(helpStyle.Render("\nPress 'space' to select, 'q' to quit.\n"))
            return appStyle.Render(b.String())
        }

        func main() {
            p := tea.NewProgram(initialModel())
            if _, err := p.Run(); err != nil {
                fmt.Printf("Alas, there's been an error: %v\n", err)
                os.Exit(1)
            }
        }
        ```
        *   **To run this:**
            1.  `go mod init mytodolist`
            2.  `go get github.com/charmbracelet/bubbletea`
            3.  `go get github.com/charmbracelet/lipgloss`
            4.  Save `main.go`.
            5.  Run `go run main.go`
        *   **Gum (for glamorous shell scripts):**
            ```bash
        # Ask for user input
        NAME=$(gum input --placeholder "What's your name?" --prompt "Name: ")
        echo "Hello, $NAME!"

        # Confirm an action
        gum confirm "Are you sure you want to proceed?" && echo "Proceeding!" || echo "Cancelled."

        # Choose from a list of options
        FRUIT=$(gum choose "apple" "banana" "orange" --header "Pick a fruit:")
        echo "You picked: $FRUIT"

        # Spinners for long-running tasks
        gum spin --spinner dot --title "Compiling construct..." -- sleep 3 && echo "Construct compiled!"
        ```
    *   **Common Pitfalls and How to Avoid Them:**
        *   **Over-complicating the `model` in Bubble Tea:** Keep the model as simple as possible, representing only the necessary state. **Solution:** Break down complex UIs into smaller, composable Bubble Tea components.
        *   **Neglecting accessibility in TUI design:** Colors, contrast, and keyboard navigation are crucial. **Solution:** Use `lipgloss` for consistent styling, ensure sufficient contrast, and provide clear keyboard shortcuts.
        *   **Blocking the main goroutine:** Bubble Tea runs in its own event loop. Avoid long-running synchronous operations in `Update` or `View`. **Solution:** Use `tea.Cmd` for asynchronous operations and message passing to update the model.

#### 5. Design-to-Code Integration & Visual Affordances (Figma Dev Mode, Code Connect)

**Problem Solved:** Disconnect between design and development; manual, error-prone design handoff; inconsistent UI implementation.
**Why it matters:** Streamlines developer workflow, ensures design system adoption, reduces re-coding, and improves collaboration between designers and developers. For Constructs, this means visually linking construct definitions (identity, skills, workflows) to their underlying code implementations.

*   **Figma Dev Mode & Code Connect**
    *   **What it does and when to use it:** Surfacing actual design system code snippets directly within the design tool, linked to design properties. Use to provide developers with immediate, accurate code for design components, ensuring consistency and accelerating frontend development.
    *   **Complete Code Recipe (Conceptual, as it involves Figma plugin development and specific component libraries):**
        *   **Figma Dev Mode:** Built-in inspector-like feature in Figma. Developers select a component in Figma, and Dev Mode shows its properties, related code, and design system documentation.
        *   **Code Connect (Open Source, MIT License):** A tool that maps Figma components to actual code components.
            ```bash
            # 1. Install Code Connect CLI
            npm install -g @figma-plugins/code-connect-cli

            # 2. Initialize Code Connect in your project
            # This command will guide you through linking to a Figma file and setting up mappings.
            npx figma-connect init --url "https://www.figma.com/file/YOUR_FIGMA_FILE_ID/Your-Design-System"

            # 3. Create a Code Connect mapping file (e.g., `src/components/Button/Button.figma.tsx`)
            # This file defines how Figma component properties map to your React component's props.
            ```
            ```typescript
            // src/components/Button/Button.tsx (Your actual React component)
            import React from 'react';
            import { cva, type VariantProps } from 'class-variance-authority';

            const buttonVariants = cva(
              "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
              {
                variants: {
                  variant: {
                    default: "bg-primary text-primary-foreground hover:bg-primary/90",
                    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
                    ghost: "hover:bg-accent hover:text-accent-foreground",
                  },
                  size: {
                    default: "h-10 py-2 px-4",
                    sm: "h-9 px-3 rounded-md",
                    lg: "h-11 px-8 rounded-md",
                  },
                },
                defaultVariants: {
                  variant: "default",
                  size: "default",
                },
              }
            );

            export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
              asChild?: boolean;
            }

            const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
              ({ className, variant, size, asChild = false, ...props }, ref) => {
                const Comp = asChild ? 'span' : 'button';
                return (
                  <Comp
                    className={buttonVariants({ variant, size, className })}
                    ref={ref}
                    {...props}
                  />
                );
              }
            );
            Button.displayName = "Button";

            export { Button, buttonVariants };
            ```
            ```typescript
            // src/components/Button/Button.figma.tsx (Code Connect mapping file)
            import { FigmaConnect } from '@figma-plugins/code-connect';
            import { Button } from './Button'; // Import your actual React component

            export default FigmaConnect.component(Button, {
              // Map Figma component name to your code component
              figma: 'Button',
              props: {
                // Map Figma property 'Variant' to React prop 'variant'
                variant: {
                  type: 'string',
                  figmaProp: 'Variant',
                  values: {
                    default: 'Primary', // Figma value 'Primary' maps to code value 'default'
                    destructive: 'Destructive',
                    outline: 'Outline',
                    ghost: 'Ghost',
                  },
                },
                // Map Figma property 'Size' to React prop 'size'
                size: {
                  type: 'string',
                  figmaProp: 'Size',
                  values: {
                    default: 'Medium', // Figma value 'Medium' maps to code value 'default'
                    sm: 'Small',
                    lg: 'Large',
                  },
                },
                // Example: Map a boolean Figma property 'Disabled' to React prop 'disabled'
                disabled: {
                  type: 'boolean',
                  figmaProp: 'Disabled',
                },
                // Example: Map a slot for children
                children: {
                  type: 'slot',
                  figmaProp: 'Text', // Figma layer name for the button's text
                },
              },
            });
            ```
            ```bash
            # 4. Publish your Code Connect mappings to Figma
            npx figma-connect publish
            ```
    *   **Common Pitfalls and How to Avoid Them:**
        *   **Inconsistent naming between design and code:** Leads to mapping errors. **Solution:** Establish strict naming conventions for component properties in both design and code.
        *   **Outdated mappings:** Design changes, but code mappings aren't updated. **Solution:** Integrate Code Connect publishing into CI/CD, or set up automated checks for discrepancies.
        *   **Over-reliance on auto-generation:** Not all design properties map cleanly to code. **Solution:** Use auto-generation as a starting point, but manually refine mapping files for accuracy and maintainability.
        *   **Ignoring design tokens:** Hardcoding values instead of using design tokens. **Solution:** Ensure your design system uses tokens (colors, spacing, typography) and that these are accessible in code, reducing the need for direct value mapping.

#### 6. Intelligent Defaults & Auto-Configuration

**Problem Solved:** Forcing users to make too many decisions upfront; complex initial setup.
**Why it matters:** Reduces cognitive load, accelerates the "aha!" moment, and guides users towards best practices without explicit instruction. For Constructs, this means providing a `construct init` that sets up a runnable, opinionated template, progressively revealing customization options.

*   **`create-react-app` / Next.js `create-next-app`:**
    *   **What it does and when to use it:** Scaffolds a complete, runnable project with sensible defaults, hiding complex build configurations. Use for starting new projects quickly, especially for beginners or when rapid prototyping is needed.
    *   **Complete Code Recipe:**
        ```bash
        # Create a new React app with sensible defaults (no config needed initially)
        npx create-react-app my-frontend-app
        cd my-frontend-app
        npm start # Runs the app

        # Create a new Next.js app, often with interactive prompts for common choices
        npx create-next-app my-nextjs-app --typescript --eslint --tailwind --app --src-dir --import-alias "@/*"
        # This command interactively asks:
        # - Would you like to use TypeScript? (Yes)
        # - Would you like to use ESLint? (Yes)
        # - Would you like to use Tailwind CSS? (Yes)
        # - Would you like to use `src/` directory? (Yes)
        # - Would you like to use App Router? (Yes)
        # - Would you like to customize the default import alias? (Yes, @/*)
        cd my-nextjs-app
        npm run dev # Runs the app
        ```
    *   **Common Pitfalls and How to Avoid Them:**
        *   **"Ejecting" too early:** Users modify the hidden configuration, losing benefits of managed setup. **Solution:** Provide clear documentation on *when* to eject (or use alternatives like `craco` for CRA) and guide users to official customization paths.
        *   **Defaults don't fit niche use cases:** While good for 80%, they can be restrictive. **Solution:** Offer official "escape hatches" or configuration overrides (e.