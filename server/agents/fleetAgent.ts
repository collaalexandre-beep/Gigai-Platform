// Re-exporta toda a lógica do agente de frota de vehicle-wa.ts
// Mantém 100% da funcionalidade original intacta
export {
  handleVehicleWaFlow,
  isVehicleExitCommand,
  isVehicleReturnCommand,
  VEH_STEPS,
  VEH_STEP_LABELS,
} from "../vehicle-wa";
export type { VehicleWaParams } from "../vehicle-wa";
