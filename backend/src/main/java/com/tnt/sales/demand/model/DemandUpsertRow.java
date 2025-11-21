package com.tnt.sales.demand.model;

public class DemandUpsertRow {
    private String salesRepName;
    private String customerName;
    private String supplierName;
    private String itemSubcategory;
    private String salesMgmtUnit;
    private Double shareRate;
    private Integer priority; // 1~5 (원래 몇 번째 열이었는지)

    public String getSalesRepName() { return salesRepName; }
    public void setSalesRepName(String salesRepName) { this.salesRepName = salesRepName; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }
    public String getItemSubcategory() { return itemSubcategory; }
    public void setItemSubcategory(String itemSubcategory) { this.itemSubcategory = itemSubcategory; }
    public String getSalesMgmtUnit() { return salesMgmtUnit; }
    public void setSalesMgmtUnit(String salesMgmtUnit) { this.salesMgmtUnit = salesMgmtUnit; }
    public Double getShareRate() { return shareRate; }
    public void setShareRate(Double shareRate) { this.shareRate = shareRate; }
    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }
}
