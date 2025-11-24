export const flags = {
  demandManagement: (import.meta.env.VITE_FEATURE_DEMAND_MANAGEMENT ?? 'true') === 'true',
  customerManagement: (import.meta.env.VITE_FEATURE_CUSTOMER_MANAGEMENT ?? 'true') === 'true',
  inventory: (import.meta.env.VITE_FEATURE_INVENTORY ?? 'true') === 'true',
}
