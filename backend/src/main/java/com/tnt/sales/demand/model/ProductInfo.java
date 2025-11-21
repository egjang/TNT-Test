package com.tnt.sales.demand.model;

public class ProductInfo {
    private String itemSubcategory;  // 제품 카테고리 (2차실란트, AL건봉 등)
    private String salesMgmtUnit;    // 공급사(TNT)
    private Double shareRate;        // 점유율
    private String supplier;         // 공급사
    private String subSupplier;      // 영업관리단위

    public String getItemSubcategory() { return itemSubcategory; }
    public void setItemSubcategory(String itemSubcategory) { this.itemSubcategory = itemSubcategory; }
    public String getSalesMgmtUnit() { return salesMgmtUnit; }
    public void setSalesMgmtUnit(String salesMgmtUnit) { this.salesMgmtUnit = salesMgmtUnit; }
    public Double getShareRate() { return shareRate; }
    public void setShareRate(Double shareRate) { this.shareRate = shareRate; }
    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }
    public String getSubSupplier() { return subSupplier; }
    public void setSubSupplier(String subSupplier) { this.subSupplier = subSupplier; }
}