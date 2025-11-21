package com.tnt.sales.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@Configuration
public class MultiDataSourceConfig {

    // Postgres
    @Value("${app.datasource.pg.url}")
    private String pgUrl;
    @Value("${app.datasource.pg.username}")
    private String pgUser;
    @Value("${app.datasource.pg.password}")
    private String pgPass;

    // MSSQL
    @Value("${app.datasource.mssql.url}")
    private String msUrl;
    @Value("${app.datasource.mssql.username}")
    private String msUser;
    @Value("${app.datasource.mssql.password}")
    private String msPass;

    @Bean(name = "pgDataSource")
    @Primary
    public DataSource pgDataSource() {
        return DataSourceBuilder.create()
                .driverClassName("org.postgresql.Driver")
                .url(pgUrl)
                .username(pgUser)
                .password(pgPass)
                .build();
    }

    @Bean(name = "pgJdbcTemplate")
    @Primary
    public JdbcTemplate pgJdbcTemplate(@org.springframework.beans.factory.annotation.Qualifier("pgDataSource") DataSource pgDataSource) {
        return new JdbcTemplate(pgDataSource);
    }

    @Bean(name = "mssqlDataSource")
    public DataSource mssqlDataSource() {
        // Add connection timeout parameters to URL if not already present
        String urlWithTimeout = msUrl;
        if (!msUrl.contains("loginTimeout=")) {
            urlWithTimeout = msUrl + (msUrl.contains("?") ? "&" : ";") + "loginTimeout=5";
        }
        if (!urlWithTimeout.contains("connectTimeout=")) {
            urlWithTimeout = urlWithTimeout + ";connectTimeout=5000";
        }

        return DataSourceBuilder.create()
                .driverClassName("com.microsoft.sqlserver.jdbc.SQLServerDriver")
                .url(urlWithTimeout)
                .username(msUser)
                .password(msPass)
                .build();
    }

    @Bean(name = "mssqlJdbcTemplate")
    public JdbcTemplate mssqlJdbcTemplate(@org.springframework.beans.factory.annotation.Qualifier("mssqlDataSource") DataSource mssqlDataSource) {
        return new JdbcTemplate(mssqlDataSource);
    }
}
