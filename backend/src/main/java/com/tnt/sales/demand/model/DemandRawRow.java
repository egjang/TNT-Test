package com.tnt.sales.demand.model;

public class DemandRawRow {
    private String salesOwner;   // 영업담당자
    private String customer;     // 거래처
    private String categoryMid;  // 중분류

    private String supplier1; private String mgmtUnit1; private Double share1;
    private String supplier2; private String mgmtUnit2; private Double share2;
    private String supplier3; private String mgmtUnit3; private Double share3;
    private String supplier4; private String mgmtUnit4; private Double share4;
    private String supplier5; private String mgmtUnit5; private Double share5;

    public String getSalesOwner() { return salesOwner; }
    public void setSalesOwner(String salesOwner) { this.salesOwner = salesOwner; }
    public String getCustomer() { return customer; }
    public void setCustomer(String customer) { this.customer = customer; }
    public String getCategoryMid() { return categoryMid; }
    public void setCategoryMid(String categoryMid) { this.categoryMid = categoryMid; }

    public String getSupplier1() { return supplier1; }
    public void setSupplier1(String supplier1) { this.supplier1 = supplier1; }
    public String getMgmtUnit1() { return mgmtUnit1; }
    public void setMgmtUnit1(String mgmtUnit1) { this.mgmtUnit1 = mgmtUnit1; }
    public Double getShare1() { return share1; }
    public void setShare1(Double share1) { this.share1 = share1; }

    public String getSupplier2() { return supplier2; }
    public void setSupplier2(String supplier2) { this.supplier2 = supplier2; }
    public String getMgmtUnit2() { return mgmtUnit2; }
    public void setMgmtUnit2(String mgmtUnit2) { this.mgmtUnit2 = mgmtUnit2; }
    public Double getShare2() { return share2; }
    public void setShare2(Double share2) { this.share2 = share2; }

    public String getSupplier3() { return supplier3; }
    public void setSupplier3(String supplier3) { this.supplier3 = supplier3; }
    public String getMgmtUnit3() { return mgmtUnit3; }
    public void setMgmtUnit3(String mgmtUnit3) { this.mgmtUnit3 = mgmtUnit3; }
    public Double getShare3() { return share3; }
    public void setShare3(Double share3) { this.share3 = share3; }

    public String getSupplier4() { return supplier4; }
    public void setSupplier4(String supplier4) { this.supplier4 = supplier4; }
    public String getMgmtUnit4() { return mgmtUnit4; }
    public void setMgmtUnit4(String mgmtUnit4) { this.mgmtUnit4 = mgmtUnit4; }
    public Double getShare4() { return share4; }
    public void setShare4(Double share4) { this.share4 = share4; }

    public String getSupplier5() { return supplier5; }
    public void setSupplier5(String supplier5) { this.supplier5 = supplier5; }
    public String getMgmtUnit5() { return mgmtUnit5; }
    public void setMgmtUnit5(String mgmtUnit5) { this.mgmtUnit5 = mgmtUnit5; }
    public Double getShare5() { return share5; }
    public void setShare5(Double share5) { this.share5 = share5; }
}

