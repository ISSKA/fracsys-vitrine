# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FracSYS Water Simulator — a web application that simulates water particle flow through a 3D voxel grid with variable permeability. This is a greenfield project; see `task.md` for the full requirements specification.

## Tech Stack

- **Language:** TypeScript
- **Rendering:** Three.js (3D voxel grid with wireframes, blue sphere particles)
- **Platform:** Browser-based web application

## Key Simulation Rules

- Voxel grid with permeability values (0.1–1.0) controlling flow resistance
- Gravity pulls particles in the -Z direction
- 1 particle per voxel, particles start at the top of the grid
- No blocking voxels — water flows through all, but cannot leave the mesh
- Voxels rendered as wireframes; water particles as small blue spheres

## Interaction Requirements

- Orbit controls: rotate the simulation to view from all sides
- Zoom in/out support
