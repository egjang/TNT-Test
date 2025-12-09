package com.tnt.sales;

import com.tnt.sales.config.FeatureFlags;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({ FeatureFlags.class })
public class TntSalesApplication {
    // Force restart
    public static void main(String[] args) {
        SpringApplication.run(TntSalesApplication.class, args);
    }
}
