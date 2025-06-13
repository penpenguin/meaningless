# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a realistic aquarium web application built with Three.js that creates an immersive, browser-based aquarium experience. The application features realistic water physics, fish behaviors using the Boids algorithm, and various visual effects.

## Common Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint

# Run TypeScript type checking
npm run typecheck
```

## High-Level Architecture

### Core Structure
The application follows a component-based architecture where each visual element is a self-contained class:

- **`src/main.ts`**: Entry point containing the `AquariumApp` class that orchestrates initialization and manages user preferences
- **`src/components/Scene.ts`**: Central orchestrator for the 3D scene, manages camera, renderer, and coordinates all visual components
- **`src/components/DetailedFish.ts`**: Fish simulation using instanced meshes with multiple variants (Tropical, Angelfish, Neon, Goldfish)
- **`src/components/Water.ts`**: Advanced water surface rendering with custom shaders
- **`src/utils/Boids.ts`**: Implementation of boids algorithm for realistic fish schooling behavior

### Shader System
The application uses custom GLSL shaders located in `src/shaders/`:
- Water shaders (`advancedWater.vert/frag`) implement Fresnel effects, caustics, reflections, and subsurface scattering
- Bubble shaders for particle effects
- All shaders are imported as strings via Vite's GLSL plugin

### Performance Considerations
- Desktop: Supports up to 100 fish
- Mobile: Automatically reduces to 50 or fewer fish
- Respects user's reduced motion preferences
- Uses instanced rendering for efficient fish rendering

## Technology Stack
- **Build Tool**: Vite
- **3D Graphics**: Three.js
- **Language**: TypeScript (strict mode enabled)
- **Styling**: TailwindCSS with DaisyUI
- **Animation**: Lottie for loading screen
- **Deployment**: GitHub Pages via GitHub Actions

## Important Notes
- The application targets 90+ Lighthouse score and 45+ FPS on mobile devices
- WCAG 2.3.3 compliant with motion toggle controls
- Uses physically-based rendering with ambient, directional, and point lighting
- Fish movement uses boids algorithm for alignment, cohesion, and separation behaviors

## Git Commit Format
Use the following format for commits: `fix: #{issue} message`
Use the git account configured in the environment as-is.