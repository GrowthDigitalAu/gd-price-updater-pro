export function getVariantLimitForPlan(planName) {
    if (!planName) return { price: 30, compareAt: 30 };
    
    const lowerPlan = planName.toLowerCase();
    
    if (lowerPlan.includes('starter')) return { price: 300, compareAt: 300 };
    if (lowerPlan.includes('growth')) return { price: null, compareAt: null }; // unlimited
    
    return { price: 30, compareAt: 30 }; // free tier
}

export const SUBSCRIPTION_TIERS = {
    FREE: { 
        name: 'Free', 
        priceLimit: 30, 
        compareAtLimit: 30,
        description: '30 variant price updates & 30 compare-at price updates'
    },
    STARTER: { 
        name: 'Starter', 
        priceLimit: 300, 
        compareAtLimit: 300,
        description: '300 variant price updates & 300 compare-at price updates'
    },
    GROWTH: { 
        name: 'Growth', 
        priceLimit: null, 
        compareAtLimit: null,
        description: 'Unlimited price updates'
    }
};

