# ORC Layout Student Prototype
[![Ask DeepWiki](https://devin.ai/assets/askdeepwiki.png)](https://deepwiki.com/p-cosseddu/Replication-Project-UIT)

A small web-based replication prototype inspired by the paper **"ORC Layout: Adaptive GUI Layout with OR-Constraints"**. This project demonstrates how a single layout specification can define multiple alternative arrangements, with the best option being selected at runtime based on the available space.

## Core Concept

The layout is defined with a single specification that includes multiple alternative branches (OR-choices). At runtime, the engine evaluates all possible combinations of these choices, computes penalties for any violated or less-desirable constraints, and renders the layout with the lowest total penalty score.

This prototype implements the following OR-choices:
- **Toolbar:** Can be arranged in a single row OR wrapped into two rows.
- **Sidebar:** Can be positioned to the right of the main content OR below it.
- **Controls:** The controls within the sidebar can be laid out horizontally OR vertically.

## How to Demo

Run the application and resize the browser window from wide to medium to narrow widths. You will observe the layout adapt automatically: the toolbar wraps, the sidebar moves below the content, and the control cards within the sidebar switch their orientation to best fit the available space.

The user interface also includes a theme toggle and a search field to demonstrate how the layout remains interactive and responsive.

## How It Works

The adaptive layout is achieved through a simple, penalty-based solver:

1.  **Layout Specification**: A single specification in `src/demo.ts` defines all UI widgets, their size limits (min, max, preferred), and global properties like padding and gaps.

2.  **OR-Choices**: The system defines a set of alternative layout strategies, such as `toolbar: ['row', 'twoRows']`.

3.  **Exhaustive Search**: The layout engine (`src/engine.ts`) generates every possible combination of the available OR-choices (e.g., `toolbar:row`, `sidebar:right`, `controls:horizontal`).

4.  **Penalty-Based Evaluation**: For each combination, the engine computes a layout and evaluates it against a set of constraints defined in `src/constraints.ts`.
    - **Hard Constraints**: Violations like a widget overflowing the container result in high penalties.
    - **Soft Constraints**: Deviations from preferred sizes, alignment, or responsive best-practices (e.g., using a single-row toolbar on a narrow screen) result in lower penalties. A negative penalty (reward) can be applied for desirable configurations.

5.  **Selection**: The engine selects the layout combination with the lowest total penalty score and instructs the renderer to display it. This process is re-run every time the window is resized.

## Getting Started

### Prerequisites

You need to have Node.js and npm installed on your machine.

### Installation and Running

1.  Clone the repository and navigate into the project directory.
2.  Install the required dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

### Building for Production

To create a production-ready build of the application:
```bash
npm run build
```

You can preview the production build locally with:
```bash
npm run preview
```

## Project Structure

-   `index.html` - The main HTML entry point for the application.
-   `src/main.ts` - Handles bootstrapping the application and listening for window resize events.
-   `src/model.ts` - Defines the data models for widgets, layouts, and constraints.
-   `src/constraints.ts` - Contains functions for checking basic constraints and calculating penalties.
-   `src/engine.ts` - The core layout solver that searches through OR-alternatives to find the optimal arrangement.
-   `src/renderer.ts` - The rendering layer that creates and updates the DOM based on the solved layout.
-   `src/demo.ts` - Defines the specific layout and widgets for this demonstration.
-   `src/styles.css` - Contains all the styling for the application and its components.