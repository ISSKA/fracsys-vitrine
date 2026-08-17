import { ParticleState, VoxelCoord } from '../types';

let nextId = 0;

export function createParticle(position: VoxelCoord): ParticleState {
  return {
    id: nextId++,
    position: { ...position },
    settled: false,
    stationaryTicks: 0,
  };
}

export function resetParticleIds(): void {
  nextId = 0;
}
