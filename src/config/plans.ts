export const PLAN_LIMITS = {
	trial: {
		max_branches: 3,
		max_students: 500,
		inventory_sales: true,
		combined_packages: true,
		advanced_analytics: false,
		api_access: false,
	},
	starter: {
		max_branches: 1,
		max_students: 200,
		inventory_sales: false,
		combined_packages: false,
		advanced_analytics: false,
		api_access: false,
	},
	growth: {
		max_branches: 3,
		max_students: 500,
		inventory_sales: true,
		combined_packages: true,
		advanced_analytics: false,
		api_access: false,
	},
	pro: {
		max_branches: null,
		max_students: 1200,
		inventory_sales: true,
		combined_packages: true,
		advanced_analytics: true,
		api_access: true,
	},
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;
export type FeatureKey = keyof (typeof PLAN_LIMITS)[PlanKey];
export type NumericLimitKey = "max_branches" | "max_students";
