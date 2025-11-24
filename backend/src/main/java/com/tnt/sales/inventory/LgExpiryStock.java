package com.tnt.sales.inventory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import org.hibernate.annotations.Immutable;

@Entity
@Table(name = "lg_expiry_stock")
@Immutable
public class LgExpiryStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "src_std_date")
    private String srcStdDate;

    @Column(name = "src_bizunit")
    private String srcBizunit;

    @Column(name = "item_name")
    private String itemName;

    @Column(name = "item_no")
    private String itemNo;

    private String spec;

    @Column(name = "item_seq")
    private Integer itemSeq;

    @Column(name = "unit_name")
    private String unitName;

    @Column(name = "exp_period")
    private String expPeriod;

    @Column(name = "remain_day")
    private Integer remainDay;

    @Column(name = "remain_rate")
    private BigDecimal remainRate;

    @Column(name = "exp_chk")
    private String expChk;

    @Column(name = "exp_date")
    private String expDate;

    @Column(name = "create_date")
    private String createDate;

    @Column(name = "in_date")
    private String inDate;

    @Column(name = "last_out_date")
    private String lastOutDate;

    @Column(name = "lot_no")
    private String lotNo;

    @Column(name = "wh_name")
    private String whName;

    @Column(name = "wh_seq")
    private Long whSeq;

    @Column(name = "stock_qty")
    private BigDecimal stockQty;

    @Column(name = "out_not_use_date")
    private Long outNotUseDate;

    @Column(name = "in_not_use_date")
    private Long inNotUseDate;

    @Column(name = "asset_seq")
    private Long assetSeq;

    @Column(name = "asset_name")
    private String assetName;

    @Column(name = "item_category_seq")
    private Long itemCategorySeq;

    @Column(name = "item_category")
    private String itemCategory;

    @Column(name = "item_subcategory_seq")
    private Long itemSubcategorySeq;

    @Column(name = "item_subcategory")
    private String itemSubcategory;

    @Column(name = "item_small_category_seq")
    private Long itemSmallCategorySeq;

    @Column(name = "item_small_category")
    private String itemSmallCategory;

    @Column(name = "loaded_at")
    private OffsetDateTime loadedAt;

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSrcStdDate() {
        return srcStdDate;
    }

    public void setSrcStdDate(String srcStdDate) {
        this.srcStdDate = srcStdDate;
    }

    public String getSrcBizunit() {
        return srcBizunit;
    }

    public void setSrcBizunit(String srcBizunit) {
        this.srcBizunit = srcBizunit;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getItemNo() {
        return itemNo;
    }

    public void setItemNo(String itemNo) {
        this.itemNo = itemNo;
    }

    public String getSpec() {
        return spec;
    }

    public void setSpec(String spec) {
        this.spec = spec;
    }

    public Integer getItemSeq() {
        return itemSeq;
    }

    public void setItemSeq(Integer itemSeq) {
        this.itemSeq = itemSeq;
    }

    public String getUnitName() {
        return unitName;
    }

    public void setUnitName(String unitName) {
        this.unitName = unitName;
    }

    public String getExpPeriod() {
        return expPeriod;
    }

    public void setExpPeriod(String expPeriod) {
        this.expPeriod = expPeriod;
    }

    public Integer getRemainDay() {
        return remainDay;
    }

    public void setRemainDay(Integer remainDay) {
        this.remainDay = remainDay;
    }

    public BigDecimal getRemainRate() {
        return remainRate;
    }

    public void setRemainRate(BigDecimal remainRate) {
        this.remainRate = remainRate;
    }

    public String getExpChk() {
        return expChk;
    }

    public void setExpChk(String expChk) {
        this.expChk = expChk;
    }

    public String getExpDate() {
        return expDate;
    }

    public void setExpDate(String expDate) {
        this.expDate = expDate;
    }

    public String getCreateDate() {
        return createDate;
    }

    public void setCreateDate(String createDate) {
        this.createDate = createDate;
    }

    public String getInDate() {
        return inDate;
    }

    public void setInDate(String inDate) {
        this.inDate = inDate;
    }

    public String getLastOutDate() {
        return lastOutDate;
    }

    public void setLastOutDate(String lastOutDate) {
        this.lastOutDate = lastOutDate;
    }

    public String getLotNo() {
        return lotNo;
    }

    public void setLotNo(String lotNo) {
        this.lotNo = lotNo;
    }

    public String getWhName() {
        return whName;
    }

    public void setWhName(String whName) {
        this.whName = whName;
    }

    public Long getWhSeq() {
        return whSeq;
    }

    public void setWhSeq(Long whSeq) {
        this.whSeq = whSeq;
    }

    public BigDecimal getStockQty() {
        return stockQty;
    }

    public void setStockQty(BigDecimal stockQty) {
        this.stockQty = stockQty;
    }

    public Long getOutNotUseDate() {
        return outNotUseDate;
    }

    public void setOutNotUseDate(Long outNotUseDate) {
        this.outNotUseDate = outNotUseDate;
    }

    public Long getInNotUseDate() {
        return inNotUseDate;
    }

    public void setInNotUseDate(Long inNotUseDate) {
        this.inNotUseDate = inNotUseDate;
    }

    public Long getAssetSeq() {
        return assetSeq;
    }

    public void setAssetSeq(Long assetSeq) {
        this.assetSeq = assetSeq;
    }

    public String getAssetName() {
        return assetName;
    }

    public void setAssetName(String assetName) {
        this.assetName = assetName;
    }

    public Long getItemCategorySeq() {
        return itemCategorySeq;
    }

    public void setItemCategorySeq(Long itemCategorySeq) {
        this.itemCategorySeq = itemCategorySeq;
    }

    public String getItemCategory() {
        return itemCategory;
    }

    public void setItemCategory(String itemCategory) {
        this.itemCategory = itemCategory;
    }

    public Long getItemSubcategorySeq() {
        return itemSubcategorySeq;
    }

    public void setItemSubcategorySeq(Long itemSubcategorySeq) {
        this.itemSubcategorySeq = itemSubcategorySeq;
    }

    public String getItemSubcategory() {
        return itemSubcategory;
    }

    public void setItemSubcategory(String itemSubcategory) {
        this.itemSubcategory = itemSubcategory;
    }

    public Long getItemSmallCategorySeq() {
        return itemSmallCategorySeq;
    }

    public void setItemSmallCategorySeq(Long itemSmallCategorySeq) {
        this.itemSmallCategorySeq = itemSmallCategorySeq;
    }

    public String getItemSmallCategory() {
        return itemSmallCategory;
    }

    public void setItemSmallCategory(String itemSmallCategory) {
        this.itemSmallCategory = itemSmallCategory;
    }

    public OffsetDateTime getLoadedAt() {
        return loadedAt;
    }

    public void setLoadedAt(OffsetDateTime loadedAt) {
        this.loadedAt = loadedAt;
    }
}
