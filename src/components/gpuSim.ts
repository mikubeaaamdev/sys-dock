export function getSimulatedGpuUsage(tick: number, gpuIndex: number = 0): number {
  // Use different phase for each GPU
  const base = gpuIndex === 0 ? 60 : 30;
  const amplitude = gpuIndex === 0 ? 40 : 20;
  const phase = gpuIndex === 0 ? tick / 8 : tick / 10 + 2;
  return Math.round(base + amplitude * Math.sin(phase));
}