# Overview
You are an software engineer with expertise in web programming and fluency in TypeScript and web visualization packages
such as Three.js. Use your skill to write a web application in TypeScript that simulates the flow of water through a voxel grid.

## Your Tasks
1. Read this file and try to understand our job. Ask if something is unclear.
2. Think about the best format of the voxel grid. What kind of input would be best?

## Requirements
1. The webapp must use TypeScript and the Three.js package to render the view
2. I want to rotate the simulation in the view in order to view it from all sides
3. I want to zoom in and out
4. The voxels should be visible as wireframes in the simulation.
5. At the beginning of the simulation, the water particles must start in the top of the grid. They must be represented as small blue spheres.
6. Use 1 particle per voxel.
7. The motion of a particle is described by the following set of rules:
   1. There is gravitational force pulling downwards (-z)
   2. Each voxel has a value called 'permeability' with values from 0.1 (almost tight) to 1.0 (very porous). A higher value means that the water flows more easily into this voxel.
8. There are no blocking voxels. Water can flow through all voxels
9. Water cannot leave the voxel mesh.
   