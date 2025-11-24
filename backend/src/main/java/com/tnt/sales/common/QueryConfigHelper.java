package com.tnt.sales.common;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * 데이터베이스 쿼리 설정 헬퍼
 * 170회 이상 중복되던 환경 설정 조회 로직을 통합
 *
 * 사용 예시:
 * <pre>
 * {@code
 * @Autowired
 * private QueryConfigHelper configHelper;
 *
 * public void someMethod() {
 *     InvoiceTableConfig config = configHelper.getInvoiceConfig();
 *     String sql = "SELECT * FROM " + config.getTableName() +
 *                  " WHERE " + configHelper.getDateExpression(config) + " = ?";
 * }
 * }
 * </pre>
 */
@Component
public class QueryConfigHelper {

    private final Environment env;

    @Autowired
    public QueryConfigHelper(Environment env) {
        this.env = env;
    }

    /**
     * Invoice 테이블 설정을 조회
     * @return Invoice 테이블 설정 객체
     */
    public InvoiceTableConfig getInvoiceConfig() {
        boolean dateIsText = Boolean.parseBoolean(
            env.getProperty("app.invoice.columns.invoice_date_is_text", "false")
        );
        String dateFormat = env.getProperty(
            "app.invoice.columns.invoice_date_format",
            "YYYY-MM-DD"
        );

        InvoiceTableConfig config = new InvoiceTableConfig();
        config.tableName = env.getProperty("app.invoice.table", "public.invoice");
        config.customerSeqColumn = env.getProperty("app.invoice.columns.customer_seq", "customer_seq");
        config.invoiceDateColumn = env.getProperty("app.invoice.columns.invoice_date", "invoice_date");
        config.curAmtColumn = env.getProperty("app.invoice.columns.cur_amt", "cur_amt");
        config.qtyColumn = env.getProperty("app.invoice.columns.qty", "qty");
        config.itemSeqColumn = env.getProperty("app.invoice.columns.item_seq", "item_seq");
        config.companyTypeColumn = env.getProperty("app.invoice.columns.company_type", "company_type");
        config.dateIsText = dateIsText;
        config.dateFormat = dateFormat;

        return config;
    }

    /**
     * Customer 테이블 설정을 조회
     * @return Customer 테이블 설정 객체
     */
    public CustomerTableConfig getCustomerConfig() {
        CustomerTableConfig config = new CustomerTableConfig();
        config.tableName = env.getProperty("app.customer.table", "public.customer");
        config.customerSeqColumn = env.getProperty("app.customer.columns.customer_seq", "customer_seq");
        config.customerIdColumn = env.getProperty("app.customer.columns.customer_id", "customer_id");
        config.customerNameColumn = env.getProperty("app.customer.columns.customer_name", "customer_name");
        config.assigneeIdColumn = env.getProperty("app.customer.columns.assignee_id", "assignee_id");
        config.companyTypeColumn = env.getProperty("app.customer.columns.company_type", "company_type");

        return config;
    }

    /**
     * 날짜 표현식을 생성 (텍스트 날짜를 Date로 변환하거나 그대로 사용)
     * @param config Invoice 테이블 설정
     * @return SQL 날짜 표현식
     */
    public String getDateExpression(InvoiceTableConfig config) {
        return getDateExpression(config, null);
    }

    /**
     * 날짜 표현식을 생성 (테이블 alias 지원)
     * @param config Invoice 테이블 설정
     * @param alias 테이블 별칭 (null이면 컬럼명만 사용)
     * @return SQL 날짜 표현식
     */
    public String getDateExpression(InvoiceTableConfig config, String alias) {
        String colDate = config.getInvoiceDateColumn();
        if (alias != null && !alias.isEmpty()) {
            colDate = alias + "." + colDate;
        }

        if (config.isDateIsText()) {
            return "to_date(" + colDate + ", '" + config.getDateFormat() + "')";
        } else {
            return colDate + "::date";
        }
    }

    /**
     * 현재 활성 프로파일 중 'nodb' 프로파일이 있는지 확인
     * @return nodb 프로파일 활성화 여부
     */
    public boolean isNoDbProfile() {
        String[] profiles = env.getActiveProfiles();
        for (String p : profiles) {
            if ("nodb".equalsIgnoreCase(p)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 특정 프로파일이 활성화되어 있는지 확인
     * @param profileName 확인할 프로파일 이름
     * @return 프로파일 활성화 여부
     */
    public boolean isProfileActive(String profileName) {
        String[] profiles = env.getActiveProfiles();
        for (String p : profiles) {
            if (profileName.equalsIgnoreCase(p)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Invoice 테이블 설정
     */
    public static class InvoiceTableConfig {
        private String tableName;
        private String customerSeqColumn;
        private String invoiceDateColumn;
        private String curAmtColumn;
        private String qtyColumn;
        private String itemSeqColumn;
        private String companyTypeColumn;
        private boolean dateIsText;
        private String dateFormat;

        public String getTableName() { return tableName; }
        public String getCustomerSeqColumn() { return customerSeqColumn; }
        public String getInvoiceDateColumn() { return invoiceDateColumn; }
        public String getCurAmtColumn() { return curAmtColumn; }
        public String getQtyColumn() { return qtyColumn; }
        public String getItemSeqColumn() { return itemSeqColumn; }
        public String getCompanyTypeColumn() { return companyTypeColumn; }
        public boolean isDateIsText() { return dateIsText; }
        public String getDateFormat() { return dateFormat; }
    }

    /**
     * Customer 테이블 설정
     */
    public static class CustomerTableConfig {
        private String tableName;
        private String customerSeqColumn;
        private String customerIdColumn;
        private String customerNameColumn;
        private String assigneeIdColumn;
        private String companyTypeColumn;

        public String getTableName() { return tableName; }
        public String getCustomerSeqColumn() { return customerSeqColumn; }
        public String getCustomerIdColumn() { return customerIdColumn; }
        public String getCustomerNameColumn() { return customerNameColumn; }
        public String getAssigneeIdColumn() { return assigneeIdColumn; }
        public String getCompanyTypeColumn() { return companyTypeColumn; }
    }
}
