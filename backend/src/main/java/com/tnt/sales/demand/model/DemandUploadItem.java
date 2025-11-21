
package com.tnt.sales.demand.model;

import java.util.ArrayList;
import java.util.List;

public class DemandUploadItem {
    private String salesRepName;        // 영업담당자
    private String customerName;        // 거래처
    private List<ProductInfo> products; // 제품 정보 리스트

    public DemandUploadItem() {
        this.products = new ArrayList<>();
    }

    public String getSalesRepName() { return salesRepName; }
    public void setSalesRepName(String salesRepName) { this.salesRepName = salesRepName; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public List<ProductInfo> getProducts() { return products; }
    public void setProducts(List<ProductInfo> products) { this.products = products; }

    public void addProduct(String itemSubcategory, String salesMgmtUnit, Double shareRate, String supplier, String subSupplier) {
        ProductInfo product = new ProductInfo();
        product.setItemSubcategory(itemSubcategory);
        product.setSalesMgmtUnit(salesMgmtUnit);
        product.setShareRate(shareRate);
        product.setSupplier(supplier);
        product.setSubSupplier(subSupplier);
        this.products.add(product);
    }
}

