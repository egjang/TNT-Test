package com.tnt.sales.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "feature")
public class FeatureFlags {
    private Demand demand = new Demand();

    public Demand getDemand() { return demand; }
    public void setDemand(Demand demand) { this.demand = demand; }

    public static class Demand {
        private boolean enabled = true;
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
    }
}

