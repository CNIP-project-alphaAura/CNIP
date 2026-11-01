package com.elearning.nettrack.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * Intelligent DataSource Configuration:
 * Attempts MySQL 8.0 connection at localhost:3306.
 * If credentials are not yet configured or access is denied, gracefully falls back
 * to embedded H2 database (in MySQL mode) so the application NEVER crashes on startup.
 */
@Configuration
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Value("${spring.datasource.url:jdbc:mysql://localhost:3306/nettrack_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC}")
    private String mysqlUrl;

    @Value("${spring.datasource.username:root}")
    private String mysqlUser;

    @Value("${spring.datasource.password:root}")
    private String mysqlPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        // 1. Try MySQL Connection
        try {
            HikariConfig mysqlConfig = new HikariConfig();
            mysqlConfig.setJdbcUrl(mysqlUrl);
            mysqlConfig.setUsername(mysqlUser);
            mysqlConfig.setPassword(mysqlPassword);
            mysqlConfig.setDriverClassName("com.mysql.cj.jdbc.Driver");
            mysqlConfig.setConnectionTimeout(2500);
            mysqlConfig.setValidationTimeout(2000);
            mysqlConfig.setMaximumPoolSize(5);

            HikariDataSource ds = new HikariDataSource(mysqlConfig);
            try (Connection conn = ds.getConnection()) {
                log.info("===============================================================");
                log.info("  CONNECTED TO MYSQL DATABASE: nettrack_db on localhost:3306  ");
                log.info("===============================================================");
                return ds;
            } catch (Exception ex) {
                log.warn("MySQL authentication failed ({}). Switching to embedded MySQL mode...", ex.getMessage());
                try { ds.close(); } catch (Exception ignored) {}
            }
        } catch (Exception ex) {
            log.warn("Could not initialize MySQL DataSource: {}. Switching to embedded mode...", ex.getMessage());
        }

        // 2. Graceful Fallback: H2 Database in MySQL mode
        HikariConfig h2Config = new HikariConfig();
        h2Config.setJdbcUrl("jdbc:h2:mem:nettrack_db;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        h2Config.setUsername("sa");
        h2Config.setPassword("");
        h2Config.setDriverClassName("org.h2.Driver");
        h2Config.setMaximumPoolSize(5);

        log.info("===============================================================");
        log.info("  RUNNING ON EMBEDDED DATABASE (MySQL Dialect Mode)           ");
        log.info("  To connect local MySQL, set DB_PASSWORD in application.properties");
        log.info("===============================================================");
        return new HikariDataSource(h2Config);
    }
}

